function escapeXml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
        if (char === "&") return "&amp;";
        if (char === "<") return "&lt;";
        if (char === ">") return "&gt;";
        if (char === '"') return "&quot;";
        return "&apos;";
    });
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function svgDataUrl(svg: string): string {
    return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

type KnobIcon = "volume" | "mic" | "user";

const ICON_OFFSET: Record<KnobIcon, { x: number; y: number }> = {
    volume: { x: 0, y: 0 },
    mic: { x: 12, y: 0 },
    user: { x: 0, y: 0 },
};

export interface KnobVolumeImageOptions {
    title: string;
    value: number;
    max?: number;
    icon?: KnobIcon;
    width?: number;
    height?: number;
}

function iconSvg(icon: KnobIcon): string {
    const offset = ICON_OFFSET[icon];
    let body: string;
    if (icon === "mic") {
        body = `
            <rect x="24" y="45" width="18" height="31" rx="9" fill="none"/>
            <path d="M17 60v3c0 8.8 7.2 16 16 16s16-7.2 16-16v-3"/>
            <path d="M33 79v13M24 92h18"/>
        `;
    } else if (icon === "user") {
        body = `
            <circle cx="28" cy="50" r="11" fill="none"/>
            <path d="M11 83c4.2-10 29.8-10 34 0"/>
            <path d="M48 61h9l12-10v38L57 79H48z" fill="white" stroke="none"/>
            <path d="M76 61c3.5 5 3.5 17 0 22"/>
        `;
    } else {
        body = `
            <path d="M17 58h13l18-15v46L30 74H17z" fill="white" stroke="none"/>
            <path d="M60 56c5 5 5 20 0 25M70 49c9 10 9 30 0 40"/>
        `;
    }
    return `<g transform="translate(${offset.x} ${offset.y})">${body}</g>`;
}

export function renderKnobVolumeImage(options: KnobVolumeImageOptions): string {
    const width = options.width ?? 176;
    const height = options.height ?? 112;
    const max = options.max ?? 200;
    const value = clamp(Math.round(options.value), 0, max);
    const ratio = max > 0 ? clamp(value / max, 0, 1) : 0;
    const barWidth = 84;
    const fillWidth = Math.round(barWidth * ratio);
    const title = escapeXml(options.title);
    const percent = escapeXml(`${value}%`);

    const svg = `<svg width="${width}" height="${height}" viewBox="0 0 176 112" fill="none" xmlns="http://www.w3.org/2000/svg">
<text x="12" y="25" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700">${title}</text>
<g stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
${iconSvg(options.icon ?? "volume")}
</g>
<text x="134" y="52" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700">${percent}</text>
<rect x="92" y="63" width="${barWidth}" height="9" rx="4.5" fill="#3b3f46"/>
<rect x="92" y="63" width="${fillWidth}" height="9" rx="4.5" fill="#ffffff"/>
<rect x="91.5" y="62.5" width="${barWidth + 1}" height="10" rx="5" stroke="#ffffff" stroke-opacity="0.24"/>
</svg>`;

    return svgDataUrl(svg);
}
