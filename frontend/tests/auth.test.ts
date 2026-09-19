import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map<string, string>();
Object.assign(globalThis, {
    window: new EventTarget(),
    localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) },
});
const { apiService } = await import('../src/services/apiService');
const { authSession } = await import('../src/auth/session');
const { STORAGE_KEYS } = await import('../src/config/constants');
const principal = { userId: 1, ownerId: 1, role: 'OWNER', propertyIds: [1] };
let calls: { url: string; init: RequestInit }[] = [];

beforeEach(() => {
    authSession.clear(); storage.clear(); calls = [];
    apiService.resetConfigToDefaults(); apiService.setActivePropertyId(null);
    globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init: init || {} }); return new Response('[]', { status: 200 }); };
});

test('attaches bearer tokens to previously unprotected property and user requests', async () => {
    authSession.set('test-token', apiService.getConfig().baseUrl, principal);
    await apiService.getProperties(); await apiService.getUsers();
    assert.equal(calls.length, 2);
    for (const call of calls) assert.equal(new Headers(call.init.headers).get('Authorization'), 'Bearer test-token');
});
test('read-only users cannot send a mutation', async () => {
    authSession.set('test-token', apiService.getConfig().baseUrl, { ...principal, role: 'SUB_MEMBER' });
    await assert.rejects(apiService.deleteProperty(1), /read-only/);
    assert.equal(calls.length, 0);
});
test('401 clears identity and cached tenant financial data instead of returning cached records', async () => {
    authSession.set('expired', apiService.getConfig().baseUrl, principal);
    storage.set(STORAGE_KEYS.INVOICES, '[{"id":"previous-owner-private-record"}]');
    globalThis.fetch = async () => new Response('{"code":"AUTHENTICATION_REQUIRED"}', { status: 401 });
    await assert.rejects(apiService.getInvoices(), /401/);
    assert.equal(authSession.principal(), null);
    assert.equal(storage.get(STORAGE_KEYS.INVOICES), undefined);
});
test('changing API server cannot forward a token issued by a different server', async () => {
    authSession.set('test-token', apiService.getConfig().baseUrl, principal);
    apiService.updateConfig({ baseUrl: 'https://different.example/api' });
    await apiService.getProperties();
    assert.equal(new Headers(calls[0].init.headers).has('Authorization'), false);
});

test('read-only mutations cannot fall back to a fake local success in demo mode', async () => {
    apiService.updateConfig({ useLiveBackend: false });
    authSession.set('test-token', apiService.getConfig().baseUrl, { ...principal, role: 'SUB_MEMBER' });
    await assert.rejects(apiService.recordPayment('1', 'Cash'), /read-only/);
    assert.equal(calls.length, 0);
});
