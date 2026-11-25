'use client';

import { useEffect, useState } from 'react';

import { TxStatus } from '@/components/ui/TxStatus';
import { useWallet } from '@/components/wallet/WalletProvider';
import { api, donorPosition, type CampaignDetail } from '@/lib/api';
import { config } from '@/lib/config';
import { formatAmount } from '@/lib/format';
import { refundEstimate } from '@/lib/refund';
import { contributionOf } from '@/lib/stellar/balance';
import { aidline } from '@/lib/stellar/tx';
import { useTx } from '@/lib/useTx';

interface Position {
  given: bigint;
  refunded: bigint;
  estimate: bigint;
  fromContract: boolean;
}

interface Lookup {
  key: string;
  position: Position | null;
  error: boolean;
}

/** Shown on cancelled or expired campaigns so donors can reclaim unspent funds. */
export function RefundPanel({ campaign }: { campaign: CampaignDetail }) {
  const { address, sign, isWrongNetwork } = useWallet();
  const { state, run, busy } = useTx();
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [retry, setRetry] = useState(0);
  const phaseKey = JSON.stringify(state.phase);
  const lookupKey = `${address ?? ''}:${campaign.id}:${phaseKey}:${retry}`;

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    const load = async () => {
      const history = await api.donor(address);
      if (cancelled) return;
      const indexed = donorPosition(history, campaign.id);
      const contractGiven = await contributionOf(campaign.id, address).catch(() => null);
      if (cancelled) return;
      const given = contractGiven ?? indexed.given;
      setLookup({
        key: lookupKey,
        position: {
          given,
          refunded: indexed.refunded,
          estimate: refundEstimate(given, BigInt(campaign.raised), BigInt(campaign.released)),
          fromContract: contractGiven !== null,
        },
        error: false,
      });
    };

    load().catch(() => {
      if (!cancelled) setLookup({ key: lookupKey, position: null, error: true });
    });
    return () => {
      cancelled = true;
    };
  }, [address, campaign.id, campaign.raised, campaign.released, lookupKey]);

  const reason =
    campaign.status === 'cancelled'
      ? 'This campaign was cancelled.'
      : 'This campaign ended before every milestone was verified.';

  const unknown = (
    <p className="text-[0.9375rem]">
      {reason} Donors can reclaim their share of the funds that were never released.
      {!address && ' Connect the wallet you donated with to check yours.'}
    </p>
  );

  if (!address) return unknown;

  const current = lookup?.key === lookupKey ? lookup : null;
  if (current?.error) {
    return (
      <div>
        <p role="alert" className="text-[0.9375rem] text-danger">
          The refund amount could not be loaded.
        </p>
        <button
          type="button"
          className="btn btn-secondary mt-4"
          onClick={() => setRetry((n) => n + 1)}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!current?.position) return unknown;
  const position = current.position;

  if (position.refunded > 0n) {
    return (
      <p className="text-[0.9375rem]">
        {reason} You reclaimed{' '}
        <span className="figure text-ink">{formatAmount(position.refunded)}</span>.
      </p>
    );
  }

  if (position.given === 0n) return unknown;

  return (
    <div>
      <p className="text-[0.9375rem]">
        {reason} You gave <span className="figure text-ink">{formatAmount(position.given)}</span>.
        Your {position.fromContract ? '' : 'estimated '}share of what was never released is{' '}
        <span className="figure text-ink">{formatAmount(position.estimate)}</span>.
      </p>
      {!position.fromContract && (
        <p className="hint">
          Estimate based on the indexer because the contract contribution could not be read.
        </p>
      )}
      <button
        type="button"
        className="btn btn-primary mt-5 w-full"
        disabled={busy || position.estimate === 0n || isWrongNetwork}
        onClick={() =>
          void run(
            (on) => aidline.refund(address, campaign.id, sign, on),
            async () => {
              const h = await api.donor(address);
              return h.refunds.some((r) => r.campaignId === campaign.id);
            },
          )
        }
      >
        Reclaim{position.fromContract ? '' : ' estimated'} {formatAmount(position.estimate)}
      </button>
      {isWrongNetwork && (
        <p className="mt-2 text-xs text-danger" role="status">
          Switch your wallet to {config.network} to continue.
        </p>
      )}
      <TxStatus state={state} success="Your unspent share has been returned to your wallet." />
    </div>
  );
}
