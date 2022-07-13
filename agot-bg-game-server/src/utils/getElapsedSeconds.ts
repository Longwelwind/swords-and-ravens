export default function getElapsedSeconds(since: Date): number {
    return getTimeDeltaInSeconds(new Date(), since);
}

export function getTimeDeltaInSeconds(minuend: Date, subtrahend: Date): number {
    return Math.floor((minuend.getTime() - subtrahend.getTime()) / 1000);
}