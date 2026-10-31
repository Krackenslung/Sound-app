import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MyPlaylist } from '@/api/types';
import { json, mockApi, premiumUser, renderApp } from '@/test/renderApp';
import { makeTrack } from '@/test/fixtures';

const liked = [1, 2, 3].map((n) => ({ addedAt: '2026-10-01T00:00:00Z', track: makeTrack(n) }));

export const playlistFixture = (id: string, extra: Partial<MyPlaylist> = {}): MyPlaylist => ({
  id,
  uri: `spotify:playlist:${id}`,
  name: `Mix ${id}`,
  description: null,
  images: [],
  ownerId: 'jg',
  ownerName: 'Jesus G.',
  collaborative: false,
  totalItems: 2,
  isOwner: true,
  editable: true,
  ...extra,
});

type Extra = Parameters<typeof mockApi>[0]['extra'];

function mockLibrary(over: Extra = () => undefined) {
  return mockApi({
    me: premiumUser,
    extra: async (url, init) => {
      const custom = await over!(url, init);
      if (custom) return custom;
      if (url.startsWith('/api/library/tracks'))
        return json({ items: liked, offset: 0, total: 3, nextOffset: null });
      if (url.startsWith('/api/playlists?'))
        return json({
          items: [
            playlistFixture('p1'),
            playlistFixture('p2', { isOwner: false, editable: false, name: 'Not mine' }),
          ],
          offset: 0,
          total: 2,
          nextOffset: null,
        });
      if (url.startsWith('/api/library/contains')) return json({});
      if (url === '/api/library' && init?.method === 'DELETE')
        return new Response(null, { status: 204 });
      if (url.startsWith('/api/player/') && init?.method)
        return new Response(null, { status: 204 });
      return undefined;
    },
  });
}

const calls = (fetchMock: ReturnType<typeof mockApi>, path: string) =>
  fetchMock.mock.calls.filter(([u]) => String(u) === path);

describe('LibraryPage · Liked Songs', () => {
  it('renders the hero, header row and liked tracks without per-row heart lookups', async () => {
    const fetchMock = mockLibrary();
    renderApp('/library');
    const hero = await screen.findByRole('region', { name: 'Liked Songs' });
    expect(within(hero).getByRole('heading', { name: 'Liked Songs' })).toBeInTheDocument();
    expect(await within(hero).findByText('Jesus G. · 3 songs')).toBeInTheDocument();
    const table = screen.getByRole('region', { name: 'Liked tracks' });
    expect(within(table).getByText('Title')).toBeInTheDocument();
    expect(within(table).getByText('Album')).toBeInTheDocument();
    expect(
      within(table).getByRole('button', { name: 'Remove Track 2 from Liked Songs' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(fetchMock.mock.calls.some(([u]) => String(u).startsWith('/api/library/contains'))).toBe(
      false,
    );
  });

  it('removes an unliked track optimistically', async () => {
    const fetchMock = mockLibrary();
    renderApp('/library');
    const table = await screen.findByRole('region', { name: 'Liked tracks' });
    await userEvent.click(
      await within(table).findByRole('button', { name: 'Remove Track 2 from Liked Songs' }),
    );
    expect(within(table).queryByText('Track 2')).not.toBeInTheDocument();
    await waitFor(() => expect(calls(fetchMock, '/api/library')).toHaveLength(1));
  });

  it('rolls the row back when unliking fails', async () => {
    mockLibrary((url, init) =>
      url === '/api/library' && init?.method === 'DELETE'
        ? json({ code: 'INTERNAL', message: 'x' }, 500)
        : undefined,
    );
    renderApp('/library');
    const table = await screen.findByRole('region', { name: 'Liked tracks' });
    await userEvent.click(
      await within(table).findByRole('button', { name: 'Remove Track 2 from Liked Songs' }),
    );
    expect(await screen.findByText("Couldn't remove from Liked Songs.")).toBeInTheDocument();
    expect(within(table).getByText('Track 2')).toBeInTheDocument();
  });

  it('plays Liked Songs as the user collection, and shuffle sets shuffle before playing', async () => {
    const fetchMock = mockLibrary();
    renderApp('/library');
    await userEvent.click(await screen.findByRole('button', { name: 'Play Track 3' }));
    await waitFor(() => expect(calls(fetchMock, '/api/player/play')).toHaveLength(1));
    expect(JSON.parse(calls(fetchMock, '/api/player/play')[0][1]!.body as string)).toEqual({
      contextUri: 'spotify:user:jg:collection',
      offset: { uri: 'spotify:track:t3' },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Shuffle Liked Songs' }));
    await waitFor(() => expect(calls(fetchMock, '/api/player/play')).toHaveLength(2));
    const order = fetchMock.mock.calls
      .map(([u]) => String(u))
      .filter((u) => /shuffle|play$/.test(u));
    expect(order.slice(-2)).toEqual(['/api/player/shuffle', '/api/player/play']);
  });

  it('explains when Spotify no longer lets the app list Liked Songs, but still allows playing', async () => {
    const fetchMock = mockLibrary((url) =>
      url.startsWith('/api/library/tracks')
        ? json(
            {
              code: 'ENDPOINT_UNAVAILABLE',
              message: "Spotify doesn't currently let this app list your Liked Songs.",
            },
            501,
          )
        : undefined,
    );
    renderApp('/library');
    expect(
      await screen.findByText(/doesn't currently let this app list your Liked Songs/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Play Liked Songs' }));
    await waitFor(() => expect(calls(fetchMock, '/api/player/play')).toHaveLength(1));
  });
});

describe('Playlists', () => {
  it('lists playlists in the tab and the sidebar', async () => {
    mockLibrary();
    renderApp('/library?tab=playlists');
    const grid = await screen.findByRole('region', { name: 'Your playlists' });
    expect(await within(grid).findByRole('link', { name: 'Mix p1' })).toHaveAttribute(
      'href',
      '/playlist/p1',
    );
    const sidebar = screen.getByRole('navigation', { name: 'Your playlists' });
    expect(await within(sidebar).findByRole('link', { name: /Not mine/ })).toHaveAttribute(
      'href',
      '/playlist/p2',
    );
  });

  it('creates a playlist from the dialog and opens it', async () => {
    const fetchMock = mockLibrary((url, init) => {
      if (url === '/api/playlists' && init?.method === 'POST')
        return json(playlistFixture('new', { name: 'Road trip', totalItems: 0 }), 201);
      if (url === '/api/playlists/new')
        return json(playlistFixture('new', { name: 'Road trip', totalItems: 0 }));
      if (url.startsWith('/api/playlists/new/items'))
        return json({ items: [], offset: 0, total: 0, nextOffset: null });
      return undefined;
    });
    const { router } = renderApp('/library?tab=playlists');
    await userEvent.click(await screen.findByRole('button', { name: 'New playlist' }));
    const dialog = screen.getByRole('dialog', { name: 'New playlist' });
    const name = within(dialog).getByLabelText('Name');
    expect(name).toHaveFocus();
    await userEvent.type(name, '  Road trip ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/playlist/new'));
    expect(JSON.parse(calls(fetchMock, '/api/playlists')[0][1]!.body as string)).toEqual({
      name: 'Road trip',
    });
    expect(await screen.findByRole('heading', { level: 1, name: 'Road trip' })).toBeInTheDocument();
    expect(await screen.findByText(/This playlist is empty/)).toBeInTheDocument();
  });

  it('adds a track to an editable playlist from the track menu', async () => {
    const fetchMock = mockLibrary((url, init) =>
      url === '/api/playlists/p1/items' && init?.method === 'POST'
        ? json({ snapshotId: 's' }, 201)
        : undefined,
    );
    renderApp('/library');
    await userEvent.click(await screen.findByRole('button', { name: 'More options for Track 1' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Add to playlist' }));
    const dialog = screen.getByRole('dialog', { name: 'Add to playlist' });
    expect(within(dialog).queryByText('Not mine')).not.toBeInTheDocument();
    await userEvent.click(await within(dialog).findByRole('button', { name: /Mix p1/ }));
    await waitFor(() => expect(calls(fetchMock, '/api/playlists/p1/items')).toHaveLength(1));
    expect(JSON.parse(calls(fetchMock, '/api/playlists/p1/items')[0][1]!.body as string)).toEqual({
      uris: ['spotify:track:t1'],
    });
    expect(await screen.findByText('Added to “Mix p1”')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('PlaylistPage', () => {
  const items = [makeTrack(1), makeTrack(2)].map((track) => ({ addedAt: null, track }));
  const playlistRoutes = (removeStatus: number) => (url: string, init?: RequestInit) => {
    if (url === '/api/playlists/p1') return json(playlistFixture('p1'));
    if (url.startsWith('/api/playlists/p1/items') && !init?.method)
      return json({ items, offset: 0, total: 2, nextOffset: null });
    if (url === '/api/playlists/p1/items' && init?.method === 'DELETE')
      return removeStatus === 200
        ? json({ snapshotId: 's2' })
        : json({ code: 'INTERNAL', message: 'x' }, removeStatus);
    return undefined;
  };

  it('removes a track optimistically with items in the request', async () => {
    const fetchMock = mockLibrary(playlistRoutes(200));
    renderApp('/playlist/p1');
    const section = await screen.findByRole('region', { name: 'Playlist tracks' });
    await userEvent.click(
      await within(section).findByRole('button', { name: 'More options for Track 1' }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Remove from this playlist' }));
    expect(within(section).queryByText('Track 1')).not.toBeInTheDocument();
    expect(screen.getByText('By you · 1 song')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        calls(fetchMock, '/api/playlists/p1/items').some(([, i]) => i?.method === 'DELETE'),
      ).toBe(true),
    );
  });

  it('rolls back a failed removal', async () => {
    mockLibrary(playlistRoutes(500));
    renderApp('/playlist/p1');
    const section = await screen.findByRole('region', { name: 'Playlist tracks' });
    await userEvent.click(
      await within(section).findByRole('button', { name: 'More options for Track 1' }),
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Remove from this playlist' }));
    expect(await screen.findByText("Couldn't remove that track.")).toBeInTheDocument();
    expect(within(section).getByText('Track 1')).toBeInTheDocument();
    expect(screen.getByText('By you · 2 songs')).toBeInTheDocument();
  });

  it("doesn't offer removal on playlists the user can't edit", async () => {
    mockLibrary((url, init) => {
      if (url === '/api/playlists/p1')
        return json(playlistFixture('p1', { isOwner: false, editable: false }));
      return playlistRoutes(200)(url, init);
    });
    renderApp('/playlist/p1');
    const section = await screen.findByRole('region', { name: 'Playlist tracks' });
    await userEvent.click(
      await within(section).findByRole('button', { name: 'More options for Track 1' }),
    );
    expect(
      screen.queryByRole('menuitem', { name: 'Remove from this playlist' }),
    ).not.toBeInTheDocument();
  });
});
