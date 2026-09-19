import { AUTH_CHANGED_EVENT, STORAGE_KEYS } from '../config/constants';
export interface Principal { userId: number; ownerId: number | null; role: string; propertyIds: number[] }
let accessToken: string | null = null;
let tokenBaseUrl: string | null = null;
let principal: Principal | null = null;
export const authSession = {
    tokenFor(baseUrl: string) { return tokenBaseUrl === baseUrl ? accessToken : null; },
    principal() { return principal; },
    set(token: string | null, baseUrl: string, user: Principal | null) {
        accessToken = token; tokenBaseUrl = baseUrl; principal = user;
        window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
    },
    clear() {
        accessToken = null; tokenBaseUrl = null; principal = null;
        for (const key of [STORAGE_KEYS.ACTIVE_PROPERTY, STORAGE_KEYS.ACTIONS, STORAGE_KEYS.TRANSACTIONS, STORAGE_KEYS.INVOICES]) localStorage.removeItem(key);
        window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
    },
};
