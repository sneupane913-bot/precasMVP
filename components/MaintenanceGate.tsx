import { platform } from '@/lib/platform';

/**
 * Wraps every student-facing page. When the owner switch is on, nothing else
 * renders. The owner page and the platform API stay reachable, otherwise the
 * switch could not be turned back off.
 */
export async function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const s = await platform.getSettings();
  if (!s.maintenanceMode) return <>{children}</>;

  return (
    <main className="grid min-h-screen place-items-center bg-ink px-6 py-16 text-white">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-3xl">
          !
        </div>

        <h1 className="mb-4 font-serif text-2xl leading-snug sm:text-3xl">{s.maintenanceTitle}</h1>

        <p className="mb-8 leading-relaxed text-white/75">{s.maintenanceMessage}</p>

        {(s.contactName || s.contactPhone) && (
          <div className="rounded-2xl bg-white/10 p-6">
            <p className="mb-2 text-sm uppercase tracking-wide text-white/50">Please contact</p>
            {s.contactName && <p className="text-lg font-bold">{s.contactName}</p>}
            {s.contactPhone && (
              <a
                href={`tel:${s.contactPhone.replace(/\s/g, '')}`}
                className="mt-1 inline-block text-2xl font-black tracking-wide text-emerald-400"
              >
                {s.contactPhone}
              </a>
            )}
          </div>
        )}

        <p className="mt-8 text-sm text-white/40">
          Paid credits are safe and will still be there when service resumes.
        </p>
      </div>
    </main>
  );
}
