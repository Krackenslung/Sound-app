import { Router } from 'express';
import type { AppConfig } from '../config.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { idParam, intParam } from '../middleware/validate.js';
import { createSpotifyClient } from '../spotify/spotifyClient.js';
import { toAlbum, toAlbumSummary, toArtist } from '../spotify/mappers.js';
import type {
  SpotifyAlbumFull,
  SpotifyArtist,
  SpotifyPaging,
  SpotifyTrack,
} from '../spotify/types.js';

const ALBUM_TRACKS_PAGE = 50;
const MAX_ALBUM_TRACKS = 200;
const ARTIST_ALBUMS_PAGE = 10;

/** Single-item catalog lookups. Batch endpoints (`/albums?ids=` etc.) are forbidden for this app. */
export function createCatalogRouter(config: AppConfig) {
  const router = Router();

  router.get('/albums/:id', requireAuth, async (req, res, next) => {
    try {
      const id = idParam(req.params.id);
      const client = createSpotifyClient(req, config);
      const album = await client.request<SpotifyAlbumFull>(`/albums/${id}`);
      const tracks = [...(album.tracks?.items ?? [])];
      let nextUrl = album.tracks?.next;
      // Long albums: follow pagination up to a sane cap.
      while (nextUrl && tracks.length < MAX_ALBUM_TRACKS) {
        const page = await client.request<SpotifyPaging<Omit<SpotifyTrack, 'album'>>>(
          `/albums/${id}/tracks?limit=${ALBUM_TRACKS_PAGE}&offset=${tracks.length}`,
        );
        tracks.push(...page.items);
        nextUrl = page.next;
      }
      res.json(toAlbum(album, tracks));
    } catch (err) {
      next(err);
    }
  });

  router.get('/artists/:id', requireAuth, async (req, res, next) => {
    try {
      const id = idParam(req.params.id);
      const artist = await createSpotifyClient(req, config).request<SpotifyArtist>(
        `/artists/${id}`,
      );
      res.json(toArtist(artist));
    } catch (err) {
      next(err);
    }
  });

  router.get('/artists/:id/albums', requireAuth, async (req, res, next) => {
    try {
      const id = idParam(req.params.id);
      const offset = intParam(req.query.offset, { name: 'offset', min: 0, max: 1000, fallback: 0 });
      const params = new URLSearchParams({
        include_groups: 'album,single',
        limit: String(ARTIST_ALBUMS_PAGE),
        offset: String(offset),
      });
      const page = await createSpotifyClient(req, config).request<SpotifyPaging<SpotifyAlbumFull>>(
        `/artists/${id}/albums?${params}`,
      );
      res.json({
        items: page.items.map(toAlbumSummary),
        offset,
        total: page.total ?? null,
        nextOffset: page.next ? offset + ARTIST_ALBUMS_PAGE : null,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
