// eslint-disable-next-line @typescript-eslint/ban-types
type PartialRecursive<T> = T extends object ? { [K in keyof T]?: PartialRecursive<T[K]> } : T;

export default PartialRecursive;
