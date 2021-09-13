// Source: https://stackoverflow.com/a/6274381

import shuffleInPlace from "./shuffleInPlace";

/**
 * Returns a copy of the new shuffled array
 * using the the Durstenfeld (optimized Fisher-Yates) shuffle
 * @param {Array} a items An array containing the items.
 */
export default function shuffle<T>(a: T[]): T[] {
    const result = [...a];
    return shuffleInPlace(result);
}