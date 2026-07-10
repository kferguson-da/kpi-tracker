import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { KpiFormModal } from './KpiFormModal';
import type { Kpi } from '../lib/types';

describe('KpiFormModal', () => {
  it('should_post_a_new_kpi_and_call_on_saved', async () => {
    let posted: Record<string, unknown> | null = null;
    server.use(
      http.post('/api/kpis', async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 'k1' }, { status: 201 });
      }),
    );
    const onSaved = vi.fn();
    render(<KpiFormModal onClose={() => {}} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Show Rate' } });
    fireEvent.change(screen.getByLabelText('Goal value'), { target: { value: '65' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save KPI' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(posted).toMatchObject({
      name: 'Show Rate',
      goal: 65,
      unit: 'PERCENT',
      comparator: 'GTE',
      cadence: 'MONTHLY',
    });
  });

  it('should_disable_save_until_name_and_goal_are_valid', () => {
    render(<KpiFormModal onClose={() => {}} onSaved={() => {}} />);
    const save = screen.getByRole('button', { name: 'Save KPI' });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Show Rate' } });
    expect(save).toBeDisabled(); // still no goal

    fireEvent.change(screen.getByLabelText('Goal value'), { target: { value: '65' } });
    expect(save).toBeEnabled();
  });

  it('should_prefill_and_patch_when_editing', async () => {
    let patched: Record<string, unknown> | null = null;
    server.use(
      http.patch('/api/kpis/k1', async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 'k1' });
      }),
    );
    const initial: Kpi = {
      id: 'k1',
      name: 'Lead Response Rate',
      description: null,
      unit: 'PERCENT',
      comparator: 'GTE',
      goal: 90,
      goalUpper: null,
      cadence: 'MONTHLY',
      ownerId: 'u1',
      owner: { email: 'owner@da.io', name: null },
      archivedAt: null,
      createdAt: '2026-06-01T00:00:00.000Z',
      currentValue: null,
      status: 'no_data',
      recentReadings: [],
      canEdit: true,
    };
    const onSaved = vi.fn();
    render(<KpiFormModal initial={initial} onClose={() => {}} onSaved={onSaved} />);

    expect(screen.getByLabelText('Name')).toHaveValue('Lead Response Rate');
    expect(screen.getByLabelText('Goal value')).toHaveValue('90');

    fireEvent.change(screen.getByLabelText('Goal value'), { target: { value: '95' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(patched).toMatchObject({ name: 'Lead Response Rate', goal: 95, comparator: 'GTE' });
  });
});
