import { useEffect, useState } from 'react';
import { api, ApiError, type Me } from './utils/api';
import './App.css';

type LoadState =
  { status: 'loading' } | { status: 'ready'; me: Me } | { status: 'error'; message: string };

export default function App() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    api
      .getMe()
      .then((me) => {
        if (active) setState({ status: 'ready', me });
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof ApiError ? err.message : 'Failed to load your account';
        setState({ status: 'error', message });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">KPI Tracker</h1>
        {state.status === 'ready' && (
          <span className="app__user">
            {state.me.email} · {state.me.role}
          </span>
        )}
      </header>

      {state.status === 'loading' && <p>Loading…</p>}
      {state.status === 'error' && <p role="alert">{state.message}</p>}
      {state.status === 'ready' && (
        <p>You are signed in. The KPI dashboard arrives in the next slice.</p>
      )}
    </main>
  );
}
