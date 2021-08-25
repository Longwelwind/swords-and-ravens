import crypto from "crypto"

/**
 * Returns a cryptically secure random int
 */
export default function randomInt(max: number): number {
    return Math.floor(crypto.randomBytes(4).readUInt32LE() / Math.pow(2, 32) * max);
}