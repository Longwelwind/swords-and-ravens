export default function popRandom<T>(array: T[]): T | null {
    if (array.length == 0) {
        return null;
    }
    return array.splice(Math.floor(Math.random()*array.length), 1)[0];
}