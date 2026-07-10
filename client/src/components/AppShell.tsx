import type { ReactNode } from 'react';
import type { Me } from '../lib/types';
import { DaMark } from './DaMark';

function initials(me: Me): string {
  const source = me.name ?? me.email;
  return source.slice(0, 2).toUpperCase();
}

export function AppShell({ me, children }: { me: Me | null; children: ReactNode }) {
  return (
    <div className="app">
      <nav className="nav">
        <div className="lockup">
          <DaMark className="lockup__mark" />
          <span className="lockup__word">DAOS</span>
          <span className="lockup__sub">KPI Tracker</span>
        </div>
        <div className="nav__tabs">
          <span className="tab tab--active">Dashboard</span>
          <span className="tab">Views</span>
          <span className="tab">Archived</span>
        </div>
        <div className="nav__right">
          {me ? (
            <span className="user-chip">
              <span className="avatar">{initials(me)}</span>
              <span className="user-chip__email">{me.email}</span>
              {me.isAdmin && <span className="role-pill">Admin</span>}
            </span>
          ) : (
            <span className="user-chip muted">Signing in…</span>
          )}
        </div>
      </nav>
      <main className="page">{children}</main>
    </div>
  );
}
