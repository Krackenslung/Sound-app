import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { PlayerControlsContext } from '@/features/player/playerContext';
import { apiTrackToPlayerTrack } from '@/features/player/mappers';
import { usePlayerStore } from '@/store/playerStore';
import { mockControls } from '@/test/mockControls';
import { makeTrack } from '@/test/fixtures';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

function Harness() {
  useKeyboardShortcuts();
  return (
    <>
      <input aria-label="Name" />
      <button type="button">A button</button>
    </>
  );
}

function setup(path = '/') {
  const controls = mockControls();
  const router = createMemoryRouter(
    [
      { path: '/', element: <Harness /> },
      {
        path: '/search',
        element: (
          <>
            <Harness />
            <input type="search" aria-label="Search" />
          </>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <PlayerControlsContext.Provider value={controls}>
      <RouterProvider router={router} />
    </PlayerControlsContext.Provider>,
  );
  return { controls, router };
}

beforeEach(() => {
  usePlayerStore.setState({
    track: apiTrackToPlayerTrack(makeTrack(1)),
    isPlaying: false,
    positionMs: 60_000,
    positionAt: Date.now(),
    durationMs: 201_000,
  });
});

describe('keyboard shortcuts', () => {
  it('Space toggles play/pause', () => {
    const { controls } = setup();
    fireEvent.keyDown(document.body, { key: ' ' });
    expect(controls.togglePlay).toHaveBeenCalledOnce();
  });

  it('arrows seek ±10 s and Shift+arrows skip', () => {
    const { controls } = setup();
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(controls.seek).toHaveBeenLastCalledWith(70_000);
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
    expect(controls.seek).toHaveBeenLastCalledWith(50_000);
    fireEvent.keyDown(document.body, { key: 'ArrowRight', shiftKey: true });
    expect(controls.next).toHaveBeenCalledOnce();
    fireEvent.keyDown(document.body, { key: 'ArrowLeft', shiftKey: true });
    expect(controls.previous).toHaveBeenCalledOnce();
  });

  it('never seeks below 0', () => {
    usePlayerStore.setState({ positionMs: 3000 });
    const { controls } = setup();
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
    expect(controls.seek).toHaveBeenLastCalledWith(0);
  });

  it('ignores keys while typing, with modifiers, and Space on a focused button', () => {
    const { controls } = setup();
    fireEvent.keyDown(screen.getByLabelText('Name'), { key: ' ' });
    fireEvent.keyDown(screen.getByLabelText('Name'), { key: 'ArrowRight' });
    fireEvent.keyDown(document.body, { key: 'ArrowRight', metaKey: true });
    fireEvent.keyDown(screen.getByRole('button', { name: 'A button' }), { key: ' ' });
    expect(controls.togglePlay).not.toHaveBeenCalled();
    expect(controls.seek).not.toHaveBeenCalled();
  });

  it('does nothing for playback keys when nothing is loaded', () => {
    usePlayerStore.setState({ track: null });
    const { controls } = setup();
    fireEvent.keyDown(document.body, { key: ' ' });
    expect(controls.togglePlay).not.toHaveBeenCalled();
  });

  it('"/" goes to search and focuses the input', async () => {
    const { router } = setup('/');
    fireEvent.keyDown(document.body, { key: '/' });
    expect(router.state.location.pathname).toBe('/search');
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByLabelText('Search')).toHaveFocus();
  });
});
