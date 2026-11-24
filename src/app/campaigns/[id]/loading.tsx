import Link from 'next/link';

import { Container } from '@/components/ui/Container';

export default function CampaignDetailLoading() {
  return (
    <article aria-busy="true">
      <Container className="pt-10">
        <Link href="/campaigns" className="link text-sm">
          All campaigns
        </Link>
        <div className="mt-8 grid gap-10 lg:grid-cols-12">
          <header className="lg:col-span-8">
            <div className="h-3.5 w-48 rounded-[2px] bg-paper-sunk" />
            <div className="mt-4 h-10 w-3/4 rounded-[2px] bg-paper-sunk" />
            <div className="mt-5 space-y-2 max-w-[40rem]">
              <div className="h-4 w-full rounded-[2px] bg-paper-sunk" />
              <div className="h-4 w-2/3 rounded-[2px] bg-paper-sunk" />
            </div>
            <div className="mt-4 h-3.5 w-36 rounded-[2px] bg-paper-sunk" />
          </header>
        </div>
      </Container>

      <Container className="mt-10 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="aspect-video w-full rounded-[2px] bg-paper-sunk" />

          <section className="mt-12">
            <p className="kicker">The situation</p>
            <div className="mt-4 max-w-[68ch] space-y-3">
              <div className="h-4 w-full rounded-[2px] bg-paper-sunk" />
              <div className="h-4 w-full rounded-[2px] bg-paper-sunk" />
              <div className="h-4 w-5/6 rounded-[2px] bg-paper-sunk" />
            </div>
          </section>

          <section className="mt-14">
            <div className="flex items-end justify-between border-b border-rule pb-4">
              <div className="h-5 w-40 rounded-[2px] bg-paper-sunk" />
              <div className="h-4 w-24 rounded-[2px] bg-paper-sunk" />
            </div>
            <div className="mt-6 space-y-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-b border-rule py-4"
                >
                  <div className="space-y-2">
                    <div className="h-4 w-32 rounded-[2px] bg-paper-sunk" />
                    <div className="h-3 w-48 rounded-[2px] bg-paper-sunk" />
                  </div>
                  <div className="h-4 w-20 rounded-[2px] bg-paper-sunk" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-4">
          <div className="rounded-[2px] border border-rule bg-paper-raised p-6">
            <div className="h-5 w-32 rounded-[2px] bg-paper-sunk" />
            <div className="mt-4 h-8 w-full rounded-[2px] bg-paper-sunk" />
            <div className="mt-6 h-10 w-full rounded-[2px] bg-paper-sunk" />
            <div className="mt-4 h-11 w-full rounded-[2px] bg-paper-sunk" />
          </div>
        </aside>
      </Container>

      <span className="sr-only" role="status">
        Loading campaign details
      </span>
    </article>
  );
}
