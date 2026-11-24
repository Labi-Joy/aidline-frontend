import type { Metadata } from 'next';
import Form from 'next/form';
import Link from 'next/link';

import { CampaignCard } from '@/components/campaign/CampaignCard';
import { Container } from '@/components/ui/Container';
import { Notice } from '@/components/ui/Notice';
import { api, type Campaign, type CampaignKind, type CampaignStatus } from '@/lib/api';
import { safe } from '@/lib/safe';

export const metadata: Metadata = {
  title: 'Campaigns',
  // Filtered views (?kind=…) canonicalise to the list itself.
  alternates: { canonical: '/campaigns' },
};

const KINDS: { value?: CampaignKind; label: string }[] = [
  { label: 'All' },
  { value: 'emergency', label: 'Emergency relief' },
  { value: 'climate', label: 'Climate action' },
];

const STATUSES: { value?: CampaignStatus; label: string }[] = [
  { value: 'active', label: 'Open' },
  { value: 'completed', label: 'Fully released' },
  { value: 'expired', label: 'Ended' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAGE_SIZE = 12;

export default async function CampaignsPage(props: PageProps<'/campaigns'>) {
  const sp = await props.searchParams;
  const kind = KINDS.find((k) => k.value === sp.kind)?.value;
  const status = STATUSES.find((s) => s.value === sp.status)?.value ?? 'active';
  const page = Math.max(1, Number(sp.page) || 1);
  const q = typeof sp.q === 'string' && sp.q.trim() !== '' ? sp.q.trim() : undefined;

  const result = await safe(() =>
    api.campaigns({ kind, status, q, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  );

  let items: Campaign[] = result?.items ?? [];
  let total = result?.total ?? 0;

  // Filter client-side if query provided and backend has not yet implemented q filtering
  if (q && result) {
    const term = q.toLowerCase();
    const filtered = items.filter((c) => {
      const m = c.metadata;
      return Boolean(
        m?.title?.toLowerCase().includes(term) ||
          m?.summary?.toLowerCase().includes(term) ||
          m?.location?.toLowerCase().includes(term) ||
          m?.organizer?.toLowerCase().includes(term) ||
          c.location?.toLowerCase().includes(term),
      );
    });

    if (
      filtered.length < items.length ||
      (items.length > 0 &&
        !items.some((c) => {
          const m = c.metadata;
          return Boolean(
            m?.title?.toLowerCase().includes(term) ||
              m?.summary?.toLowerCase().includes(term) ||
              m?.location?.toLowerCase().includes(term) ||
              m?.organizer?.toLowerCase().includes(term) ||
              c.location?.toLowerCase().includes(term),
          );
        }))
    ) {
      items = filtered;
      total = filtered.length;
    }
  }

  const href = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { kind, status, q, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    return `/campaigns?${params.toString()}`;
  };

  return (
    <Container className="pt-12">
      <p className="kicker">Campaigns</p>
      <h1 className="mt-3 text-[2.75rem]">Every campaign, every payout, in the open</h1>

      <div className="mt-10 flex flex-col gap-4 border-y border-rule py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-6">
          <nav aria-label="Campaign type" className="flex flex-wrap gap-x-6 gap-y-2 text-[0.9375rem]">
            {KINDS.map((k) => (
              <Link
                key={k.label}
                href={href({ kind: k.value, page: undefined })}
                aria-current={kind === k.value ? 'page' : undefined}
                className={
                  kind === k.value
                    ? 'text-ink underline decoration-ink underline-offset-[6px]'
                    : 'text-ink-soft hover:text-ink'
                }
              >
                {k.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Campaign status" className="flex flex-wrap gap-2 text-sm">
            {STATUSES.map((s) => (
              <Link
                key={s.label}
                href={href({ status: s.value, page: undefined })}
                aria-current={status === s.value ? 'page' : undefined}
                className={`border px-3 py-1 ${status === s.value ? 'border-ink text-ink' : 'border-rule text-ink-soft hover:border-ink'}`}
              >
                {s.label}
              </Link>
            ))}
          </nav>
        </div>

        <Form action="/campaigns" role="search" className="flex items-center gap-2">
          <label htmlFor="campaign-search" className="sr-only">
            Search campaigns
          </label>
          <input
            id="campaign-search"
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search campaigns…"
            className="field h-9 w-full text-sm sm:w-64"
          />
          {kind && <input type="hidden" name="kind" value={kind} />}
          {status && status !== 'active' && <input type="hidden" name="status" value={status} />}
          <button type="submit" className="btn btn-secondary h-9 px-3 text-sm">
            Search
          </button>
          {q && (
            <Link
              href={href({ q: undefined, page: undefined })}
              className="link text-sm whitespace-nowrap"
            >
              Clear
            </Link>
          )}
        </Form>
      </div>

      {!result ? (
        <div className="mt-10">
          <Notice title="Campaigns could not be loaded" tone="danger">
            The Aidline API is not responding. Try again in a moment.
          </Notice>
        </div>
      ) : items.length === 0 ? (
        <p className="mt-12 text-ink-muted">
          {q ? `No campaigns found for “${q}”.` : 'No campaigns match these filters.'}{' '}
          <Link href={q ? href({ q: undefined, page: undefined }) : '/start'} className="link">
            {q ? 'Clear search' : 'Start one'}
          </Link>
          .
        </p>
      ) : (
        <>
          <p className="figure mt-6 text-sm text-ink-muted">
            {total} campaign{total === 1 ? '' : 's'}
          </p>
          <div className="mt-6 grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
          {total > PAGE_SIZE && (
            <nav
              aria-label="Pagination"
              className="mt-14 flex items-center justify-between border-t border-rule pt-5 text-[0.9375rem]"
            >
              {page > 1 ? (
                <Link className="link" href={href({ page: String(page - 1) })}>
                  Newer
                </Link>
              ) : (
                <span />
              )}
              {/* #137: Show page number and total */}
              <span className="text-ink-muted">
                Page {page} of {Math.ceil(total / PAGE_SIZE)}
              </span>
              {page * PAGE_SIZE < total ? (
                <Link className="link" href={href({ page: String(page + 1) })}>
                  Older
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </Container>
  );
}
