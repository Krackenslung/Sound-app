import { isTrackSaved } from './library';
import { json } from '@/test/renderApp';

describe('isTrackSaved', () => {
  it('batches concurrent lookups into a single request', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const uris = decodeURIComponent(url.split('uris=')[1]).split(',');
      return json(Object.fromEntries(uris.map((u) => [u, u.endsWith('a')])));
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await Promise.all([
      isTrackSaved('spotify:track:a'),
      isTrackSaved('spotify:track:b'),
      isTrackSaved('spotify:track:a'),
    ]);
    expect(results).toEqual([true, false, true]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `/api/library/contains?uris=${encodeURIComponent('spotify:track:a,spotify:track:b')}`,
    );
  });

  it('rejects every waiter when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ code: 'INTERNAL', message: 'x' }, 500)),
    );
    await expect(isTrackSaved('spotify:track:z')).rejects.toMatchObject({ status: 500 });
  });
});
