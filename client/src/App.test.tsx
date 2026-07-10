import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App shell', () => {
  it('should_show_the_signed_in_user_from_the_api', async () => {
    render(<App />);
    expect(await screen.findByText('kevin@dealershipaccelerator.io')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('should_render_the_dashboard_tab_as_active', () => {
    render(<App />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
