export default class LocalStorageService {
    static setWithExpiry<T>(key: string, value: T, secondsUntilExpires: number): void {
        const expiresAt = new Date().getTime() + secondsUntilExpires * 1000;
        // `item` is an object which contains the original value
	    // as well as the time when it's supposed to expire
        const item = {
            value: value,
            expiresAt: expiresAt
        };
        localStorage.setItem(key, JSON.stringify(item));
    }

    static getWithExpiry<T>(key: string): T | null {
        const itemStr = localStorage.getItem(key);
        // if the item doesn't exist, return null
        if (!itemStr) {
            return null;
        }
        const item = JSON.parse(itemStr);
        const now = new Date();
        // compare the expiry time of the item with the current time
        if (now.getTime() > item.expiresAt) {
            // If the item is expired, delete the item from storage
            // and return null
            localStorage.removeItem(key);
            return null;
        }
        return item.value as T;
    }
}