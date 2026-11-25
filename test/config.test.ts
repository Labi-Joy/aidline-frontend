import { Networks } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';

describe('config', () => {
  it('uses the official network passphrases', async () => {
    for (const [network, passphrase] of [
      ['testnet', Networks.TESTNET],
      ['mainnet', Networks.PUBLIC],
      ['futurenet', Networks.FUTURENET],
    ] as const) {
      vi.resetModules();
      vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', network);
      const { config } = await import('@/lib/config');
      expect(config.networkPassphrase).toBe(passphrase);
    }
    vi.unstubAllEnvs();
  });

  it('throws on invalid NEXT_PUBLIC_STELLAR_NETWORK', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'invalid-network');
    await expect(() => import('@/lib/config')).rejects.toThrow(
      'Invalid NEXT_PUBLIC_STELLAR_NETWORK: invalid-network',
    );
    vi.unstubAllEnvs();
  });

  it('throws on invalid NEXT_PUBLIC_TOKEN_DECIMALS', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_TOKEN_DECIMALS', 'not-a-number');
    await expect(() => import('@/lib/config')).rejects.toThrow(
      'Invalid NEXT_PUBLIC_TOKEN_DECIMALS: not-a-number',
    );
    vi.unstubAllEnvs();
  });

  it('throws on missing NEXT_PUBLIC_API_URL in production', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    await expect(() => import('@/lib/config')).rejects.toThrow(
      'NEXT_PUBLIC_API_URL is required in production',
    );
    vi.unstubAllEnvs();
  });

  it('throws on missing NEXT_PUBLIC_AIDLINE_CONTRACT_ID in production', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.example.com');
    vi.stubEnv('NEXT_PUBLIC_AIDLINE_CONTRACT_ID', '');
    await expect(() => import('@/lib/config')).rejects.toThrow(
      'NEXT_PUBLIC_AIDLINE_CONTRACT_ID is required in production',
    );
    vi.unstubAllEnvs();
  });

  it('allows missing API_URL and CONTRACT_ID in development', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    vi.stubEnv('NEXT_PUBLIC_AIDLINE_CONTRACT_ID', '');
    const { config } = await import('@/lib/config');
    expect(config.apiUrl).toBe('http://localhost:4000');
    expect(config.contractId).toBe('');
    vi.unstubAllEnvs();
  });
});
