import Link from 'next/link';

import type { Release } from '@/lib/api';
import { formatAmount, formatDate, formatRelativeTime } from '@/lib/format';
import { Notice } from '@/components/ui/Notice';
import { TxLink } from '@/components/ui/TxLink';

import { KIND } from './kind';
import { VerificationStamp } from './VerificationStamp';

/** `releases` is null when the request failed, which is not the same as an empty list. */
export function ReleaseFeed({ releases }: { releases: Release[] | null }) {
  if (releases === null) {
    return (
      <Notice title="Releases are unavailable">
        The Aidline API could not be reached. Verified releases will show again once it is back.
      </Notice>
    );
  }
  if (releases.length === 0) {
    return (
      <p className="border-y border-rule py-8 text-ink-muted">
        No milestones have been verified yet. The first release will appear here with its proof.
      </p>
    );
  }
  return (
    <ol className="border-t border-rule">
      {releases.map((r) => {
        const imageFiles = r.proof?.files.filter((f) => f.type.startsWith('image/')) ?? [];
        const image = imageFiles[0];
        return (
          <li
            key={`${r.campaignId}-${r.index}`}
            className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3 border-b border-rule py-5 md:grid-cols-[7rem_1fr_auto_auto]"
          >
            <p
              title={formatDate(r.releasedAt)}
              className="figure col-start-1 row-start-1 text-[0.8125rem] text-ink-muted md:col-auto md:row-auto md:pt-1"
            >
              <time
                dateTime={
                  typeof r.releasedAt === 'string'
                    ? r.releasedAt
                    : new Date(r.releasedAt).toISOString()
                }
              >
                {formatRelativeTime(r.releasedAt)}
              </time>
            </p>
            <div className="col-span-2 md:col-span-1">
              <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em]">
                <span className={KIND[r.kind].text}>{KIND[r.kind].short}</span>
                {r.location && <span className="text-ink-muted"> / {r.location}</span>}
              </p>
              <Link
                href={`/campaigns/${r.campaignId}`}
                className="mt-1 block font-serif text-lg text-ink hover:underline"
              >
                {r.campaignTitle ?? `Campaign #${r.campaignId}`}
              </Link>
              {r.proof?.note && (
                <p className="mt-1 text-[0.9375rem]">&ldquo;{r.proof.note}&rdquo;</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <VerificationStamp
                  verifier={r.verifier}
                  verifierName={r.verifierName}
                  date={r.releasedAt}
                />
                <TxLink hash={r.txHash} />
              </div>
            </div>
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.url}
                alt={`Proof photo 1 of ${imageFiles.length} for milestone ${r.index + 1}`}
                loading="lazy"
                className="hidden h-20 w-28 object-cover md:block"
              />
            ) : (
              <span className="hidden md:block" />
            )}
            <p className="figure col-start-2 row-start-1 text-right text-ink md:col-auto md:row-auto md:pt-1">
              {formatAmount(r.amount)}
              <span className="block font-sans text-[0.75rem] text-ink-muted">
                milestone {r.index + 1}
              </span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
