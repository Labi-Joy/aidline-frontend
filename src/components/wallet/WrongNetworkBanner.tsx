'use client';

import { Container } from '@/components/ui/Container';
import { useWallet } from '@/components/wallet/WalletProvider';
import { config } from '@/lib/config';

export function WrongNetworkBanner() {
  const { isWrongNetwork, checkNetwork } = useWallet();

  if (!isWrongNetwork) return null;

  return (
    // #67: the banner was centering inside a `max-w-7xl` wrapper (1280px) while
    // the rest of the header uses `Container` (1200px). On wide screens the
    // text started further left than the logo below. Reusing `Container` keeps
    // both sides aligned, and the `flex-wrap` on the inner row still handles
    // the 360px mobile case.
    <div role="alert" className="border-b border-rule bg-paper-sunk py-3 text-ink">
      <Container className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            Wrong network
          </span>
          <p className="text-ink-soft">
            Your wallet is connected to another network. Aidline expects{' '}
            <span className="font-mono text-ink">{config.network}</span>.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-ink-muted">
            Switch your wallet network to {config.network} to continue.
          </span>
          <button
            type="button"
            onClick={() => void checkNetwork()}
            className="rounded-[2px] border border-rule bg-paper px-2.5 py-1 font-mono text-xs text-ink transition-colors hover:bg-paper-raised"
          >
            Recheck network
          </button>
        </div>
      </Container>
    </div>
  );
}
