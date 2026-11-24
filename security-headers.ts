import { config } from './src/lib/config';

/**
 * Response headers set on every page. `/embed/*` is the one place the site is meant to be framed
 * by other sites, so it is left out of the framing rule and everything else refuses to be framed.
 */
export interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

function toOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

const connectOrigins = Array.from(
  new Set(
    [
      "'self'",
      toOrigin(config.apiUrl),
      toOrigin(config.rpcUrl),
      'https://api.coingecko.com',
    ].filter((origin): origin is string => Boolean(origin)),
  ),
);

/**
 * Content Security Policy deployed in Report-Only mode first so violations can be observed in
 * browser reports without breaking live traffic before switching to `Content-Security-Policy`.
 *
 * Directives:
 * - default-src 'self': Fallback restricting all unlisted resource types to the site's own origin.
 * - script-src 'self' 'unsafe-inline' (+ 'unsafe-eval' in dev): Allows Next.js bundles, the
 *   beforeInteractive theme-init script, JSON-LD metadata, and dev-mode React Fast Refresh.
 * - style-src 'self' 'unsafe-inline': Allows Tailwind/Next.js styles and runtime styles injected
 *   by the Stellar Wallets Kit modal.
 * - img-src 'self' data: blob: https:: Allows local assets, inline/blob wallet icons, and
 *   campaign/proof images hosted on external HTTPS origins.
 * - font-src 'self' data:: Allows self-hosted Newsreader and IBM Plex fonts plus data-URI fonts.
 * - connect-src: Restricts fetch/XHR/WebSocket calls to same-origin, the configured Aidline API,
 *   the configured Soroban RPC, and CoinGecko for fiat price conversion.
 * - frame-src 'self': Allows same-origin subframes while blocking arbitrary third-party embeds.
 * - object-src 'none': Disables legacy plugin elements (<object>, <embed>, <applet>).
 * - base-uri 'self': Prevents <base> tag injection from rewriting relative script/link URLs.
 * - form-action 'self': Restricts HTML form submissions to the site's own origin.
 * - worker-src 'self': Allows the same-origin service worker (/sw.js).
 * - manifest-src 'self': Allows the same-origin web app manifest (/manifest.webmanifest).
 *
 * Note: `frame-ancestors` is intentionally omitted here because `/embed/*` routes are meant to be
 * framed by third-party sites; framing is controlled via `X-Frame-Options: DENY` on `/((?!embed).*)`.
 */
export const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${connectOrigins.join(' ')}`,
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
].join('; ');

export const securityHeaders: HeaderRule[] = [
  {
    source: '/:path*',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy },
    ],
  },
  {
    source: '/((?!embed).*)',
    headers: [{ key: 'X-Frame-Options', value: 'DENY' }],
  },
];
