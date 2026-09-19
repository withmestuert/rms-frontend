import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import { API_PATHS } from '../config/apiPaths';
import { AUTH_CHANGED_EVENT, AUTHORIZATION_HEADER, ROLES } from '../config/constants';
import { authSession, Principal } from './session';

interface ClientConfiguration { authenticationEnabled: boolean; setupAvailable: boolean; adminUrl: string }
const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
const button = 'rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';

async function authRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const baseUrl = apiService.getConfig().baseUrl;
    const token = authSession.tokenFor(baseUrl);
    const response = await fetch(`${baseUrl}${path}`, {
        method, credentials: 'omit', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', ...(token ? { [AUTHORIZATION_HEADER]: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let data: any;
    try { data = text ? JSON.parse(text) : undefined; } catch { data = text; }
    if (!response.ok) {
        if (response.status === 401) authSession.clear();
        throw new Error(response.status === 401 ? 'Invalid credentials or expired session.'
            : response.status === 429 ? 'Too many attempts. Wait a minute and try again.'
            : typeof data === 'string' ? data : data?.detail || data?.code || `Request failed (${response.status}).`);
    }
    return data as T;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
    const [principal, setPrincipal] = useState<Principal | null>(authSession.principal());
    const [configuration, setConfiguration] = useState<ClientConfiguration | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const initialize = async () => {
        setError('');
        try {
            const config = await authRequest<ClientConfiguration>(API_PATHS.CLIENT_CONFIG);
            setConfiguration(config);
            if (!config.authenticationEnabled) {
                const user = await authRequest<Principal>(API_PATHS.ME);
                authSession.set(null, apiService.getConfig().baseUrl, user);
            }
        } catch (err) { setError(err instanceof Error ? err.message : 'Unable to reach authentication service.'); }
    };
    useEffect(() => {
        const changed = () => { setPrincipal(authSession.principal()); setPasswordOpen(false); };
        window.addEventListener(AUTH_CHANGED_EVENT, changed);
        void initialize();
        return () => window.removeEventListener(AUTH_CHANGED_EVENT, changed);
    }, []);
    const adminUrl = configuration ? new URL(configuration.adminUrl, apiService.getConfig().baseUrl).toString() : '';

    const login = async (event: React.FormEvent) => {
        event.preventDefault(); setBusy(true); setError('');
        try {
            const session = await authRequest<{ accessToken: string }>(API_PATHS.LOGIN, 'POST', { username, password });
            authSession.clear(); apiService.setActivePropertyId(null);
            authSession.set(session.accessToken, apiService.getConfig().baseUrl, null);
            const user = await authRequest<Principal>(API_PATHS.ME);
            authSession.set(session.accessToken, apiService.getConfig().baseUrl, user);
            setPassword('');
        } catch (err) { authSession.clear(); setError(err instanceof Error ? err.message : 'Sign in failed.'); }
        finally { setBusy(false); }
    };
    const logout = async () => {
        setBusy(true); setError('');
        try { await authRequest(API_PATHS.LOGOUT, 'POST'); authSession.clear(); apiService.setActivePropertyId(null); }
        catch (err) { setError(err instanceof Error ? err.message : 'Sign out failed. Retry to revoke the session.'); }
        finally { setBusy(false); }
    };
    const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); setBusy(true); setError('');
        const body = Object.fromEntries(new FormData(event.currentTarget));
        try { await authRequest(API_PATHS.PASSWORD, 'POST', body); authSession.clear(); }
        catch (err) { setError(err instanceof Error ? err.message : 'Password change failed.'); }
        finally { setBusy(false); }
    };

    if (!principal) return <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <section className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-8 shadow-sm">
            <p className="text-xs font-bold tracking-widest text-teal-800">PROJECT RMS</p>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">Sign in to your PG workspace</h1>
            <p className="my-3 text-sm text-slate-600">Use the account provided by your administrator or PG owner.</p>
            {error && <p role="alert" className="my-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
            {!configuration ? <button className={button} onClick={initialize}>Retry connection</button> : configuration.authenticationEnabled ? <form onSubmit={login} className="grid gap-4 mt-5">
                <label className="text-sm font-semibold">Username<input className={`${field} mt-1`} value={username} onChange={e => setUsername(e.target.value)} required maxLength={100} autoComplete="username" /></label>
                <label className="text-sm font-semibold">Password<input className={`${field} mt-1`} type="password" value={password} onChange={e => setPassword(e.target.value)} required maxLength={72} autoComplete="current-password" /></label>
                <button className={button} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
            </form> : <button className={button} onClick={initialize}>Retry testing connection</button>}
            {configuration && <a className="mt-5 block text-sm text-teal-800 underline" href={adminUrl}>Root setup and owner administration</a>}
        </section>
    </main>;

    return <>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-2 text-xs">
            <span>{principal.role === ROLES.TEST_BYPASS ? 'Testing mode — authentication and authorization disabled' : principal.role === ROLES.SUB_MEMBER ? 'Read-only access to your assigned PGs' : `${principal.role.replaceAll('_', ' ')} · Account ${principal.userId}`}</span>
            <div className="flex gap-3">
                {principal.role !== ROLES.TEST_BYPASS && <><button onClick={() => setPasswordOpen(open => !open)}>Change password</button><button disabled={busy} onClick={logout}>Sign out</button></>}
                {principal.role === ROLES.ROOT && <a href={adminUrl} className="text-teal-800 underline">Open administration</a>}
            </div>
        </div>
        {error && <p role="alert" className="bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
        {passwordOpen && <form onSubmit={changePassword} className="mx-auto my-5 grid max-w-md gap-3 rounded-xl border bg-white p-5">
            <h2 className="font-semibold">Change password</h2><label className="text-sm">Current password<input className={field} name="currentPassword" type="password" required autoComplete="current-password" /></label>
            <label className="text-sm">New password<input className={field} name="newPassword" type="password" required minLength={12} maxLength={72} autoComplete="new-password" /></label>
            <button className={button} disabled={busy}>Change password and sign out</button>
        </form>}
        {principal.role === ROLES.ROOT ? <section className="m-8 rounded-xl border bg-white p-6"><h1 className="text-xl font-bold">Root administration</h1><p className="my-3 text-slate-600">Manage PG owners in the separate administration page.</p><a className={button} href={adminUrl}>Open administration</a></section> : <React.Fragment key={principal.userId}>{children}</React.Fragment>}
    </>;
}
