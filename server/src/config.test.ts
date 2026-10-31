import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const codespace = {
  CODESPACE_NAME: 'fluffy-space-xyz',
  GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: 'app.github.dev',
};

describe('loadConfig', () => {
  it('defaults to the local dev origin', () => {
    const config = loadConfig({});
    expect(config.appOrigin).toBe('http://127.0.0.1:5173');
    expect(config.spotify.redirectUri).toBe('http://127.0.0.1:5173/api/auth/callback');
  });

  it('derives the forwarded origin and redirect URI inside a GitHub Codespace', () => {
    const config = loadConfig(codespace);
    expect(config.appOrigin).toBe('https://fluffy-space-xyz-5173.app.github.dev');
    expect(config.spotify.redirectUri).toBe(
      'https://fluffy-space-xyz-5173.app.github.dev/api/auth/callback',
    );
  });

  it('lets explicit APP_ORIGIN / SPOTIFY_REDIRECT_URI win over the Codespace defaults', () => {
    const config = loadConfig({
      ...codespace,
      APP_ORIGIN: 'https://example.test',
      SPOTIFY_REDIRECT_URI: 'https://example.test/cb',
    });
    expect(config.appOrigin).toBe('https://example.test');
    expect(config.spotify.redirectUri).toBe('https://example.test/cb');
  });
});
