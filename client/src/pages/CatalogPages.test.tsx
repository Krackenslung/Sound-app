import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { json, mockApi, premiumUser, renderApp } from '@/test/renderApp';
import { makeTrack } from '@/test/fixtures';

const album = {
  ...makeTrack(1).album,
  albumType: 'album',
  releaseDate: '2024-05-01',
  totalTracks: 2,
  tracks: [makeTrack(1), makeTrack(2)],
};

function mockCatalog() {
  return mockApi({
    me: premiumUser,
    extra: (url, init) => {
      if (url === '/api/albums/al1') return json(album);
      if (url === '/api/albums/missing')
        return json({ code: 'SPOTIFY_ERROR', message: 'nope' }, 404);
      if (url === '/api/artists/a1')
        return json({
          id: 'a1',
          uri: 'spotify:artist:a1',
          name: 'Artist 1',
          images: [],
          genres: ['synthwave'],
        });
      if (url.startsWith('/api/artists/a1/albums'))
        return json({
          items: [{ ...album, tracks: undefined }],
          offset: 0,
          total: 1,
          nextOffset: null,
        });
      if (url.startsWith('/api/library/contains')) return json({});
      if (url.startsWith('/api/player/') && init?.method)
        return new Response(null, { status: 204 });
      return undefined;
    },
  });
}

describe('AlbumPage', () => {
  it('renders the album and plays a track within the album context', async () => {
    const fetchMock = mockCatalog();
    renderApp('/album/al1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Album 1' })).toBeInTheDocument();
    expect(screen.getByText(/2024 · 2 songs · 6:43/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Artist 1' })).toHaveAttribute('href', '/artist/a1');

    await userEvent.click(screen.getByRole('button', { name: 'Play Track 2' }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) => u === '/api/player/play');
      expect(JSON.parse(call![1]!.body as string)).toEqual({
        contextUri: 'spotify:album:al1',
        offset: { uri: 'spotify:track:t2' },
      });
    });
  });

  it('shows a friendly error for a missing album', async () => {
    mockCatalog();
    renderApp('/album/missing');
    expect(
      await screen.findByRole('heading', { name: "This album isn't available" }),
    ).toBeInTheDocument();
  });
});

describe('ArtistPage', () => {
  it('renders the artist with genres and discography, and plays the artist context', async () => {
    const fetchMock = mockCatalog();
    renderApp('/artist/a1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Artist 1' })).toBeInTheDocument();
    expect(screen.getByText('synthwave')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Album 1' })).toHaveAttribute(
      'href',
      '/album/al1',
    );
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('top-tracks'))).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Play Artist 1' }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) => u === '/api/player/play');
      expect(JSON.parse(call![1]!.body as string)).toEqual({ contextUri: 'spotify:artist:a1' });
    });
  });
});
