import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';
import { Dashboard } from './Dashboard';
import type { Kpi } from '../lib/types';

function kpi(overrides: Partial<Kpi>): Kpi {
  return {
    id: 'k1',
    name: 'Lead Response Rate',
    description: null,
    unit: 'PERCENT',
    comparator: 'GTE',
    goal: 90,
    goalUpper: null,
    cadence: 'MONTHLY',
    ownerId: 'u1',
    archivedAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    currentValue: 94,
    status: 'green',
    recentReadings: [
      { periodKey: '2026-05', value: 90 },
      { periodKey: '2026-06', value: 94 },
    ],
    ...overrides,
  };
}

describe('Dashboard', () => {
  it('should_render_cards_with_value_and_goal_rule_from_the_api', async () => {
    server.use(
      http.get('/api/kpis', () =>
        HttpResponse.json([
          kpi({}),
          kpi({
            id: 'k2',
            name: 'Appointments Booked',
            status: 'red',
            currentValue: 151,
            unit: 'NUMBER',
            goal: 200,
          }),
        ]),
      ),
    );
    render(<Dashboard />);

    expect(await screen.findByText('Lead Response Rate')).toBeInTheDocument();
    expect(screen.getByText('Appointments Booked')).toBeInTheDocument();
    expect(screen.getByText('94%')).toBeInTheDocument();
    expect(screen.getByText('Goal ≥ 90%')).toBeInTheDocument();
    expect(screen.getByText('Goal ≥ 200')).toBeInTheDocument();
  });

  it('should_show_a_no_data_card_without_a_sparkline', async () => {
    server.use(
      http.get('/api/kpis', () =>
        HttpResponse.json([kpi({ currentValue: null, status: 'no_data', recentReadings: [] })]),
      ),
    );
    render(<Dashboard />);
    expect(await screen.findByText('Trend appears after the first reading')).toBeInTheDocument();
  });

  it('should_show_an_empty_state_when_there_are_no_kpis', async () => {
    server.use(http.get('/api/kpis', () => HttpResponse.json([])));
    render(<Dashboard />);
    expect(await screen.findByText(/No KPIs yet/)).toBeInTheDocument();
  });
});
