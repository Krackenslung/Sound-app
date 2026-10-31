import { screen, within } from '@testing-library/react';
import { apiTrackToPlayerTrack } from '@/features/player/mappers';
import { usePlayerStore } from '@/store/playerStore';
import { json, mockApi, premiumUser, renderApp } from '@/test/renderApp';
import { makeTrack } from '@/test/fixtures';

describe('QueuePanel', () => {
  it('shows the API queue under Next up on the Now Playing page', async () => {
    mockApi({
      me: premiumUser,
      extra: (url) => {
        if (url === '/api/player/queue')
          return json({ currentlyPlaying: makeTrack(1), queue: [makeTrack(2), makeTrack(3)] });
        if (url.startsWith('/api/library/contains')) return json({});
        return undefined;
      },
    });
    usePlayerStore.setState({
      track: apiTrackToPlayerTrack(makeTrack(1)),
      activeDevice: { id: 'web', name: 'This browser', isLocal: true },
    });
    renderApp('/now-playing');
    const panel = await screen.findByRole('region', { name: 'Queue' });
    expect(within(panel).getByText('Playing on this browser')).toBeInTheDocument();
    expect(await within(panel).findByText('Track 3')).toBeInTheDocument();
    expect(within(panel).getAllByRole('listitem')).toHaveLength(2);
  });
});
