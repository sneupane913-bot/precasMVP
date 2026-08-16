'use client';

import { useEffect, useState } from 'react';

/**
 * The support number, for CLIENT pages.
 *
 * D-1/D-2/D-4. `SiteFooter` used to be an async server component that awaited
 * the number itself, and three pages that import it carry `'use client'`, where
 * React cannot render an async component at all. Rather than make those pages
 * server components (they are interactive, so they cannot be), the footer became
 * sync and takes the number as a prop. This is how a client page gets it.
 *
 * Deliberately fails quiet. An empty string simply means `ContactUs` and the
 * footer's WhatsApp link fall back, and a page must never break because the
 * support number could not be fetched.
 */
export function useSupportNumber(): string {
  const [number, setNumber] = useState('');

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch('/api/platform');
        const json = await res.json();
        if (alive && json?.ok && json.data?.supportWhatsapp) setNumber(json.data.supportWhatsapp);
      } catch {
        /* keep the empty string */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return number;
}
