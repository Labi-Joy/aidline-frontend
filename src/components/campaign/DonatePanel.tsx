'use client';

import { useCallback, useEffect, useState } from 'react';

import { TxStatus } from '@/components/ui/TxStatus';
import { useWallet } from '@/components/wallet/WalletProvider';
import { api, type CampaignDetail } from '@/lib/api';
import { clearBackedCache } from '@/lib/backed';
import { config } from '@/lib/config';
import {
  isNativeToken,
  reserveShortfall,
  RESERVE_EXPLANATION,
  XLM_SAFE_BALANCE_FLOOR,
} from '@/lib/donationReserve';
import { useFiat } from '@/lib/fiat';
import { amountInput, capAmount, formatAmount, parseAmount, shortAddress } from '@/lib/format';
import { getPledge, tokenAllowance, type Pledge } from '@/lib/stellar/balance';
import { aidline } from '@/lib/stellar/tx';
import { useTx } from '@/lib/useTx';

const PRESETS = ['10', '50', '100'];

function storageKey(campaignId: string, donor: string): string {
  return `aidline:pledges:${campaignId}:${donor}`;
}

function readStoredPledgeIds(campaignId: string, donor: string): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey(campaignId, donor));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function saveStoredPledgeId(campaignId: string, donor: string, pledgeId: string) {
  try {
    const existing = readStoredPledgeIds(campaignId, donor);
    if (!existing.includes(pledgeId)) {
      window.localStorage.setItem(
        storageKey(campaignId, donor),
        JSON.stringify([pledgeId, ...existing]),
      );
    }
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

function pledgeStatusLabel(pledge: Pledge): string {
  if (!pledge.active) {
    return pledge.pulledAmount >= pledge.pledgedAmount ? 'Fulfilled' : 'Cancelled';
  }
  return 'Active';
}

export function DonatePanel({ campaign }: { campaign: CampaignDetail }) {
  const { address, state: wallet, balance, connect, sign, refreshBalance, isWrongNetwork } =
    useWallet();
  const { state, run, reset, busy } = useTx();
  const { formatFiat } = useFiat();
  const [mode, setMode] = useState<'donate' | 'pledge'>('donate');
  const [input, setInput] = useState('50');
  const [lastAmount, setLastAmount] = useState<bigint>(0n);
  const [lastAction, setLastAction] = useState<'donate' | 'approve' | 'pledge' | 'cancel'>(
    'donate',
  );
  const [allowance, setAllowance] = useState<bigint | null>(null);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [lookupId, setLookupId] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);

  const loadDonorPledgeState = useCallback(async () => {
    if (!address) {
      setAllowance(null);
      setPledges([]);
      return;
    }
    const [allow, ids] = await Promise.all([
      config.contractId ? tokenAllowance(address, config.contractId).catch(() => null) : null,
      Promise.resolve(readStoredPledgeIds(campaign.id, address)),
    ]);
    setAllowance(allow);
    if (ids.length === 0) {
      setPledges([]);
      return;
    }
    const loaded = await Promise.all(ids.map((id) => getPledge(id).catch(() => null)));
    setPledges(
      loaded.filter(
        (p): p is Pledge => p !== null && p.campaignId === campaign.id && p.donor === address,
      ),
    );
  }, [address, campaign.id]);

  useEffect(() => {
    void loadDonorPledgeState();
  }, [loadDonorPledgeState]);

  const remaining = BigInt(campaign.goal) - BigInt(campaign.raised);
  const nativeToken = isNativeToken();
  // Native XLM keeps a reserve, so only the spendable part may be donated.
  const spendable =
    balance === null ? null : nativeToken ? balance - XLM_SAFE_BALANCE_FLOOR : balance;
  const rest = capAmount(remaining, spendable !== null && spendable > 0n ? spendable : 0n);
  const restInput = amountInput(rest);
  const restLabel = formatAmount(rest, { maxFraction: config.tokenDecimals });
  const amount = parseAmount(input);
  const fiatEstimate = amount ? formatFiat(amount) : null;

  const baseInvalid =
    amount === null
      ? 'Enter an amount like 25 or 12.5'
      : amount <= 0n
        ? 'Enter an amount greater than zero'
        : mode === 'donate' && amount > remaining
          ? `Only ${formatAmount(remaining)} is still needed`
          : mode === 'donate' && balance !== null && amount > balance
            ? `Your wallet holds ${formatAmount(balance)}`
            : null;

  const reserveGap =
    baseInvalid === null && mode === 'donate' && amount !== null
      ? reserveShortfall(amount, balance, { native: nativeToken })
      : null;

  const invalid =
    baseInvalid ??
    (reserveGap !== null
      ? `Keep at least ${formatAmount(XLM_SAFE_BALANCE_FLOOR)} ${config.tokenSymbol} for the reserve and fees`
      : null);

  const needsAllowance =
    mode === 'pledge' && amount !== null && !invalid && allowance !== null && allowance < amount;

  if (remaining <= 0n) {
    return (
      <div className="space-y-6">
        <p className="text-[0.9375rem]">
          This campaign is fully funded. The rest of its funds are released as milestones are
          verified.
        </p>
        {pledges.length > 0 && (
          <PledgeSummary
            pledges={pledges}
            busy={busy}
            onCancel={async (pledgeId) => {
              if (!address) return;
              setLastAction('cancel');
              const res = await run((on) => aidline.cancelPledge(address, pledgeId, sign, on));
              if (res) await loadDonorPledgeState();
            }}
          />
        )}
      </div>
    );
  }

  const donate = async () => {
    if (!address || amount === null || invalid) return;
    setLastAction('donate');
    setLastAmount(amount);
    const before = BigInt(campaign.raised);
    await run(
      (on) => aidline.donate(address, campaign.id, amount, sign, on),
      async () => BigInt((await api.campaign(campaign.id)).raised) > before,
    );
    refreshBalance();
    // So the campaign cards mark this one as backed the next time they load.
    clearBackedCache(address);
  };

  const approveForPledge = async () => {
    if (!address || amount === null || invalid) return;
    setLastAction('approve');
    setLastAmount(amount);
    const res = await run((on) => aidline.approveToken(address, amount, sign, on));
    if (res) await loadDonorPledgeState();
  };

  const createPledge = async () => {
    if (!address || amount === null || invalid) return;
    setLastAction('pledge');
    setLastAmount(amount);
    const res = await run((on) => aidline.createPledge(address, campaign.id, amount, sign, on));
    if (res) {
      if (res.value !== undefined && res.value !== null) {
        saveStoredPledgeId(campaign.id, address, String(res.value));
      }
      await loadDonorPledgeState();
    }
  };

  const handleLookup = async () => {
    if (!address) return;
    const trimmed = lookupId.trim();
    if (!/^\d+$/.test(trimmed)) {
      setLookupError('Enter a numeric pledge ID.');
      return;
    }
    setLookupError(null);
    const found = await getPledge(trimmed).catch(() => null);
    if (!found || found.campaignId !== campaign.id || found.donor !== address) {
      setLookupError('No pledge with that ID was found for your wallet on this campaign.');
      return;
    }
    saveStoredPledgeId(campaign.id, address, found.pledgeId);
    setLookupId('');
    await loadDonorPledgeState();
  };

  const successMessage =
    lastAction === 'donate'
      ? `Thank you. ${formatAmount(lastAmount)} is now in escrow for this campaign.`
      : lastAction === 'approve'
        ? `Allowance approved for ${formatAmount(lastAmount)}. You can now create your pledge.`
        : lastAction === 'pledge'
          ? `Pledge of ${formatAmount(lastAmount)} created. Funds will be pulled as milestones are verified.`
          : 'Pledge cancelled.';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 border border-rule">
        <button
          type="button"
          className={`py-2 text-sm font-medium ${mode === 'donate' ? 'bg-ink text-paper' : 'bg-paper text-ink-muted hover:text-ink'}`}
          onClick={() => {
            setMode('donate');
            reset();
          }}
          disabled={busy}
        >
          Donate now
        </button>
        <button
          type="button"
          className={`border-l border-rule py-2 text-sm font-medium ${mode === 'pledge' ? 'bg-ink text-paper' : 'bg-paper text-ink-muted hover:text-ink'}`}
          onClick={() => {
            setMode('pledge');
            reset();
          }}
          disabled={busy}
        >
          Pledge
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (mode === 'donate') {
            void donate();
          } else if (needsAllowance) {
            void approveForPledge();
          } else {
            void createPledge();
          }
        }}
      >
        <div className="flex items-center justify-between">
          <label htmlFor="amount" className="label">
            {mode === 'donate' ? 'Amount' : 'Pledged amount'}
          </label>
          {fiatEstimate && (
            <span className="figure font-mono text-xs text-ink-muted">{fiatEstimate}</span>
          )}
        </div>
        <div className="flex">
          <input
            id="amount"
            inputMode="decimal"
            autoComplete="off"
            className="field figure rounded-r-none text-lg"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-invalid={Boolean(invalid)}
            aria-describedby="amount-hint"
            disabled={busy}
          />
          <span className="figure flex items-center border border-l-0 border-rule bg-paper-sunk px-3 text-ink-muted">
            {config.tokenSymbol}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className={`figure border px-3 py-1 text-[0.8125rem] ${input === p ? 'border-ink text-ink' : 'border-rule text-ink-soft hover:border-ink'}`}
              onClick={() => setInput(p)}
              disabled={busy}
            >
              {p}
            </button>
          ))}
          {mode === 'donate' && (
            <button
              type="button"
              className={`figure border px-3 py-1 text-[0.8125rem] ${input === restInput ? 'border-ink text-ink' : 'border-rule text-ink-soft hover:border-ink'}`}
              onClick={() => setInput(restInput)}
              disabled={busy}
            >
              Give the rest ({restLabel})
            </button>
          )}
        </div>
        <p id="amount-hint" className={`hint ${invalid && input ? 'text-danger' : ''}`}>
          {invalid && input
            ? invalid
            : mode === 'donate'
              ? `Held in escrow until a verifier confirms each milestone. Up to ${formatAmount(remaining)} still needed.${nativeToken ? ` ${RESERVE_EXPLANATION}` : ''}`
              : 'Total amount you commit to this campaign. Tokens stay in your wallet and are pulled proportionally when milestones are approved.'}
        </p>

        {mode === 'pledge' && (
          <dl className="mt-4 space-y-2 border-y border-rule py-3 text-xs text-ink-muted">
            <div className="flex justify-between gap-2">
              <dt>Donor wallet</dt>
              <dd className="figure text-ink">
                {address ? shortAddress(address, 5) : 'Connect wallet'}
              </dd>
            </div>
            <p className="text-[0.75rem]">
              Authorizes the pledge and keeps the approved token allowance ready.
            </p>
            <div className="flex justify-between gap-2 pt-1">
              <dt>Campaign ID</dt>
              <dd className="figure text-ink">#{campaign.id}</dd>
            </div>
            <p className="text-[0.75rem]">
              The campaign that receives funds from your pledge as milestones are verified.
            </p>
            {allowance !== null && (
              <div className="flex justify-between gap-2 pt-1">
                <dt>Current token allowance</dt>
                <dd className="figure text-ink">{formatAmount(allowance)}</dd>
              </div>
            )}
          </dl>
        )}

        {wallet.status === 'connected' ? (
          mode === 'donate' ? (
            <button
              type="submit"
              className="btn btn-primary mt-5 w-full"
              disabled={busy || Boolean(invalid) || isWrongNetwork}
            >
              {amount && !invalid
                ? `Donate ${formatAmount(amount)}${fiatEstimate ? ` (${fiatEstimate})` : ''}`
                : 'Donate'}
            </button>
          ) : needsAllowance ? (
            <button
              type="submit"
              className="btn btn-primary mt-5 w-full"
              disabled={busy || Boolean(invalid) || isWrongNetwork}
            >
              {amount ? `Approve ${formatAmount(amount)} allowance` : 'Approve allowance'}
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn-primary mt-5 w-full"
              disabled={busy || Boolean(invalid) || isWrongNetwork}
            >
              {amount && !invalid ? `Create pledge (${formatAmount(amount)})` : 'Create pledge'}
            </button>
          )
        ) : (
          <button
            type="button"
            className="btn btn-primary mt-5 w-full"
            onClick={() => void connect()}
          >
            {mode === 'donate' ? 'Connect wallet to donate' : 'Connect wallet to pledge'}
          </button>
        )}

        {wallet.status === 'connected' && isWrongNetwork && (
          <p className="mt-2 text-xs text-danger" role="status">
            Switch your wallet to {config.network} to continue.
          </p>
        )}

        <TxStatus state={state} success={successMessage} />
      </form>

      {wallet.status === 'connected' && address && (
        <div className="space-y-3 border-t border-rule pt-4">
          {pledges.length > 0 && (
            <PledgeSummary
              pledges={pledges}
              busy={busy}
              onCancel={async (pledgeId) => {
                setLastAction('cancel');
                const res = await run((on) => aidline.cancelPledge(address, pledgeId, sign, on));
                if (res) await loadDonorPledgeState();
              }}
            />
          )}

          {mode === 'pledge' && (
            <div className="space-y-2">
              <label htmlFor="pledge-lookup" className="text-xs text-ink-muted">
                Have an existing pledge ID?
              </label>
              <div className="flex gap-2">
                <input
                  id="pledge-lookup"
                  inputMode="numeric"
                  placeholder="Pledge ID (e.g. 1)"
                  className="field figure py-1.5 text-sm"
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                  disabled={busy}
                />
                <button
                  type="button"
                  className="btn py-1.5 text-sm"
                  onClick={() => void handleLookup()}
                  disabled={busy || !lookupId.trim()}
                >
                  Check
                </button>
              </div>
              {lookupError && <p className="text-xs text-danger">{lookupError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PledgeSummary({
  pledges,
  busy,
  onCancel,
}: {
  pledges: Pledge[];
  busy: boolean;
  onCancel: (pledgeId: string) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <p className="kicker">Your pledges</p>
      <ul className="space-y-3">
        {pledges.map((p) => {
          const remaining = p.pledgedAmount - p.pulledAmount;
          const status = pledgeStatusLabel(p);
          return (
            <li key={p.pledgeId} className="border border-rule p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="figure font-medium text-ink">Pledge #{p.pledgeId}</span>
                <span className="kicker text-ink-muted">{status}</span>
              </div>
              <dl className="mt-2 space-y-1 text-xs text-ink-muted">
                <div className="flex justify-between">
                  <dt>Pledged</dt>
                  <dd className="figure text-ink">{formatAmount(p.pledgedAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Pulled so far</dt>
                  <dd className="figure text-ink">{formatAmount(p.pulledAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Remaining</dt>
                  <dd className="figure text-ink">
                    {formatAmount(remaining > 0n ? remaining : 0n)}
                  </dd>
                </div>
              </dl>
              {p.active && remaining > 0n && (
                <button
                  type="button"
                  className="mt-3 text-xs text-ink-muted underline hover:text-ink"
                  disabled={busy}
                  onClick={() => void onCancel(p.pledgeId)}
                >
                  Cancel pledge
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
