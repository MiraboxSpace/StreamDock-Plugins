import streamDeck, { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { doNotDisturb } from "../windows/do-not-disturb";

// Indexes of "States" in manifest.json
const STATE_OFF = 0;
const STATE_ON = 1;

// How often to pick up changes made outside the deck (Notification Center, Settings app, etc.)
const POLL_INTERVAL_MS = 2_000;

@action({ UUID: "com.mcristoni.windows-shortcuts.dnd" })
export class DoNotDisturbAction extends SingletonAction {
	private lastKnownEnabled?: boolean;
	private pollTimer?: NodeJS.Timeout;
	private polling = false;

	override async onWillAppear(ev: WillAppearEvent): Promise<void> {
		this.startPolling();

		try {
			const enabled = await doNotDisturb.isEnabled();
			this.lastKnownEnabled = enabled;
			if (ev.action.isKey()) {
				await ev.action.setState(enabled ? STATE_ON : STATE_OFF);
			}
		} catch (error) {
			streamDeck.logger.error("Failed to read the Do Not Disturb state:", error);
		}
	}

	override async onKeyDown(ev: KeyDownEvent): Promise<void> {
		try {
			// The worker reads the real Windows state and flips it, so the key can never drift out of sync.
			const enabled = await doNotDisturb.toggle();
			await this.applyState(enabled);
		} catch (error) {
			streamDeck.logger.error("Failed to toggle Do Not Disturb:", error);
			await ev.action.showAlert();
		}
	}

	private startPolling(): void {
		this.pollTimer ??= setInterval(() => void this.poll(), POLL_INTERVAL_MS);
	}

	private async poll(): Promise<void> {
		if (this.actions.length === 0) {
			clearInterval(this.pollTimer);
			this.pollTimer = undefined;
			return;
		}

		if (this.polling) {
			return;
		}

		this.polling = true;
		try {
			const enabled = await doNotDisturb.isEnabled();
			if (enabled !== this.lastKnownEnabled) {
				await this.applyState(enabled);
			}
		} catch (error) {
			streamDeck.logger.warn("Failed to poll Do Not Disturb:", error);
		} finally {
			this.polling = false;
		}
	}

	/** Updates every visible instance of the action (multiple keys, pages or devices). */
	private async applyState(enabled: boolean): Promise<void> {
		this.lastKnownEnabled = enabled;
		const state = enabled ? STATE_ON : STATE_OFF;
		await Promise.all(this.actions.toArray().flatMap((a) => (a.isKey() ? [a.setState(state)] : [])));
	}
}
