import BetterMap from "./BetterMap";

export default function groupBy<K, V>(entries: V[], mapToKey: (v: V) => K): BetterMap<K, V[]> {
    const map = new BetterMap<K, V[]>();

    entries.forEach(value => {
        const key = mapToKey(value);

        if (!map.has(key)) {
            map.set(key, []);
        }

        map.get(key).push(value);
    });

    return map;
}