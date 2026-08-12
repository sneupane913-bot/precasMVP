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
    featured: true,
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
    featured: true,
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
    featured: true,
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
    featured: true,
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
    featured: true,
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
    featured: true,
  },
];

/**
 * The wider UK catalogue.
 *
 * Why this exists: a student who cannot find their own university assumes the
 * product is not for them and leaves. The six above are the ones our students
 * actually apply to, and they are the only ones with a sourced, university
 * specific description.
 *
 * HONESTY RULE, and it is not negotiable. For every university below we hold
 * only the name and the city, which are public facts. We do NOT know their
 * individual interview format, and we do not pretend to. Every one of them
 * carries the same generic wording and the same generic question pack built
 * from the credibility themes universities publish. Never write a
 * university specific claim here without a dated primary source, because that
 * is exactly the false specificity QA flagged as AUDIT-003.
 *
 * Adding more is a data change: append a name and a city, nothing else.
 */
const WIDER_UK: [name: string, city: string][] = [
  ['Anglia Ruskin University', 'Cambridge'],
  ['Aston University', 'Birmingham'],
  ['Bangor University', 'Bangor'],
  ['Birmingham City University', 'Birmingham'],
  ['Bournemouth University', 'Poole'],
  ['Brunel University London', 'London'],
  ['Canterbury Christ Church University', 'Canterbury'],
  ['Cardiff Metropolitan University', 'Cardiff'],
  ['Cardiff University', 'Cardiff'],
  ['City St George’s, University of London', 'London'],
  ['Coventry University London', 'London'],
  ['Cranfield University', 'Cranfield'],
  ['De Montfort University', 'Leicester'],
  ['Edge Hill University', 'Ormskirk'],
  ['Edinburgh Napier University', 'Edinburgh'],
  ['Glasgow Caledonian University', 'Glasgow'],
  ['Goldsmiths, University of London', 'London'],
  ['Heriot-Watt University', 'Edinburgh'],
  ['Keele University', 'Keele'],
  ['Kingston University', 'London'],
  ['Leeds Beckett University', 'Leeds'],
  ['Leeds Trinity University', 'Leeds'],
  ['Liverpool John Moores University', 'Liverpool'],
  ['London Metropolitan University', 'London'],
  ['London South Bank University', 'London'],
  ['Manchester Metropolitan University', 'Manchester'],
  ['Middlesex University', 'London'],
  ['Newcastle University', 'Newcastle upon Tyne'],
  ['Northumbria University', 'Newcastle upon Tyne'],
  ['Nottingham Trent University', 'Nottingham'],
  ['Oxford Brookes University', 'Oxford'],
  ['Queen Margaret University', 'Edinburgh'],
  ['Queen Mary University of London', 'London'],
  ['Robert Gordon University', 'Aberdeen'],
  ['Sheffield Hallam University', 'Sheffield'],
  ['Solent University', 'Southampton'],
  ['Staffordshire University', 'Stoke-on-Trent'],
  ['Swansea University', 'Swansea'],
  ['Teesside University', 'Middlesbrough'],
  ['Ulster University', 'Belfast'],
  ['University of Aberdeen', 'Aberdeen'],
  ['University of Bedfordshire', 'Luton'],
  ['University of Birmingham', 'Birmingham'],
  ['University of Bolton', 'Bolton'],
  ['University of Bradford', 'Bradford'],
  ['University of Brighton', 'Brighton'],
  ['University of Bristol', 'Bristol'],
  ['University of Central Lancashire', 'Preston'],
  ['University of Chester', 'Chester'],
  ['University of Derby', 'Derby'],
  ['University of Dundee', 'Dundee'],
  ['University of East Anglia', 'Norwich'],
  ['University of Essex', 'Colchester'],
  ['University of Exeter', 'Exeter'],
  ['University of Glasgow', 'Glasgow'],
  ['University of Greenwich', 'London'],
  ['University of Hertfordshire', 'Hatfield'],
  ['University of Huddersfield', 'Huddersfield'],
  ['University of Hull', 'Hull'],
  ['University of Kent', 'Canterbury'],
  ['University of Leeds', 'Leeds'],
  ['University of Leicester', 'Leicester'],
  ['University of Lincoln', 'Lincoln'],
  ['University of Liverpool', 'Liverpool'],
  ['University of Manchester', 'Manchester'],
  ['University of Northampton', 'Northampton'],
  ['University of Nottingham', 'Nottingham'],
  ['University of Plymouth', 'Plymouth'],
  ['University of Portsmouth', 'Portsmouth'],
  ['University of Reading', 'Reading'],
  ['University of Roehampton', 'London'],
  ['University of Salford', 'Salford'],
  ['University of Sheffield', 'Sheffield'],
  ['University of Southampton', 'Southampton'],
  ['University of South Wales', 'Pontypridd'],
  ['University of Stirling', 'Stirling'],
  ['University of Strathclyde', 'Glasgow'],
  ['University of Sunderland', 'Sunderland'],
  ['University of Surrey', 'Guildford'],
  ['University of Sussex', 'Brighton'],
  ['University of the West of England', 'Bristol'],
  ['University of Westminster', 'London'],
  ['University of Winchester', 'Winchester'],
  ['University of Worcester', 'Worcester'],
  ['University of York', 'York'],
  ['Wrexham University', 'Wrexham'],
  ['York St John University', 'York'],
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’'`,]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function monogramOf(name: string): string {
  const words = name.replace(/^University of /i, '').split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? 'U').toUpperCase() + (words[1]?.[0] ?? '').toUpperCase();
}

const GENERIC_BLURB =
  'Practise the credibility themes UK universities publish: your course and why you chose it, how you are paying, your study history, and your plans after you finish.';

const WIDER_INSTITUTIONS: Institution[] = WIDER_UK.map(([name, city]) => ({
  id: `inst-${slugify(name)}`,
  vertical: 'uk-precas' as const,
  slug: slugify(name),
  name,
  shortName: name.replace(/^University of /i, '').replace(/ University$/i, ''),
  country: 'United Kingdom',
  city,
  interviewType: 'Pre-CAS' as const,
  questionCount: 17,
  durationMinutes: 30,
  blurb: GENERIC_BLURB,
  monogram: monogramOf(name),
  accent: '#1b3a5c',
  // We hold no official mark for these, so the monogram renders. Never
  // scrape one: a trademark we are not licensed to use is a real risk.
  logoUrl: null,
  logoApproved: false,
  logoNeedsDarkBackground: false,
  pilotOnly: false,
  featured: false,
}));

/** The six sourced universities first, then everything else alphabetically. */
export const ALL_INSTITUTIONS: Institution[] = [...INSTITUTIONS, ...WIDER_INSTITUTIONS];

export function getInstitution(idOrSlug: string): Institution | undefined {
  return ALL_INSTITUTIONS.find((i) => i.id === idOrSlug || i.slug === idOrSlug);
}

/** Hidden from public listings until the client clears them. */
export function publicInstitutions(includePilot = false): Institution[] {
  return ALL_INSTITUTIONS.filter((i) => includePilot || !i.pilotOnly);
}

/** The pinned six, for the "Most applied" row and the home logo strip. */
export function featuredInstitutions(includePilot = false): Institution[] {
  return publicInstitutions(includePilot).filter((i) => i.featured);
}
