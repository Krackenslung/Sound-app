import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Artist } from '@/api/types';
import { json, mockApi, premiumUser, renderApp } from '@/test/renderApp';
import { makeTrack } from '@/test/fixtures';

const artist = (n: number, genres: string[] | null): Artist => ({
  id: `a${n}`,
  uri: `spotify:artist:a${n}`,
  name: `Artist ${n}`,
  images: [],
  genres,
});

const withGenres = [
  artist(1, ['synthwave', 'indie pop']),
  artist(2, ['synthwave']),
  artist(3, ['latin alternative']),
  ...[4, 5, 6, 7].map((n) => artist(n, [])),
];
// Durations 201s, 202s, 203s → avg 3:22.
const topTracks = [1, 2, 3].map((n) => makeTrack(n));

function mockStats({ artists = withGenres, tracksByRange = {} as Record<string, unknown> } = {}) {
  return mockApi({
    me: premiumUser,
    extra: (url) => {
      if (url.startsWith('/api/me/top/artists')) return json({ items: artists });
      if (url.startsWith('/api/me/top/tracks')) {
        const range = new URLSearchParams(url.split('?')[1]).get('time_range')!;
        return json({ items: tracksByRange[range] ?? topTracks });
      }
      if (url.startsWith('/api/me/recently-played'))
        return json({
          items: [
            {
              track: makeTrack(9),
              playedAt: new Date(Date.now() - 2 * 3600e3).toISOString(),
              contextUri: null,
            },
          ],
        });
      if (url.startsWith('/api/library/contains')) return json({});
      return undefined;
    },
  });
}

describe('StatsPage', () => {
  it('renders summary tiles, top artists, top tracks, genre breakdown and recently played', async () => {
    mockStats();
    renderApp('/stats');
    const summary = await screen.findByRole('region', { name: 'Summary' });
    expect(await within(summary).findByText('Synthwave')).toBeInTheDocument();
    expect(within(summary).getByText('top genre')).toBeInTheDocument();
    expect(within(summary).getByText('3')).toBeInTheDocument(); // distinct genres
    expect(within(summary).getByText('Track 1')).toBeInTheDocument();
    expect(within(summary).getByText('#1 track this month')).toBeInTheDocument();
    expect(within(summary).getByText('3:22')).toBeInTheDocument();

    const artistsSection = screen.getByRole('region', { name: 'Top artists' });
    expect(within(artistsSection).getAllByRole('listitem')).toHaveLength(6);
    expect(within(artistsSection).getByRole('link', { name: /Artist 1\s*#1/ })).toHaveAttribute(
      'href',
      '/artist/a1',
    );

    const breakdown = screen.getByRole('region', { name: 'Genre breakdown' });
    expect(within(breakdown).getByRole('meter', { name: 'synthwave' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
    expect(within(breakdown).getByText('From the genres of your top artists.')).toBeInTheDocument();

    const recent = screen.getByRole('region', { name: 'Recently played' });
    expect(await within(recent).findByText(/Artist 9 · 2 hours ago/)).toBeInTheDocument();
  });

  it('switches time range with the segmented control (and keyboard)', async () => {
    const fetchMock = mockStats({ tracksByRange: { long_term: [makeTrack(7)] } });
    const { router } = renderApp('/stats');
    const group = await screen.findByRole('radiogroup', { name: 'Time range' });
    await userEvent.click(within(group).getByRole('radio', { name: 'All time' }));
    expect(router.state.location.search).toBe('?range=long_term');
    expect(within(group).getByRole('radio', { name: 'All time' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(await screen.findByText('#1 track of all time')).toBeInTheDocument();
    expect(await screen.findAllByText('Track 7')).not.toHaveLength(0);
    expect(
      fetchMock.mock.calls.some(([u]) =>
        String(u).includes('/api/me/top/artists?time_range=long_term'),
      ),
    ).toBe(true);

    await userEvent.keyboard('{ArrowLeft}');
    expect(router.state.location.search).toBe('?range=medium_term');
  });

  it('falls back to artist stats when Spotify sends no genres', async () => {
    mockStats({ artists: [artist(1, null), artist(2, null)] });
    renderApp('/stats');
    const summary = await screen.findByRole('region', { name: 'Summary' });
    expect(await within(summary).findByText('#1 artist')).toBeInTheDocument();
    expect(within(summary).getByText('Artist 1')).toBeInTheDocument();
    expect(within(summary).getByText('artists in your top tracks')).toBeInTheDocument();
    expect(within(summary).queryByText('top genre')).not.toBeInTheDocument();
    const breakdown = await screen.findByRole('region', { name: 'Artist breakdown' });
    expect(within(breakdown).getByText(/doesn't share genre data/)).toBeInTheDocument();
    expect(within(breakdown).getAllByRole('meter')).toHaveLength(3);
  });
});

describe('Monthly playlist generator', () => {
  function mockMonthly(months: unknown, create?: (init?: RequestInit) => Response) {
    return mockApi({
      me: premiumUser,
      extra: (url, init) => {
        if (url.startsWith('/api/library/months')) return months as Response;
        if (url === '/api/playlists/monthly' && init?.method === 'POST') return create!(init);
        if (url.startsWith('/api/library/tracks'))
          return json({ items: [], offset: 0, total: 0, nextOffset: null });
        if (url === '/api/playlists/m1')
          return json({
            id: 'm1',
            uri: 'spotify:playlist:m1',
            name: 'Liked in September 2026',
            description: null,
            images: [],
            ownerId: 'jg',
            ownerName: null,
            collaborative: false,
            totalItems: 12,
            isOwner: true,
            editable: true,
          });
        if (url.startsWith('/api/playlists/m1/items'))
          return json({ items: [], offset: 0, total: 0, nextOffset: null });
        return undefined;
      },
    });
  }

  it('lists months with counts, preselects the newest non-empty one, and creates the playlist', async () => {
    const fetchMock = mockMonthly(
      json({
        items: [
          { month: '2026-10', count: 0 },
          { month: '2026-09', count: 12 },
          { month: '2026-08', count: 4 },
        ],
        truncated: false,
      }),
      () =>
        json(
          { playlist: { id: 'm1', name: 'Liked in September 2026' }, added: 12, truncated: false },
          201,
        ),
    );
    const { router } = renderApp('/library');
    await userEvent.click(await screen.findByRole('button', { name: 'Create monthly playlist' }));
    const dialog = screen.getByRole('dialog', { name: 'Create a monthly playlist' });
    expect(
      await within(dialog).findByRole('radio', { name: /October 2026\s*0 songs/ }),
    ).toBeDisabled();
    expect(within(dialog).getByRole('radio', { name: /September 2026/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await userEvent.click(within(dialog).getByRole('radio', { name: /August 2026/ }));
    await userEvent.click(within(dialog).getByRole('radio', { name: /September 2026/ }));
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Create “Liked in September 2026”' }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe('/playlist/m1'));
    const call = fetchMock.mock.calls.find(([u]) => u === '/api/playlists/monthly')!;
    expect(JSON.parse(call[1]!.body as string)).toEqual({ month: '2026-09' });
    expect(
      await screen.findByText('Created “Liked in September 2026” with 12 songs'),
    ).toBeInTheDocument();
  });

  it('explains when Liked Songs cannot be read', async () => {
    mockMonthly(
      json(
        {
          code: 'ENDPOINT_UNAVAILABLE',
          message: "Spotify doesn't currently let this app read your Liked Songs.",
        },
        501,
      ),
    );
    renderApp('/library');
    await userEvent.click(await screen.findByRole('button', { name: 'Create monthly playlist' }));
    expect(await screen.findByText(/isn't available right now/)).toBeInTheDocument();
  });
});
