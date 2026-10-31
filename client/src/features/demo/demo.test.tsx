import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { json, renderApp } from '@/test/renderApp';
import { useDemoStore } from './demoStore';
import { demoRequest } from './demoBackend';

/** Logged out: /api/me → 401. Any other network call fails the test. */
function stubLoggedOutNetwork() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    if (String(input) === '/api/me') return json({ code: 'UNAUTHENTICATED', message: 'x' }, 401);
    throw new Error(`Unexpected network call in demo mode: ${String(input)}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function enterDemo() {
  const fetchMock = stubLoggedOutNetwork();
  const { router } = renderApp('/login');
  await userEvent.click(await screen.findByRole('button', { name: 'Explore demo mode' }));
  await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  return { fetchMock, router };
}

describe('demo mode', () => {
  it('works fully logged out, from fixtures, with no network calls', async () => {
    const { fetchMock } = await enterDemo();
    const callsBefore = fetchMock.mock.calls.length;

    expect(await screen.findByText('Demo mode')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: /, Demo$/ })).toBeInTheDocument();
    const top = screen.getByRole('region', { name: /Your top tracks/ });
    expect(await within(top).findByText('Neon Avenue')).toBeInTheDocument();
    expect(useDemoStore.getState().enabled).toBe(true);
    expect(sessionStorage.getItem('pulse.demo')).toBe('1');

    // Play: simulated on the demo device.
    await userEvent.click(within(top).getByRole('button', { name: 'Play Paper Satellites' }));
    const player = screen.getByRole('contentinfo', { name: 'Player' });
    expect(
      await within(player).findByRole('link', { name: 'Paper Satellites' }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(within(player).getByText('Playing on Demo player')).toBeInTheDocument();

    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });

  it('supports search, likes and playlists in memory', async () => {
    const { fetchMock } = await enterDemo();
    const callsBefore = fetchMock.mock.calls.length;
    await userEvent.click(await screen.findByRole('link', { name: 'Search' }));
    await userEvent.type(await screen.findByRole('searchbox'), 'neon');
    expect(await screen.findByRole('region', { name: 'Top result' })).toBeInTheDocument();
    const songs = screen.getByRole('region', { name: 'Songs' });
    expect(within(songs).getByText('Neon Avenue')).toBeInTheDocument();
    expect(within(songs).queryByText('Paper Satellites')).not.toBeInTheDocument();

    // "Neon Coast" isn't liked in the fixtures.
    const heart = within(songs).getByRole('button', { name: 'Save Neon Coast to Liked Songs' });
    await waitFor(() => expect(heart).toBeEnabled());
    await userEvent.click(heart);
    await screen.findByText('Added to Liked Songs');
    await userEvent.click(screen.getByRole('link', { name: 'Library' }));
    const table = await screen.findByRole('region', { name: 'Liked tracks' });
    expect(await within(table).findByText('Neon Coast')).toBeInTheDocument();

    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });

  it('exits demo mode from the account menu', async () => {
    const { router } = await enterDemo();
    await userEvent.click(await screen.findByRole('button', { name: 'Account menu' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Exit demo' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(useDemoStore.getState().enabled).toBe(false);
    expect(sessionStorage.getItem('pulse.demo')).toBeNull();
  });

  it('is offered when Spotify says the account is not allowlisted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ code: 'FORBIDDEN', message: 'User not registered' }, 403)),
    );
    renderApp('/');
    expect(await screen.findByRole('alert')).toHaveTextContent(/Explore demo mode/);
    expect(screen.getByRole('button', { name: 'Explore demo mode' })).toBeEnabled();
  });
});

describe('demo backend', () => {
  it('simulates playback progress and track advance', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(0);
    await demoRequest('/player/play', {
      method: 'PUT',
      body: JSON.stringify({ uris: ['spotify:track:afterglo1', 'spotify:track:afterglo2'] }),
    });
    vi.setSystemTime(230_000); // first track is 227 s
    const state = await demoRequest<{ track: { name: string }; progressMs: number }>('/player');
    expect(state.track.name).toBe('Afterglow City');
    expect(state.progressMs).toBe(3000);
    vi.useRealTimers();
  });

  it('returns 404 NO_ACTIVE_DEVICE for controls with nothing playing', async () => {
    await expect(demoRequest('/player/pause', { method: 'PUT', body: '{}' })).rejects.toMatchObject(
      {
        status: 404,
        code: 'NO_ACTIVE_DEVICE',
      },
    );
  });
});

describe('server without Spotify credentials', () => {
  it('skips the login page and opens demo mode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === '/api/me')
          return json({ code: 'LOGIN_NOT_CONFIGURED', message: 'x' }, 401);
        throw new Error(`Unexpected network call: ${String(input)}`);
      }),
    );
    const { router } = renderApp('/');
    expect(await screen.findByText('Demo mode')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(useDemoStore.getState().enabled).toBe(true);
  });
});

describe('demo entry via URL', () => {
  it('?demo=1 turns demo mode on and persists it for the session', async () => {
    window.history.replaceState(null, '', '/?demo=1');
    vi.resetModules();
    const { useDemoStore: fresh } = await import('./demoStore');
    expect(fresh.getState().enabled).toBe(true);
    expect(sessionStorage.getItem('pulse.demo')).toBe('1');
    window.history.replaceState(null, '', '/');
  });
});
