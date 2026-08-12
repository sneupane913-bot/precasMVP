/**
 * Self-moving logo slider for the landing page trust strip, matching the Stitch
 * "Academic Clarity" design. Uses the approved university SVGs in
 * public/university-logos. Extend LOGOS as more logos are added (the Codex
 * university CSV is not in the current repo; see CONTINUE-HERE).
 *
 * The row is duplicated once and animated by -50%, so it loops seamlessly.
 * Hover pauses it; reduced-motion users get a static row (globals.css).
 */
const LOGOS = [
  { name: 'BPP University', src: '/university-logos/bpp.svg' },
  { name: 'Coventry University', src: '/university-logos/coventry.svg' },
  { name: 'University of East London', src: '/university-logos/uel.svg' },
  { name: 'University of West London', src: '/university-logos/uwl.svg' },
  { name: 'University of Wolverhampton', src: '/university-logos/wolverhampton.svg' },
  { name: 'Ravensbourne University London', src: '/university-logos/ravensbourne.svg' },
];

export function TrustedBy() {
  return (
    <section className="border-y border-slate-200 bg-white py-8">
      <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
        Trusted by students applying to top UK universities
      </p>
      <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max animate-marquee items-center gap-14 group-hover:[animation-play-state:paused]">
          {[...LOGOS, ...LOGOS].map((l, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${l.name}-${i}`}
              src={l.src}
              alt={l.name}
              /* QA B2: bpp.svg and uel.svg are white artwork (fill:#fff), so on
                 a light background they were completely invisible. The set is
                 also inconsistent (blue, grey, gradients, dark). brightness(0)
                 flattens every mark to solid ink, which makes them all visible
                 and consistent. This is the standard monochrome logo wall. */
              className="h-8 w-auto opacity-45 transition hover:opacity-70 sm:h-9 [filter:brightness(0)]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
