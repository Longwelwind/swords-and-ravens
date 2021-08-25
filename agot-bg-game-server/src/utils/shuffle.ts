import randomInt from "./randomInt";
// Source: https://stackoverflow.com/a/6274381
/**
 * Shuffles array in place using the Durstenfeld (optimized Fisher-Yates) shuffle
 * @param {Array} a items An array containing the items.
 */
export default function shuffleInPlace<T>(a: T[]): T[] {
    for (let i = a.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        const temp = a[i];
        a[i] = a[j];
        a[j] = temp;
    }

    return a;
}

/**
 * Returns a copy of the new shuffled array
 * using the the Durstenfeld (optimized Fisher-Yates) shuffle
 * @param {Array} a items An array containing the items.
 */
export function shuffle<T>(a: T[]): T[] {
    const result = [...a];
    return shuffleInPlace(result);
}