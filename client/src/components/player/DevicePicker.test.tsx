import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePlayerStore } from '@/store/playerStore';
import { json, mockApi, premiumUser, renderApp } from '@/test/renderApp';
import { toRows } from '@/features/player/deviceRows';

const devices = [
  { id: 'phone', name: "Jesus's iPhone", type: 'Smartphone', isActive: true, volumePercent: 50 },
  { id: 'spk', name: 'Living Room Speaker', type: 'Speaker', isActive: false, volumePercent: 30 },
];

describe('toRows', () => {
  it('puts this browser first, labels types and marks the active device', () => {
    const rows = toRows(devices, 'web', 'phone');
    expect(rows.map((r) => [r.name, r.subtitle, r.active])).toEqual([
      ['This browser', 'Pulse Player', false],
      ["Jesus's iPhone", 'Phone · Listening', true],
      ['Living Room Speaker', 'Speaker', false],
    ]);
  });
});

describe('DevicePicker', () => {
  it('lists devices and transfers playback, keeping play state', async () => {
    const fetchMock = mockApi({
      me: premiumUser,
      extra: (url, init) => {
        if (url === '/api/player/devices') return json({ devices });
        if (url === '/api/player/transfer' && init?.method === 'PUT')
          return new Response(null, { status: 204 });
        return undefined;
      },
    });
    renderApp('/');
    await screen.findByText('Jesus G.');
    usePlayerStore.setState({
      isPlaying: true,
      activeDevice: { id: 'phone', name: "Jesus's iPhone", isLocal: false },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Connect to a device' }));
    const dialog = await screen.findByRole('dialog', { name: 'Connect to a device' });
    expect(await within(dialog).findByText('Living Room Speaker')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Jesus's iPhone/ })).toHaveAttribute(
      'aria-current',
      'true',
    );

    await userEvent.click(within(dialog).getByRole('button', { name: /Living Room Speaker/ }));
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([u]) => u === '/api/player/transfer');
      expect(JSON.parse(call![1]!.body as string)).toEqual({ deviceId: 'spk', play: true });
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens automatically when a command fails with NO_ACTIVE_DEVICE', async () => {
    mockApi({
      me: premiumUser,
      extra: (url, init) => {
        if (url === '/api/player/devices') return json({ devices: [] });
        if (url === '/api/player/next' && init?.method === 'POST')
          return json({ code: 'NO_ACTIVE_DEVICE', message: 'No active device' }, 404);
        return undefined;
      },
    });
    renderApp('/');
    await screen.findByText('Jesus G.');
    usePlayerStore.setState({
      track: {
        uri: 'spotify:track:t1',
        id: 't1',
        name: 'T',
        durationMs: 1000,
        artists: [],
        album: { name: 'A', uri: 'spotify:album:a', images: [] },
      },
      activeDevice: { id: 'gone', name: 'Old phone', isLocal: false },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('dialog', { name: 'Connect to a device' })).toBeInTheDocument();
    expect(await screen.findByText(/No devices found/)).toBeInTheDocument();
  });
});
