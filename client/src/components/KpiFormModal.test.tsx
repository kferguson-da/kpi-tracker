import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { KpiFormModal } from './KpiFormModal';

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
});
