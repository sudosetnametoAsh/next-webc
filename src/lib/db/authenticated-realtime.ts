import type { SupabaseClient } from '@supabase/supabase-js';
import { jwtDecode } from 'jwt-decode';

const configured = new WeakSet<SupabaseClient>();
function authenticated(token: string | undefined): token is string {
  if (!token) return false;
  try {
    const claims = jwtDecode<{ role?: string; sub?: string; exp?: number }>(token);
    return claims.role === 'authenticated' && Boolean(claims.sub) && Boolean(claims.exp && claims.exp > Date.now() / 1000);
  } catch { return false; }
}

/** Never join a signed-in portal's channels with the public anonymous API key. */
export function configureAuthenticatedRealtime(client: SupabaseClient) {
  if (configured.has(client)) return;
  configured.add(client);
  let signedOut = false;
  let generation = 0;
  let currentToken: string | null = null;
  let pending: Promise<string | null> | undefined;
  const token = () => {
    if (signedOut) return Promise.resolve(null);
    if (pending) return pending;
    const startedGeneration = generation;
    pending = (async () => {
      const { data: { session } } = await client.auth.getSession();
      if (signedOut) return null;
      if (startedGeneration !== generation) return currentToken;
      if (authenticated(session?.access_token)) return session.access_token;
      // Server-rendered authentication may be available before the browser auth
      // client has hydrated its cookie session. Bootstrap the same verified user.
      const response = await fetch('/api/auth/realtime-session', { credentials: 'same-origin', cache: 'no-store' });
      if (signedOut) return null;
      if (startedGeneration !== generation) return currentToken;
      if (!response.ok) throw new Error('An authenticated realtime session is required');
      const body = await response.json();
      if (signedOut) return null;
      if (startedGeneration !== generation) return currentToken;
      if (!authenticated(body.accessToken)) throw new Error('Invalid realtime session');
      return body.accessToken as string;
    })().finally(() => { pending = undefined; });
    return pending;
  };
  // This callback is used for joins, reconnects and heartbeat token refreshes.
  client.realtime.accessToken = token;
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      generation++;
      currentToken = null;
      signedOut = true;
      client.realtime.disconnect();
      return;
    }
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
      if (event !== 'INITIAL_SESSION') generation++;
      currentToken = authenticated(session?.access_token) ? session.access_token : null;
      signedOut = false;
      // Do not await auth methods inside an auth callback (they hold the auth lock).
      queueMicrotask(() => {
        if (signedOut || !client.getChannels().length) return;
        void (authenticated(session?.access_token) ? client.realtime.setAuth(session.access_token) : client.realtime.setAuth())
          .catch(() => { /* Channel error handling owns reconnect/fallback UI. */ });
      });
    }
  });
}
