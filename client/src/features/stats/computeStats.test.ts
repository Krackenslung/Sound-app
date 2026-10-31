import { artistBreakdown, averageDurationMs, genreBreakdown, sentenceCase } from './computeStats';
import { makeTrack } from '@/test/fixtures';
import type { Artist } from '@/api/types';

const artist = (name: string, genres: string[] | null): Artist => ({
  id: name,
  uri: `spotify:artist:${name}`,
  name,
  images: [],
  genres,
});

describe('genreBreakdown', () => {
  it('ranks genres by how many top artists list them, as whole percentages', () => {
    const b = genreBreakdown([
      artist('a', ['synthwave', 'indie pop']),
      artist('b', ['synthwave']),
      artist('c', ['synthwave', 'lo-fi']),
      artist('d', []),
    ]);
    expect(b).toEqual({
      kind: 'genre',
      distinct: 3,
      items: [
        { label: 'synthwave', percent: 60 },
        { label: 'indie pop', percent: 20 },
        { label: 'lo-fi', percent: 20 },
      ],
    });
  });

  it('caps the list', () => {
    const many = Array.from({ length: 8 }, (_, i) => artist(`a${i}`, [`g${i}`]));
    expect(genreBreakdown(many, 5)!.items).toHaveLength(5);
    expect(genreBreakdown(many, 5)!.distinct).toBe(8);
  });

  it('returns null when Spotify sent no genre data at all', () => {
    expect(genreBreakdown([artist('a', null), artist('b', null)])).toBeNull();
    expect(genreBreakdown([])).toBeNull();
  });

  it('treats "genres present but empty" as zero genres, not missing', () => {
    expect(genreBreakdown([artist('a', [])])).toEqual({ kind: 'genre', distinct: 0, items: [] });
  });
});

describe('artistBreakdown and averages', () => {
  it('shares artist credits across top tracks', () => {
    const tracks = [makeTrack(1), makeTrack(1, { uri: 'x' }), makeTrack(2)];
    expect(artistBreakdown(tracks)).toEqual({
      kind: 'artist',
      distinct: 2,
      items: [
        { label: 'Artist 1', percent: 67 },
        { label: 'Artist 2', percent: 33 },
      ],
    });
  });

  it('averages durations', () => {
    expect(averageDurationMs([makeTrack(1), makeTrack(3)])).toBe(202_000);
    expect(averageDurationMs([])).toBeNull();
  });

  it('sentence-cases genre names like the Figma frame', () => {
    expect(sentenceCase('latin alternative')).toBe('Latin alternative');
    expect(sentenceCase('lo-fi')).toBe('Lo-fi');
  });
});
