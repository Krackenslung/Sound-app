import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { json, mockApi, premiumUser, renderApp } from '@/test/renderApp';
import { makeTrack } from '@/test/fixtures';

const page = (items: unknown[], offset: number, total: number, nextOffset: number | null) =>
  json({ items, offset, total, nextOffset });

function mockSearch() {
  return mockApi({
    me: premiumUser,
    extra: (url, init) => {
      if (url.startsWith('/api/search?')) {
        const p = new URLSearchParams(url.split('?')[1]);
        const offset = Number(p.get('offset'));
        if (p.get('type') === 'track') {
          const items = Array.from({ length: offset === 0 ? 10 : 2 }, (_, i) =>
            makeTrack(offset + i + 1),
          );
          return page(items, offset, 12, offset === 0 ? 10 : null);
        }
        if (p.get('type') === 'album')
          return page(
            [
              {
                ...makeTrack(50).album,
                albumType: 'album',
                releaseDate: '2024-01-01',
                totalTracks: 9,
              },
            ],
            0,
            1,
            null,
          );
        if (p.get('type') === 'artist')
          return page(
            [
              {
                id: 'a1',
                uri: 'spotify:artist:a1',
                name: 'The Midnight Coast',
                images: [],
                genres: [],
              },
            ],
            0,
            1,
            null,
          );
        return page([], 0, 0, null);
      }
      if (url.startsWith('/api/library/contains')) return json({});
      if (url.startsWith('/api/player/') && init?.method)
        return new Response(null, { status: 204 });
      return undefined;
    },
  });
}

const searchCalls = (fetchMock: ReturnType<typeof mockSearch>) =>
  fetchMock.mock.calls.map(([u]) => String(u)).filter((u) => u.startsWith('/api/search'));

describe('SearchPage', () => {
  it('debounces typing, syncs ?q= and shows top result, songs and albums', async () => {
    const fetchMock = mockSearch();
    const { router } = renderApp('/search');
    const input = await screen.findByRole('searchbox', { name: 'Search Spotify' });
    await userEvent.type(input, 'neon');

    expect(await screen.findByRole('region', { name: 'Top result' })).toHaveTextContent('Track 1');
    expect(router.state.location.search).toBe('?q=neon');
    // One request per type, not one per keystroke.
    expect(searchCalls(fetchMock)).toEqual([
      '/api/search?q=neon&type=track&offset=0',
      '/api/search?q=neon&type=album&offset=0',
    ]);
    const songs = screen.getByRole('region', { name: 'Songs' });
    expect(within(songs).getByText('1–10 of 12')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Albums' })).toHaveTextContent('Album 50');
  });

  it('loads more results with the next offset', async () => {
    const fetchMock = mockSearch();
    renderApp('/search?q=neon');
    await userEvent.click(await screen.findByRole('button', { name: 'Load more results' }));
    expect(await screen.findByText('1–12 of 12')).toBeInTheDocument();
    expect(searchCalls(fetchMock)).toContain('/api/search?q=neon&type=track&offset=10');
    expect(screen.queryByRole('button', { name: 'Load more results' })).not.toBeInTheDocument();
  });

  it('plays a song with the loaded results as the queue', async () => {
    const fetchMock = mockSearch();
    renderApp('/search?q=neon');
    await userEvent.click(await screen.findByRole('button', { name: 'Play Track 3' }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) => u === '/api/player/play');
      expect(JSON.parse(call![1]!.body as string)).toMatchObject({ offset: { position: 2 } });
    });
  });

  it('adds a track to the queue from the row menu', async () => {
    const fetchMock = mockSearch();
    renderApp('/search?q=neon');
    await userEvent.click(await screen.findByRole('button', { name: 'More options for Track 2' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Add to queue' }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) => u === '/api/player/queue');
      expect(call?.[1]?.method).toBe('POST');
      expect(JSON.parse(call![1]!.body as string)).toEqual({ uri: 'spotify:track:t2' });
    });
    expect(await screen.findByText('Added to queue')).toBeInTheDocument();
  });

  it('switches filters with chips and links artists to their page', async () => {
    mockSearch();
    const { router } = renderApp('/search?q=neon');
    await userEvent.click(await screen.findByRole('button', { name: 'Artists' }));
    expect(router.state.location.search).toBe('?q=neon&type=artist');
    expect(await screen.findByRole('link', { name: /The Midnight Coast/ })).toHaveAttribute(
      'href',
      '/artist/a1',
    );
    expect(screen.getByRole('button', { name: 'Artists' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('clears the query with Escape', async () => {
    mockSearch();
    renderApp('/search?q=neon');
    const input = await screen.findByRole('searchbox');
    expect(input).toHaveValue('neon');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('');
  });
});
