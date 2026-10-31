# Demo-mode fixtures

Sample data served by the client in demo mode (`client/src/features/demo`). Names are the invented
ones from the Figma file — none of this is real Spotify data, and no image URLs are included (the UI
falls back to placeholder gradients).

- `me.json` — the demo user
- `catalog.json` — artists, albums and tracks (the "Spotify catalog" for search, album and artist pages)
- `library.json` — liked songs (`daysAgo`), saved albums, playlists, recently played (`minutesAgo`), top tracks/artists per time range
- `devices.json` — devices for the device picker

Relative times (`daysAgo`, `minutesAgo`) are resolved when demo mode starts so the data always looks fresh.
