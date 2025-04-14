export function pullFirst<T>(arr: T[], item: T): T | null {
  const index = arr.indexOf(item);
  if (index > -1) {
    return arr.splice(index, 1)[0];
  }
  return null;
}

export function removeFirst<T>(
  arr: T[],
  predicte: (x: T) => boolean
): T | null {
  const index = arr.findIndex(predicte);
  if (index > -1) {
    return arr.splice(index, 1)[0];
  }
  return null;
}
