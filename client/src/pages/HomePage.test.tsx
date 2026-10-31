import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { json, mockApi, premiumUser, renderApp } from '@/test/renderApp';
import { makeTrack } from '@/test/fixtures';
import { recentAlbums } from '@/features/home/recentAlbums';

const top = [1, 2, 3].map((n) => makeTrack(n));
const recent = [makeTrack(4), makeTrack(5), makeTrack(4, { uri: 'spotify:track:other' })].map(
  (track, i) => ({ track, playedAt: `2026-10-31T0${i}:00:00Z`, contextUri: null }),
);

function mockHome() {
  return mockApi({
    me: premiumUser,
    extra: (url, init) => {
      if (url.startsWith('/api/me/top/tracks')) return json({ items: top });
      if (url.startsWith('/api/me/recently-played')) return json({ items: recent });
      if (url.startsWith('/api/library/contains')) return json({ 'spotify:track:t1': true });
      if (url === '/api/player/play' && init?.method === 'PUT')
        return new Response(null, { status: 204 });
      if (url === '/api/library' && init?.method === 'DELETE')
        return new Response(null, { status: 204 });
      return json({ code: 'NOT_FOUND', message: 'x' }, 404);
    },
  });
}

describe('HomePage', () => {
  it('renders recently played albums (deduplicated) and top tracks', async () => {
    mockHome();
    renderApp('/');
    const recentSection = await screen.findByRole('region', { name: 'Recently played' });
    await within(recentSection).findByText('Album 4');
    expect(within(recentSection).getAllByRole('button', { name: /^Play Album/ })).toHaveLength(2);

    const topSection = screen.getByRole('region', { name: /Your top tracks this month/ });
    expect(await within(topSection).findByText('Track 1')).toBeInTheDocument();
    expect(within(topSection).getByText('3:21')).toBeInTheDocument();
  });

  it('plays the top tracks starting from the clicked one', async () => {
    const fetchMock = mockHome();
    renderApp('/');
    await userEvent.click(await screen.findByRole('button', { name: 'Play Track 2' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/player/play',
        expect.objectContaining({ method: 'PUT' }),
      ),
    );
    const call = fetchMock.mock.calls.find(([u]) => u === '/api/player/play')!;
    expect(JSON.parse(call[1]!.body as string)).toEqual({
      uris: ['spotify:track:t1', 'spotify:track:t2', 'spotify:track:t3'],
      offset: { position: 1 },
    });
  });

  it('plays an album context from a card', async () => {
    const fetchMock = mockHome();
    renderApp('/');
    await userEvent.click(await screen.findByRole('button', { name: 'Play Album 5' }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) => u === '/api/player/play');
      expect(JSON.parse(call![1]!.body as string)).toEqual({ contextUri: 'spotify:album:al5' });
    });
  });

  it('toggles a liked track optimistically', async () => {
    const fetchMock = mockHome();
    renderApp('/');
    const unlike = await screen.findByRole('button', { name: 'Remove Track 1 from Liked Songs' });
    expect(unlike).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(unlike);
    expect(screen.getByRole('button', { name: 'Save Track 1 to Liked Songs' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/library',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });
});

describe('recentAlbums', () => {
  it('keeps the first occurrence of each album', () => {
    expect(recentAlbums(recent).map((a) => a.uri)).toEqual([
      'spotify:album:al4',
      'spotify:album:al5',
    ]);
  });
});
