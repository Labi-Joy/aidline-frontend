const VALID_NETWORKS = ['testnet', 'mainnet', 'futurenet'] as const;

const networkRaw = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';
if (!VALID_NETWORKS.includes(networkRaw as any)) {
  throw new Error(
    `Invalid NEXT_PUBLIC_STELLAR_NETWORK: ${networkRaw}. Must be one of: ${VALID_NETWORKS.join(', ')}`,
  );
}
const network = networkRaw as 'testnet' | 'mainnet' | 'futurenet';

// Written out rather than imported from @stellar/stellar-sdk: config is used by
// every page, and importing the SDK here put the whole SDK in every bundle.
const passphrases = {
  testnet: 'Test SDF Network ; September 2015',
  mainnet: 'Public Global Stellar Network ; September 2015',
  futurenet: 'Test SDF Future Network ; October 2022',
};

const tokenDecimalsRaw = Number(process.env.NEXT_PUBLIC_TOKEN_DECIMALS ?? 7);
if (isNaN(tokenDecimalsRaw)) {
  throw new Error(
    `Invalid NEXT_PUBLIC_TOKEN_DECIMALS: ${process.env.NEXT_PUBLIC_TOKEN_DECIMALS}. Must be a valid number.`,
  );
}

const isProduction = process.env.NODE_ENV === 'production';
const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
const contractId = process.env.NEXT_PUBLIC_AIDLINE_CONTRACT_ID ?? '';

if (isProduction && !apiUrl) {
  throw new Error('NEXT_PUBLIC_API_URL is required in production.');
}
if (isProduction && !contractId) {
  throw new Error('NEXT_PUBLIC_AIDLINE_CONTRACT_ID is required in production.');
}

// NEXT_PUBLIC_* values are inlined at build time, so each one must be read
// with its full literal name.
export const config = {
  apiUrl,
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aidline-frontend.vercel.app').replace(
    /\/$/,
    '',
  ),
  network,
  networkPassphrase: passphrases[network],
  rpcUrl: process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org',
  contractId,
  tokenId: process.env.NEXT_PUBLIC_AIDLINE_TOKEN_ID ?? '',
  tokenSymbol: process.env.NEXT_PUBLIC_TOKEN_SYMBOL ?? 'XLM',
  tokenDecimals: tokenDecimalsRaw,
  adminAddress: process.env.NEXT_PUBLIC_ADMIN_ADDRESS ?? '',
};

export const explorer = {
  tx: (hash: string) => `https://stellar.expert/explorer/${network}/tx/${hash}`,
  account: (address: string) => `https://stellar.expert/explorer/${network}/account/${address}`,
  contract: (id: string) => `https://stellar.expert/explorer/${network}/contract/${id}`,
};
