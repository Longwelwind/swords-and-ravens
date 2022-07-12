export default function getElapsedSeconds(since: Date): number {
    return Math.floor((new Date().getTime() - since.getTime()) / 1000);
}
