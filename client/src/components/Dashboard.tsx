import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Kpi, KpiStatus } from '../lib/types';
import { KpiCard } from './KpiCard';
import { KpiFormModal } from './KpiFormModal';

const SUMMARY: { status: KpiStatus; label: string }[] = [
  { status: 'green', label: 'On target' },
  { status: 'yellow', label: 'Watch' },
  { status: 'red', label: 'Off target' },
  { status: 'no_data', label: 'No data' },
];

export function Dashboard() {
  const [kpis, setKpis] = useState<Kpi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setError(null);
    setKpis(null);
    api
      .listKpis()
      .then(setKpis)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Failed to load KPIs'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return <p className="error">Could not load KPIs: {error}</p>;
  }
  if (kpis === null) {
    return <p className="muted">Loading…</p>;
  }

  const count = (status: KpiStatus) => kpis.filter((k) => k.status === status).length;

  return (
    <>
      <div className="page__head">
        <div>
          <h1 className="page__title">All KPIs</h1>
          <p className="page__subtitle">
            {kpis.length} {kpis.length === 1 ? 'metric' : 'metrics'} you can access
          </p>
        </div>
        <button className="btn btn--primary" type="button" onClick={() => setShowCreate(true)}>
          New KPI
        </button>
      </div>

      <div className="summary">
        {SUMMARY.map((s) => (
          <div className="summary__cell" key={s.status}>
            <div className={`summary__count summary__count--${s.status}`}>{count(s.status)}</div>
            <div className="summary__label">
              <span className={`dot dot--${s.status}`} /> {s.label}
            </div>
          </div>
        ))}
      </div>

      {kpis.length === 0 ? (
        <p className="muted">No KPIs yet. Create one to get started.</p>
      ) : (
        <div className="grid">
          {kpis.map((k) => (
            <KpiCard key={k.id} kpi={k} />
          ))}
        </div>
      )}

      {showCreate && (
        <KpiFormModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </>
  );
}
