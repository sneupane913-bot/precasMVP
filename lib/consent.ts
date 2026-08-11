/**
 * Consent versioning.
 *
 * QA-208: we displayed a consent screen and recorded nothing. If a student
 * later asks what they agreed to, or a regulator does, "we showed them
 * something" is not an answer.
 *
 * Bump this string whenever the consent wording changes. Never edit the
 * wording without bumping it, or old records will claim agreement to text the
 * student never saw.
 */
export const CONSENT_VERSION = '2026-08-10.1';

export const CONSENT_POINTS: [string, string][] = [
  [
    'Your camera and microphone will be on',
    'Just like the real interview. We watch that you stay on screen.',
  ],
  [
    'We keep your words, not your video',
    'Your voice is turned into text by our speech provider, then the recording is deleted. Transcripts are kept for 90 days after your last activity, and you can ask us to delete them sooner.',
  ],
  [
    'Answer truthfully',
    'We help you explain your own real situation better. We will never help you say something untrue.',
  ],
  [
    'This is practice only',
    'We are not immigration advisers and we cannot promise any visa or CAS result.',
  ],
];
