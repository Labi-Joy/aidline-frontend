import { Container } from '@/components/ui/Container';

export default function CampaignsLoading() {
  return (
    <Container className="pt-12" aria-busy="true">
      <p className="kicker">Campaigns</p>
      <h1 className="mt-3 text-[2.75rem]">Every campaign, every payout, in the open</h1>

      <div className="mt-10 flex flex-col gap-4 border-y border-rule py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[0.9375rem] text-ink-muted">
          <span>All</span>
          <span>Emergency relief</span>
          <span>Climate action</span>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-ink-muted">
          <span className="border border-rule px-3 py-1">Open</span>
          <span className="border border-rule px-3 py-1">Fully released</span>
          <span className="border border-rule px-3 py-1">Ended</span>
          <span className="border border-rule px-3 py-1">Cancelled</span>
        </div>
      </div>

      <p className="figure mt-6 text-sm text-ink-muted">Loading campaigns…</p>

      {/* Static placeholders matching CampaignCard without shimmer animation per DESIGN.md */}
      <div className="mt-6 grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col border-t-2 border-rule pt-4">
            <div className="aspect-[3/2] w-full rounded-[2px] bg-paper-sunk" />
            <div className="mt-4 h-3 w-28 rounded-[2px] bg-paper-sunk" />
            <div className="mt-2 h-6 w-3/4 rounded-[2px] bg-paper-sunk" />
            <div className="mt-2 h-4 w-1/2 rounded-[2px] bg-paper-sunk" />
            <div className="mt-2 space-y-1.5">
              <div className="h-3.5 w-full rounded-[2px] bg-paper-sunk" />
              <div className="h-3.5 w-4/5 rounded-[2px] bg-paper-sunk" />
            </div>
            <div className="mt-auto pt-6">
              <div className="h-2 w-full rounded-[2px] bg-paper-sunk" />
              <div className="mt-3 flex justify-between">
                <div className="h-3 w-28 rounded-[2px] bg-paper-sunk" />
                <div className="h-3 w-16 rounded-[2px] bg-paper-sunk" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only" role="status">
        Loading campaigns
      </span>
    </Container>
  );
}
