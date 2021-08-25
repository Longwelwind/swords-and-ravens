import randomInt from "./randomInt";

export default function popRandom<T>(array: T[]): T | null {
    if (array.length == 0) {
        return null;
    }
    return array.splice(randomInt(array.length), 1)[0];
}