import { render, screen } from '@testing-library/react';
import { useDemoStore } from '@/features/demo/demoStore';
import { spotifyUrl } from '@/lib/spotifyUri';
import { OpenInSpotify } from './OpenInSpotify';

describe('spotifyUrl', () => {
  it.each([
    ['spotify:track:abc', 'https://open.spotify.com/track/abc'],
    ['spotify:album:x1', 'https://open.spotify.com/album/x1'],
    ['spotify:user:jg:collection', 'https://open.spotify.com/collection/tracks'],
    ['', null],
    ['https://evil.example', null],
  ])('%s → %s', (uri, url) => expect(spotifyUrl(uri)).toBe(url));
});

describe('OpenInSpotify', () => {
  it('links back to Spotify in a new tab with the Spotify icon', () => {
    render(<OpenInSpotify uri="spotify:album:x1" />);
    const link = screen.getByRole('link', { name: /Open Spotify/ });
    expect(link).toHaveAttribute('href', 'https://open.spotify.com/album/x1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('is hidden in demo mode (sample ids are not real)', () => {
    useDemoStore.setState({ enabled: true });
    const { container } = render(<OpenInSpotify uri="spotify:album:x1" />);
    expect(container).toBeEmptyDOMElement();
  });
});
