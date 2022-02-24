import crypto from "crypto"

/**
 * Returns a cryptically secure random int
 */
export default function randomInt(max: number): number {
    try {
        return Math.floor(crypto.randomBytes(4).readUInt32LE() / Math.pow(2, 32) * max);
    }
    catch {
        return Math.floor(Math.random() * max);
    }
}