export default interface Point {
    x: number;
    y: number;
}

export function distanceSquared(one: Point, two: Point): number {
    return Math.pow(one.x - two.x, 2) + Math.pow(one.y - two.y, 2);
}
