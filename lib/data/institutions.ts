import type { Institution } from '@/lib/types';

/**
 * The client-approved launch six (decision 2026-08-10).
 *
 * Logo handling: `public/university-logos/README.md` is explicit that these are
 * third-party trademarks and says to keep monograms in public production until
 * the business confirms permitted nominative use. So the SVG path is recorded
 * here and the plumbing is wired, but rendering is gated on `logoApproved`.
 * Flipping one boolean per university turns a mark on once permission exists.
 * Ravensbourne is additionally marked `pilotOnly`.
 *
 * Every question in the bank is currently generic. Nothing here may claim we
 * ask "the exact questions this university asks" (QA / AUDIT-003).
 */

export const INSTITUTIONS: Institution[] = [
  {
    id: 'inst-bpp',
    vertical: 'uk-precas',
    slug: 'bpp-university',
    name: 'BPP University',
    shortName: 'BPP',
    country: 'United Kingdom',
    city: 'London',
    interviewType: 'Pre-CAS',
    questionCount: 17,
    durationMinutes: 30,
    blurb:
      'BPP interviews international applicants over Microsoft Teams with the camera on, to confirm why you chose the programme and that you are a genuine student.',
    monogram: 'BP',
    accent: '#123a6b',
    logoUrl: '/university-logos/bpp.svg',
    logoApproved: false,
    logoNeedsDarkBackground: true,
    pilotOnly: false,
  },
  {
    id: 'inst-uel',
    vertical: 'uk-precas',
    slug: 'university-of-east-london',
    name: 'University of East London',
    shortName: 'UEL',
    country: 'United Kingdom',
    city: 'London',
    interviewType: 'Pre-CAS',
    questionCount: 17,
    durationMinutes: 30,
    blurb:
      'UEL pre-CAS checks can include an interview alongside immigration history and financial document checks.',
    monogram: 'UE',
    accent: '#2b2a72',
    logoUrl: '/university-logos/uel.svg',
    logoApproved: false,
    logoNeedsDarkBackground: true,
    pilotOnly: false,
  },
  {
    id: 'inst-uwl',
    vertical: 'uk-precas',
    slug: 'university-of-west-london',
    name: 'University of West London',
    shortName: 'UWL',
    country: 'United Kingdom',
    city: 'London',
    interviewType: 'Pre-CAS',
    questionCount: 17,
    durationMinutes: 30,
    blurb:
      'UWL asks international applicants to confirm their course choice, their funding and their plans after study before issuing a CAS.',
    monogram: 'UW',
    accent: '#00539b',
    logoUrl: '/university-logos/uwl.svg',
    logoApproved: false,
    logoNeedsDarkBackground: false,
    pilotOnly: false,
  },
  {
    id: 'inst-wolverhampton',
    vertical: 'uk-precas',
    slug: 'university-of-wolverhampton',
    name: 'University of Wolverhampton',
    shortName: 'Wolverhampton',
    country: 'United Kingdom',
    city: 'Wolverhampton',
    interviewType: 'Pre-CAS',
    questionCount: 17,
    durationMinutes: 30,
    blurb:
      'Wolverhampton runs credibility checks on international applicants covering course knowledge, finances and post-study plans.',
    monogram: 'WV',
    accent: '#00263a',
    logoUrl: '/university-logos/wolverhampton.svg',
    logoApproved: false,
    logoNeedsDarkBackground: false,
    pilotOnly: false,
  },
  {
    id: 'inst-ravensbourne',
    vertical: 'uk-precas',
    slug: 'ravensbourne-university-london',
    name: 'Ravensbourne University London',
    shortName: 'Ravensbourne',
    country: 'United Kingdom',
    city: 'London',
    interviewType: 'Pre-CAS',
    questionCount: 17,
    durationMinutes: 30,
    blurb:
      'Ravensbourne is a specialist digital media and design university in Greenwich, London, with pre-CAS credibility checks for international applicants.',
    monogram: 'RB',
    accent: '#1a1a1a',
    logoUrl: '/university-logos/ravensbourne.svg',
    // Their press page directs to the communications team for the mark.
    logoApproved: false,
    logoNeedsDarkBackground: false,
    pilotOnly: true,
  },
  {
    id: 'inst-coventry',
    vertical: 'uk-precas',
    slug: 'coventry-university',
    name: 'Coventry University',
    shortName: 'Coventry',
    country: 'United Kingdom',
    city: 'Coventry',
    interviewType: 'Pre-CAS',
    questionCount: 17,
    durationMinutes: 45,
    blurb:
      'Coventry runs an internal credibility interview of around 45 minutes with an ID check first. They describe it as a mock for the UKVI interview.',
    monogram: 'CU',
    accent: '#0b5c4e',
    logoUrl: '/university-logos/coventry.svg',
    logoApproved: false,
    logoNeedsDarkBackground: false,
    pilotOnly: false,
  },
];

export function getInstitution(idOrSlug: string): Institution | undefined {
  return INSTITUTIONS.find((i) => i.id === idOrSlug || i.slug === idOrSlug);
}

/** Hidden from public listings until the client clears them. */
export function publicInstitutions(includePilot = false): Institution[] {
  return INSTITUTIONS.filter((i) => includePilot || !i.pilotOnly);
}
