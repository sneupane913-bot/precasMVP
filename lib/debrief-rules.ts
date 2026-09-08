/**
 * The debrief deal, in numbers. Its own file so the browser can import it
 * without pulling in the store (lib/debriefs.ts) and so copy on /free-mock
 * and /super never restates a number (copy-check M-10a).
 */
export const DEBRIEF_RULES = {
  minQuestions: 5,
  maxQuestions: 30,
  minQuestionChars: 15,
  maxApprovedPerStudent: 3,
  rewardMocks: 1,
} as const;
