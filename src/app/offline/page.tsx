import Link from 'next/link';

import { Container } from '@/components/ui/Container';

export default function OfflinePage() {
  return (
    <Container className="pt-20">
      <p className="kicker">Connection lost</p>
      <h1 className="mt-3 text-[2.5rem] text-ink">You are offline</h1>
      <p className="mt-4 max-w-md text-ink-soft">
        Aidline requires an active internet connection to load campaign updates and verify wallet
        data. Please check your connection and try again.
      </p>
      <Link href="/" className="btn btn-primary mt-8">
        Retry connection
      </Link>
    </Container>
  );
}
