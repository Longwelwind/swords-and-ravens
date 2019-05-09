/**
 * Shuffles array in place. ES6 version
 * From https://stackoverflow.com/a/6274381
 * @param {Array} a items An array containing the items.
 */
export default function shuffle<E>(a: E[]): E[] {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }

    return a;
}
