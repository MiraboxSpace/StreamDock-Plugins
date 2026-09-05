const k = 0.000273923889073752;
const p = 2.77801691046729;
const A = 71.2252947598792;
const B = -0.0545762819370812;
const C = 0.00347204937032372;
const EPS = 1e-9;
const MAX_OUTPUT_VOLUME = 199.526231496887;

export function transformForward(x: number): number {
    if (x <= EPS) return 0;
    if (x < 100) return k * Math.pow(x, p);
    if (Math.abs(x - 100) < EPS) return 100;
    if (x < 200) return A + B * x + C * x * x;
    return MAX_OUTPUT_VOLUME;
}

export function transformInverse(y: number): number {
    if (y <= EPS) return 0;
    if (y < k * Math.pow(100, p)) return Math.pow(y / k, 1 / p);
    if (Math.abs(y - 100) < EPS) return 100;
    if (y < MAX_OUTPUT_VOLUME) {
        const disc = B * B - 4 * C * (A - y);
        if (disc <= 0) return 100;
        const sqrtDisc = Math.sqrt(disc);
        const r1 = (-B + sqrtDisc) / (2 * C);
        const r2 = (-B - sqrtDisc) / (2 * C);
        return [r1, r2].find((item) => item > 100 && item < 200) ?? 100;
    }
    return 200;
}

export function adjustOutputVolume(value: number, offset = 5): number {
    const clampedValue = Math.min(Math.max(0, value), 200);
    return transformForward(transformInverse(clampedValue) + offset);
}
