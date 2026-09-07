import type { Question } from '@/lib/types';
import type { AnswerKind } from '@/lib/data/timing';

/**
 * What a question looks like BEFORE it is given an id and a time limit.
 *
 * Ids are positional and time limits are derived (see questions.ts), so a
 * draft carries neither. Shared by the main bank and the appended batches so
 * that a batch file cannot import the bank (which would be circular) and the
 * bank cannot drift from the batch.
 */
export type Draft = Omit<
  Question,
  'id' | 'vertical' | 'institutionId' | 'timeLimitSeconds' | 'readSeconds'
> & {
  answerKind: AnswerKind;
  /**
   * Institution ids whose OWN published interview guidance asks this question.
   * Provenance for the "likely at your university" preference in the plan.
   * Older questions carry this in lib/data/institution-facts.ts instead; both
   * are merged by publishedBy() in questions.ts.
   */
  publishedBy?: string[];
};
