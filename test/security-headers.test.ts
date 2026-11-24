import { describe, expect, it } from 'vitest';

import { securityHeaders } from '../security-headers';
import { config } from '../src/lib/config';

const rule = (source: string) => securityHeaders.find((r) => r.source === source);
const names = (source: string) => rule(source)?.headers.map((h) => h.key) ?? [];
const headerValue = (source: string, key: string) =>
  rule(source)?.headers.find((h) => h.key === key)?.value;

describe('securityHeaders', () => {
  it('applies the baseline headers to every route', () => {
    expect(names('/:path*')).toEqual(
      expect.arrayContaining([
        'X-Content-Type-Options',
        'Referrer-Policy',
        'Permissions-Policy',
        'Strict-Transport-Security',
        'Content-Security-Policy-Report-Only',
      ]),
    );
  });

  it('refuses framing everywhere except the embed routes', () => {
    const framing = rule('/((?!embed).*)');
    expect(framing?.headers).toEqual([{ key: 'X-Frame-Options', value: 'DENY' }]);

    const matches = (path: string) => new RegExp(`^${framing!.source}$`).test(path);
    expect(matches('/campaigns/1')).toBe(true);
    expect(matches('/embed/campaigns/1')).toBe(false);
  });

  it('never sets X-Frame-Options in the all-routes rule, which would break embeds', () => {
    expect(names('/:path*')).not.toContain('X-Frame-Options');
  });

  it('turns off camera, microphone and location', () => {
    const value = headerValue('/:path*', 'Permissions-Policy');
    expect(value).toContain('camera=()');
    expect(value).toContain('microphone=()');
    expect(value).toContain('geolocation=()');
  });

  it('sets a report-only Content-Security-Policy with configured connect-src origins', () => {
    const csp = headerValue('/:path*', 'Content-Security-Policy-Report-Only');
    expect(csp).toBeDefined();

    const directives = new Map(
      csp!.split('; ').map((entry) => {
        const [name, ...values] = entry.split(' ');
        return [name, values];
      }),
    );

    expect(directives.get('default-src')).toEqual(["'self'"]);
    expect(directives.get('object-src')).toEqual(["'none'"]);
    expect(directives.get('base-uri')).toEqual(["'self'"]);
    expect(directives.get('form-action')).toEqual(["'self'"]);
    expect(directives.get('worker-src')).toEqual(["'self'"]);
    expect(directives.get('img-src')).toEqual(expect.arrayContaining(["'self'", 'https:']));
    expect(directives.has('frame-ancestors')).toBe(false);

    const connectSrc = directives.get('connect-src') ?? [];
    expect(connectSrc).toEqual([
      "'self'",
      new URL(config.apiUrl).origin,
      new URL(config.rpcUrl).origin,
      'https://api.coingecko.com',
    ]);
  });
});
