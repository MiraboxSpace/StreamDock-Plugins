import crypto from "crypto";
function getMd5(str) {
    const md5 = crypto.createHash("md5");
    return md5.update(str).digest("hex");
}
async function getImageBuffer(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        return Buffer.from(buffer);
    } catch (err) {
        return null;
    }
}
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal, // 关键：绑定 abort 信号
      });
      return response;
    } finally {
      clearTimeout(id); // 必须清除定时器，防止内存泄漏
    }
};
const k = 0.000273923889073752;
const p = 2.77801691046729;
const A = 71.2252947598792;
const B = -0.0545762819370812;
const C = 0.00347204937032372;
const EPS = 1e-9;
function transformForward(x) {
    if (x <= EPS) return 0;
    if (x < 100) return k * Math.pow(x, p);
    if (Math.abs(x - 100) < EPS) return 100;
    if (x < 200) return A + B * x + C * x * x;
    return 199.526231496887;
}
function transformInverse(y) {
    if (y <= EPS) return 0;
    if (y < k * Math.pow(100, p)) return Math.pow(y / k, 1 / p);
    if (Math.abs(y - 100) < EPS) return 100;
    if (y < 199.526231496887) {
        const disc = B * B - 4 * C * (A - y);
        if (disc <= 0) return 100; // fallback
        const sqrtDisc = Math.sqrt(disc);
        const r1 = (-B + sqrtDisc) / (2 * C);
        const r2 = (-B - sqrtDisc) / (2 * C);
        const valid = [r1, r2].find((r) => r > 100 && r < 200);
        if (valid) return valid;
        return 100;
    }
    return 200;
}
function adjustOutputVolume(value, offset = 5) {
    value = Math.min(Math.max(0, value), 200);
    value = Math.min(Math.max(0, value), 200);
    let displacedValue = transformInverse(value) + offset;
    return transformForward(displacedValue);
}

export { getMd5, getImageBuffer, adjustOutputVolume, transformInverse, transformForward, fetchWithTimeout };
