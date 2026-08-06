import type { Institution } from '@/lib/types';

// Seed set. Adding the remaining UK institutions is a data task, not a code
// task: append rows here (or move this array into Postgres) and nothing else
// in the application changes.

export const INSTITUTIONS: Institution[] = [
  {
    id: 'inst-aru',
    vertical: 'uk-precas',
    slug: 'anglia-ruskin-university',
    name: 'Anglia Ruskin University',
    shortName: 'ARU',
    country: 'United Kingdom',
    city: 'Cambridge',
    interviewType: 'Pre-CAS',
    questionCount: 22,
    durationMinutes: 30,
    blurb:
      'ARU runs a pre-CAS credibility interview before issuing your CAS. Expect questions on your course, your funding and your plans after study.',
    monogram: 'AR',
    accent: '#8f1d3a',
  },
  {
    id: 'inst-bpp',
    vertical: 'uk-precas',
    slug: 'bpp-university',
    name: 'BPP University',
    shortName: 'BPP',
    country: 'United Kingdom',
    city: 'London',
    interviewType: 'Pre-CAS',
    questionCount: 22,
    durationMinutes: 30,
    blurb:
      'BPP interviews international applicants over Microsoft Teams with the camera on, to confirm why you chose the programme and that you are a genuine student.',
    monogram: 'BP',
    accent: '#123a6b',
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
    questionCount: 22,
    durationMinutes: 45,
    blurb:
      'Coventry runs an internal credibility interview of around 45 minutes with an ID check first. They describe it as a mock for the UKVI interview.',
    monogram: 'CU',
    accent: '#0b5c4e',
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
    questionCount: 22,
    durationMinutes: 30,
    blurb:
      'UEL pre-CAS checks can include an interview alongside immigration history and financial document checks.',
    monogram: 'UE',
    accent: '#2b2a72',
  },
  {
    id: 'inst-roehampton',
    vertical: 'uk-precas',
    slug: 'university-of-roehampton',
    name: 'University of Roehampton',
    shortName: 'Roehampton',
    country: 'United Kingdom',
    city: 'London',
    interviewType: 'Pre-CAS',
    questionCount: 22,
    durationMinutes: 20,
    blurb:
      'Roehampton credibility interviews may start at 5 to 10 minutes, in English, with a longer follow-up if wider genuine student points need examining.',
    monogram: 'RO',
    accent: '#7a2048',
  },
  {
    id: 'inst-uwe',
    vertical: 'uk-precas',
    slug: 'uwe-bristol',
    name: 'University of the West of England, Bristol',
    shortName: 'UWE Bristol',
    country: 'United Kingdom',
    city: 'Bristol',
    interviewType: 'Pre-CAS',
    questionCount: 22,
    durationMinutes: 30,
    blurb:
      'UWE state the purpose plainly: to establish that you are genuine and have the right level of English. They explicitly warn against reading from a script.',
    monogram: 'UW',
    accent: '#c8102e',
  },
];

export function getInstitution(idOrSlug: string): Institution | undefined {
  return INSTITUTIONS.find((i) => i.id === idOrSlug || i.slug === idOrSlug);
}
