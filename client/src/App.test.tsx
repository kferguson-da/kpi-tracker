import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import App from './App';
import { server } from './test/mocks/server';

describe('App', () => {
  it('should_show_signed_in_user_when_me_request_succeeds', async () => {
    render(<App />);

    expect(
      await screen.findByText('viewer@dealershipaccelerator.io · viewer'),
    ).toBeInTheDocument();
  });

  it('should_show_error_when_me_request_fails', async () => {
    server.use(
      http.get('/api/me', () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
          { status: 401 },
        ),
      ),
    );

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/unauthorized/i);
  });
});
