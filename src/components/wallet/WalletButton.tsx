'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { useI18n } from '@/components/i18n/I18nProvider';
import { config, explorer } from '@/lib/config';
import { formatAmount, shortAddress } from '@/lib/format';

import { useWallet } from './WalletProvider';

export function WalletButton() {
  const { state, balance, connect, disconnect, error } = useWallet();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const items = () =>
      Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (e.key === 'Tab') {
        setOpen(false);
        return;
      }
      const list = items();
      if (list.length === 0) return;
      const active = document.activeElement as HTMLElement | null;
      const i = active ? list.indexOf(active) : -1;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        list[(i + 1) % list.length]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        list[(i - 1 + list.length) % list.length]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        list[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        list[list.length - 1]?.focus();
      }
    };
    const raf = requestAnimationFrame(() => items()[0]?.focus());
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (state.status === 'loading') {
    return <span className="btn btn-secondary w-[9.5rem] opacity-40" aria-hidden="true" />;
  }

  if (state.status === 'disconnected') {
    return (
      <div className="relative">
        <button type="button" className="btn btn-primary" onClick={() => void connect()}>
          {t('wallet.connect')}
        </button>
        {error && (
          <p
            role="alert"
            className="absolute right-0 mt-2 w-64 border border-rule bg-paper-raised p-3 text-sm text-danger"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked. The full address is visible in the menu anyway.
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        className="figure flex h-11 items-stretch border border-ink text-sm text-ink"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="hidden items-center border-r border-ink px-3 sm:flex">
          {balance === null ? '...' : formatAmount(balance, { maxFraction: 2 })}
        </span>
        <span className="flex items-center gap-2 px-3">
          <span className="h-1.5 w-1.5 bg-climate" aria-hidden="true" />
          {shortAddress(state.address, 4)}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-72 border border-ink bg-paper-raised text-sm"
        >
          <div className="border-b border-rule p-4">
            <p className="kicker">
              {state.walletName
                ? t('wallet.connectedWith', { name: state.walletName })
                : t('wallet.connected')}{' '}
              ·{' '}
              {config.network}
            </p>
            <p className="figure mt-2 break-all text-[0.8125rem] text-ink">{state.address}</p>
            <p className="mt-3 flex items-baseline justify-between">
              <span className="text-ink-muted">{t('wallet.balance')}</span>
              <span className="figure text-base text-ink">
                {balance === null ? t('wallet.notFunded') : formatAmount(balance, { maxFraction: 4 })}
              </span>
            </p>
            {balance === null && config.network === 'testnet' && (
              <a
                className="link mt-2 inline-block text-[0.8125rem]"
                href={`https://friendbot.stellar.org/?addr=${state.address}`}
                target="_blank"
                rel="noreferrer"
              >
                {t('wallet.friendbot')}
              </a>
            )}
          </div>
          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              className="block w-full px-4 py-2 text-left text-ink hover:bg-paper-sunk"
              onClick={() => void copy()}
            >
              {copied ? t('wallet.addressCopied') : t('wallet.copyAddress')}
            </button>
            <Link
              href={`/donors/${state.address}`}
              role="menuitem"
              className="block px-4 py-2 text-ink hover:bg-paper-sunk"
              onClick={() => setOpen(false)}
            >
              {t('wallet.myGiving')}
            </Link>
            <a
              href={explorer.account(state.address)}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              className="block px-4 py-2 text-ink hover:bg-paper-sunk"
            >
              {t('wallet.viewOnExplorer')}
            </a>
            <button
              type="button"
              role="menuitem"
              className="block w-full border-t border-rule px-4 py-2 text-left text-ink hover:bg-paper-sunk"
              onClick={() => {
                setOpen(false);
                void disconnect();
              }}
            >
              {t('wallet.disconnect')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
