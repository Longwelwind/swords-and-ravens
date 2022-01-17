/**
 * Javascript has a Map class to make a dictionnary, but it's not that good
 * and doesn't offer enough practical methods to use.
 * This class is a wrapper around the Map and provides convenient methods.
 */
import {observable} from "mobx";

export default class BetterMap<K, V> {
    @observable _map: Map<K, V>;

    constructor(entries: [K, V][] = []) {
        this._map = new Map(entries);
    }

    get keys(): K[] {
        return Array.from(this._map.keys());
    }

    get values(): V[] {
        return Array.from(this._map.values());
    }

    get entries(): [K, V][] {
        return Array.from(this._map.entries());
    }

    get size(): number {
        return this._map.size;
    }

    get(key: K): V {
        if (!this._map.has(key)) {
            throw new Error("Map doesn't have key \"" + key + "\"");
        }

        return this._map.get(key) as V;
    }

    tryGet<VP>(key: K, defaultValue: VP): V | VP {
        if (!this._map.has(key)) {
            return defaultValue;
        }

        return this._map.get(key) as V;
    }

    map<E>(p: (k: K, v: V) => E): E[] {
        return this.entries.map(([k, v]) => p(k, v));
    }

    mapOver<KP, VP>(mapKey: (k: K) => KP, mapValue: (v: V, k: K) => VP): [KP, VP][] {
        return this.entries.map(([key, value]) => ([mapKey(key), mapValue(value, key)]));
    }

    forEach(f: (v: V, k: K, map: Map<K, V>) => void): void {
        this._map.forEach(f);
    }

    set(key: K, value: V): void {
        this._map.set(key, value);
    }

    setRange(items: [K, V][]): void {
        items.forEach(([key, value]) => {
            this.set(key, value);
        });
    }

    replace(key: K, value: V): void {
        if (!this._map.has(key)) {
            throw new Error("Map doesn't have key \"" + key + "\"");
        }

        this._map.set(key, value);
    }

    delete(key: K): void {
        if (!this._map.has(key)) {
            throw new Error("Map doesn't have key \"" + key + "\"");
        }

        this._map.delete(key);
    }

    has(key: K): boolean {
        return this._map.has(key);
    }

    clear(): void {
        this._map.clear();
    }
}
