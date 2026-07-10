import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { goalRuleError } from '../lib/goalRule';
import type { Cadence, Comparator, CreateKpiInput, Kpi, Unit } from '../lib/types';
import { Modal } from './Modal';

const UNITS: { value: Unit; label: string }[] = [
  { value: 'NUMBER', label: 'Number' },
  { value: 'PERCENT', label: 'Percent' },
  { value: 'DOLLARS', label: 'Dollars' },
];

const COMPARATORS: { value: Comparator; label: string }[] = [
  { value: 'EQ', label: 'equal to' },
  { value: 'GT', label: 'greater than' },
  { value: 'GTE', label: 'greater than or equal to' },
  { value: 'LT', label: 'less than' },
  { value: 'LTE', label: 'less than or equal to' },
  { value: 'BETWEEN', label: 'between' },
];

const CADENCES: { value: Cadence; label: string }[] = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
];

export function KpiFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Kpi;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = initial !== undefined;
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? 'PERCENT');
  const [comparator, setComparator] = useState<Comparator>(initial?.comparator ?? 'GTE');
  const [goal, setGoal] = useState(initial ? String(initial.goal) : '');
  const [goalUpper, setGoalUpper] = useState(
    initial?.goalUpper != null ? String(initial.goalUpper) : '',
  );
  const [cadence, setCadence] = useState<Cadence>(initial?.cadence ?? 'MONTHLY');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBetween = comparator === 'BETWEEN';
  const goalProvided = goal.trim() !== '' && Number.isFinite(Number(goal));
  const upper = isBetween && goalUpper.trim() !== '' ? Number(goalUpper) : null;

  const ruleError = !goalProvided
    ? 'Enter a numeric goal value.'
    : goalRuleError(comparator, Number(goal), isBetween ? upper : null);
  const nameError = name.trim() === '' ? 'Name is required.' : null;
  const canSubmit = !nameError && !ruleError && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      if (initial) {
        await api.updateKpi(initial.id, {
          name: name.trim(),
          description: description.trim() || null,
          unit,
          comparator,
          goal: Number(goal),
          goalUpper: isBetween && upper !== null ? upper : null,
          cadence,
        });
      } else {
        const input: CreateKpiInput = {
          name: name.trim(),
          description: description.trim() || undefined,
          unit,
          comparator,
          goal: Number(goal),
          goalUpper: isBetween && upper !== null ? upper : undefined,
          cadence,
        };
        await api.createKpi(input);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to save the KPI.');
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={editing ? 'Edit KPI' : 'New KPI'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="btn btn--primary" onClick={submit} disabled={!canSubmit} type="button">
            {editing ? 'Save changes' : 'Save KPI'}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="kpi-name">Name</label>
        <input
          id="kpi-name"
          className="control"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="kpi-desc">
          Description <span className="tag">(optional)</span>
        </label>
        <input
          id="kpi-desc"
          className="control"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Unit</label>
        <div className="seg">
          {UNITS.map((u) => (
            <button
              key={u.value}
              type="button"
              className={`seg__opt ${unit === u.value ? 'seg__opt--active' : ''}`}
              onClick={() => setUnit(u.value)}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="kpi-rule">Rule</label>
        <select
          id="kpi-rule"
          className="control"
          value={comparator}
          onChange={(e) => setComparator(e.target.value as Comparator)}
        >
          {COMPARATORS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="kpi-goal">{isBetween ? 'Lower value' : 'Goal value'}</label>
          <input
            id="kpi-goal"
            className="control"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            inputMode="decimal"
          />
        </div>
        {isBetween && (
          <div className="field">
            <label htmlFor="kpi-upper">Upper value</label>
            <input
              id="kpi-upper"
              className="control"
              value={goalUpper}
              onChange={(e) => setGoalUpper(e.target.value)}
              inputMode="decimal"
            />
          </div>
        )}
      </div>

      <div className="field">
        <label>Cadence</label>
        <div className="seg">
          {CADENCES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`seg__opt ${cadence === c.value ? 'seg__opt--active' : ''}`}
              onClick={() => setCadence(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {ruleError ? (
        <p className="hint hint--error">{ruleError}</p>
      ) : (
        <p className="hint hint--ok">Rule looks good.</p>
      )}
      {error && <p className="hint hint--error">{error}</p>}
    </Modal>
  );
}
