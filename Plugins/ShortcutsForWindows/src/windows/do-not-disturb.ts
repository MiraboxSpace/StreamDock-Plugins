import streamDeck from "@elgato/streamdeck";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import workerScript from "./dnd-worker.ps1";

type Command = "get" | "on" | "off" | "toggle";

type PendingRequest = {
	resolve: (enabled: boolean) => void;
	reject: (error: Error) => void;
	timer: NodeJS.Timeout;
};

// The worker is bundled into plugin.js and passed to PowerShell directly, so the plugin never reads
// a script file at runtime (Marketplace DRM encrypts the installed plugin files).
const ENCODED_WORKER = Buffer.from(workerScript, "utf16le").toString("base64");

// The first request includes compiling the Add-Type interop, which can take a moment.
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Keeps a single long-lived PowerShell process that talks to Windows over COM.
 * Avoids paying for PowerShell startup (and interop compilation) on every command.
 * The worker answers in order, so a FIFO queue is enough to match responses to requests.
 */
class DoNotDisturbWorker {
	private child?: ChildProcessWithoutNullStreams;
	private pending: PendingRequest[] = [];

	isEnabled(): Promise<boolean> {
		return this.send("get");
	}

	setEnabled(enabled: boolean): Promise<boolean> {
		return this.send(enabled ? "on" : "off");
	}

	toggle(): Promise<boolean> {
		return this.send("toggle");
	}

	private send(command: Command): Promise<boolean> {
		const child = this.ensureProcess();

		return new Promise((resolve, reject) => {
			const timer = setTimeout(
				() => this.fail(child, new Error(`Timed out waiting for a response to "${command}"`)),
				REQUEST_TIMEOUT_MS
			);
			this.pending.push({ resolve, reject, timer });
			child.stdin.write(`${command}\n`);
		});
	}

	private ensureProcess(): ChildProcessWithoutNullStreams {
		if (this.child) {
			return this.child;
		}

		const child = spawn(
			"powershell.exe",
			["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", ENCODED_WORKER],
			{ windowsHide: true }
		);

		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");
		createInterface({ input: child.stdout }).on("line", (line) => this.onLine(line));
		child.stderr.on("data", (data: string) => streamDeck.logger.error(`[dnd-worker] ${data.trim()}`));
		child.stdin.on("error", (error) => this.fail(child, error));
		child.on("error", (error) => this.fail(child, error));
		child.on("exit", (code) => this.fail(child, new Error(`PowerShell worker exited (code ${code})`)));

		this.child = child;
		return child;
	}

	private onLine(line: string): void {
		const response = line.trim();
		if (response === "" || response === "ready") {
			return;
		}

		const request = this.pending.shift();
		if (!request) {
			return;
		}

		clearTimeout(request.timer);
		if (response === "on" || response === "off") {
			request.resolve(response === "on");
		} else {
			request.reject(new Error(response.replace(/^error:/, "")));
		}
	}

	/** Kills the process and rejects everything queued; the next command spawns a fresh worker. */
	private fail(child: ChildProcessWithoutNullStreams, error: Error): void {
		if (this.child !== child) {
			return;
		}

		this.child = undefined;
		child.kill();

		const pending = this.pending;
		this.pending = [];
		for (const request of pending) {
			clearTimeout(request.timer);
			request.reject(error);
		}
	}
}

export const doNotDisturb = new DoNotDisturbWorker();
