import { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { Dashboard } from './components/Dashboard';
import { api, ApiError } from './lib/api';
import type { Me } from './lib/types';

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .me()
      .then(setMe)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to sign in'));
  }, []);

  return (
    <AppShell me={me}>
      {error ? <p className="error">Could not sign you in: {error}</p> : <Dashboard />}
    </AppShell>
  );
}
