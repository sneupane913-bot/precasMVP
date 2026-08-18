/**
 * WHERE THESE QUESTIONS COME FROM (N-29, Q-1, Q-2).
 *
 * Nothing in this bank was invented. Every category below maps to a topic area
 * that a UK university or UKVI itself publishes as part of the Pre-CAS /
 * credibility interview, and the wording is adapted from those published
 * examples rather than guessed at.
 *
 * This matters more than it looks. A bank somebody made up would still LOOK
 * like a product: students would practise, get scores, and feel prepared, and
 * we would only find out it was useless when they started failing real
 * interviews. So the sources are recorded here, with dates, and no page may
 * claim these are the questions universities ask unless this block is true.
 *
 * SOURCES, checked 13 August 2026:
 *
 *  [S1] Oxford Brookes University — "UKVI Credibility interviews", the
 *       university's own guidance to its offer holders, listing the five topic
 *       areas and example questions under each.
 *       https://www.brookes.ac.uk/students/isat/visas/student-visa/credibility-interviews
 *
 *  [S2] University of Lincoln — "Pre-CAS Interview | Information for Offer
 *       Holders", confirming the interview format and purpose.
 *       https://www.lincoln.ac.uk/studywithus/internationalstudents/informationforofferholders/pre-casinterview/
 *
 * THE FIVE TOPIC AREAS [S1], and the categories in this file that cover them:
 *
 *   1. Study in the UK          -> why_uk
 *   2. Why this university      -> why_university, accommodation
 *   3. Why this course          -> why_course, education, study_gap
 *   4. Financing your studies   -> finance
 *   5. Post-study plans         -> future_plans, progression
 *
 * Plus identity and conversational, which are how a real interview opens and
 * how an interviewer probes an answer that sounded recited.
 *
 * TWO THINGS [S1] SAYS THAT SHAPE THE WHOLE PRODUCT:
 *
 *   "If you just give general answers that anyone could give, then your visa
 *   application may be refused."  <- this is why N-30 forbids generic feedback.
 *   Coaching a student towards a general answer would be coaching them to fail.
 *
 *   "It is not enough to rely on university rankings."  <- so an answer that
 *   only cites a ranking must score badly on genuineIntent, not well.
 *
 * WHEN ADDING A QUESTION: cite which topic area it belongs to. A question that
 * fits none of them is not a Pre-CAS question, however sensible it sounds.
 */

import type { Institution, Question, PublicQuestion } from '@/lib/types';
import { type AnswerKind, answerSecondsFor, readSecondsFor } from '@/lib/data/timing';

// The question bank. {{university}} and {{city}} are resolved per session, so
// one bank serves every institution and adding institution 7 through 104 needs
// no new question writing.
//
// Model answers are STRUCTURES, written in the simple spoken English a Nepali
// student can actually produce. They are never presented as scripts.
// Rubric notes are private and never leave the server.

type Draft = Omit<
  Question,
  'id' | 'vertical' | 'institutionId' | 'timeLimitSeconds' | 'readSeconds'
> & { answerKind: AnswerKind };

const RAW: Draft[] = [
  {
    category: 'identity',
    text: 'Please introduce yourself briefly.',
    answerKind: 'intro',
    tips: [
      'Keep it short. Name, where you are from, what you studied, what you do now.',
      'Do not tell your whole life story. Thirty to forty seconds is enough.',
      'Speak slowly. This is the interviewer’s first impression of your English.',
    ],
    modelAnswer:
      'My name is [your name] and I am from [your city] in Nepal. I finished my bachelor’s degree in [subject] in [year] from [college]. Since then I have been working as a [job] at [company]. I have applied to study [course] at {{university}} because I want to build a career in [field].',
    rubricNotes:
      'Looking for: name, place, qualification, current activity, target course. Penalise rambling past 60s, life stories, or an answer under 15 seconds. Do not penalise accent.',
  },
  {
    category: 'identity',
    text: 'Can you confirm the course and the university you have applied to, and when it starts?',
    answerKind: 'factual',
    tips: [
      'Say the full course name, not a short version.',
      'Say the intake month and year.',
      'If you are not sure of the exact course title, check your offer letter before the real interview.',
    ],
    modelAnswer:
      'I have applied for the [full course name] at {{university}}. It is a [one year / two year] course and my intake is [month] [year]. My campus is in {{city}}.',
    rubricNotes:
      'Consistency check. Any vagueness about their own course title is a serious credibility flag. Full name of course, level, intake, campus.',
  },
  {
    category: 'education',
    text: 'Tell me about your previous qualification and why you chose that subject.',
    answerKind: 'explanatory',
    tips: [
      'Say what you studied, where, and when you finished.',
      'Then give one honest reason you picked it.',
      'It is fine if your reason was practical. Honest is better than impressive.',
    ],
    modelAnswer:
      'I completed my bachelor’s in [subject] from [college] in [year]. I chose it because [one real reason, for example: I was good at accounts in school, or my family runs a business and I wanted to understand it]. The part I enjoyed most was [one specific subject or project].',
    rubricNotes:
      'Wants a specific institution, year, and one genuine reason. Generic answers such as "it has good scope" score low. A named module or project scores high.',
  },
  {
    category: 'education',
    text: 'How does your previous study connect with the course you want to study now?',
    answerKind: 'explanatory',
    tips: [
      'Name one subject from your old course that links to the new one.',
      'If the subjects are different, say honestly why you are changing.',
      'A career reason is a good reason. Say it plainly.',
    ],
    modelAnswer:
      'In my bachelor’s I studied [subject], and one part I really liked was [specific topic]. This new course goes deeper into that. For example it has a module on [module name]. My plan is to work in [field], and this course covers the part I am missing, which is [specific skill].',
    rubricNotes:
      'Progression logic. Named module or topic is a strong positive. A subject switch is fine if the reason is coherent. Penalise a claimed link with no specifics.',
  },
  {
    category: 'study_gap',
    text: 'What have you been doing since you finished your last qualification?',
    answerKind: 'explanatory',
    tips: [
      'Be honest about the gap. Everyone has one.',
      'Say what you did, month to month if you can.',
      'If you worked, say the company and the role.',
    ],
    modelAnswer:
      'I finished in [year]. After that I worked at [company] as a [role] for [length of time]. I also prepared for my IELTS and took the test in [month]. I used that time to save money for my studies and to decide which course was right for me.',
    rubricNotes:
      'Gaps over 6 months need a concrete account. Vagueness here is one of the strongest refusal signals. Looking for named employer, role, dates, and an explanation of why now.',
  },
  {
    category: 'study_gap',
    text: 'How will your work experience help you in this course?',
    answerKind: 'explanatory',
    tips: [
      'Give one real example of something you did at work.',
      'Then link it to one thing you will study.',
      'Do not invent a job. If you did not work, say what you did instead.',
    ],
    modelAnswer:
      'At [company] I was responsible for [one real task]. That taught me [one real skill, for example: how to handle customers when they are angry]. In this course there is a module on [module], and I think I will understand it better because I have already seen this in a real workplace.',
    rubricNotes:
      'Requires a concrete task, not a job title. Guardrail: if the student appears to be inventing experience, the feedback must steer them back to the truth, never help them elaborate the fiction.',
  },
  {
    category: 'why_uk',
    text: 'Why do you want to study in the UK rather than in Nepal?',
    answerKind: 'comparative',
    tips: [
      'Give a reason about the course or the career, not about the country being nice.',
      'Do not say the UK is the best. Say why it is best for you.',
      'One good specific reason beats three general ones.',
    ],
    modelAnswer:
      'The course I want is not available in Nepal in the same way. In Nepal the [subject] programmes focus mainly on theory, but this course has [placement / lab work / a live project]. A UK degree is also recognised by employers when I come back to work in [field]. And studying in English every day will make my English much stronger.',
    rubricNotes:
      'The single most commonly memorised question. Watch closely for scripted delivery. Penalise "UK education is world class" with no follow-through. Reward a comparison the student could only make about their own field.',
  },
  {
    category: 'why_uk',
    text: 'Did you consider Australia, Canada or the USA? Why did you choose the UK instead?',
    answerKind: 'comparative',
    tips: [
      'It is fine to say you looked at other countries. Most students did.',
      'Give a practical reason: course length, cost, or the type of course.',
      'Do not say anything negative about the other countries.',
    ],
    modelAnswer:
      'Yes, I did look at Australia. But the master’s there is usually two years and in the UK it is one year, so it costs me less overall and I can start working sooner. The UK also has [specific thing relevant to their field]. That is why I chose the UK.',
    rubricNotes:
      'Honesty is the marker here. A flat "no, only the UK" is often untrue and sounds coached. Reward a specific, checkable comparison such as course length or fee.',
  },
  {
    category: 'why_university',
    text: 'Why did you choose {{university}}?',
    answerKind: 'explanatory',
    tips: [
      'Say one thing about this university that is not true of every university.',
      'Rankings alone are a weak answer.',
      'If you know a module, a facility or a lecturer, name it.',
    ],
    modelAnswer:
      'I looked at the course content at {{university}} and it covers [specific module], which is exactly the area I want to work in. The campus is in {{city}}, and living costs there are manageable for my budget. They also offer [specific support, placement or facility], which other universities I looked at did not.',
    rubricNotes:
      'Weak university knowledge is a major risk flag. Reward named modules, campus facts, city facts, support services. Penalise rankings-only and "good reputation".',
  },
  {
    category: 'why_university',
    text: 'What do you know about {{city}}, where you will be living?',
    answerKind: 'explanatory',
    tips: [
      'Say roughly where it is in the UK.',
      'Say one thing about living costs or transport.',
      'You do not need to be an expert. You need to have looked it up.',
    ],
    modelAnswer:
      '{{city}} is in [region] of England. It is a student city, so accommodation is cheaper than central London. I have looked at accommodation near the campus and it costs around [amount] per month. I would travel to campus by [bus / walking], which takes about [time].',
    rubricNotes:
      'Tests whether real research happened. Any concrete number or travel detail is a strong positive. Complete ignorance of the city is a credibility flag.',
  },
  {
    category: 'why_course',
    text: 'Which modules will you study on this course, and which one interests you most?',
    answerKind: 'explanatory',
    tips: [
      'Name at least two modules. Read them from the course page before your real interview.',
      'Pick one and say why it interests you.',
      'This is the question most students fail. Prepare it properly.',
    ],
    modelAnswer:
      'The course has modules including [module one], [module two] and [module three]. The one I am most interested in is [module], because at work I had to [related real situation] and I did not have the knowledge I needed. This module covers exactly that.',
    rubricNotes:
      'The highest-value diagnostic in the whole set. Zero named modules is a serious flag and the feedback must say so directly. Reward a genuine personal link to a named module.',
  },
  {
    category: 'why_course',
    text: 'How is this course assessed? Exams, coursework or both?',
    answerKind: 'factual',
    tips: [
      'This is on the course page. Look it up.',
      'A short honest answer is fine.',
      'If you do not know, say you will check, do not guess.',
    ],
    modelAnswer:
      'From what I read on the course page, it is mostly coursework and group projects, with a dissertation at the end. There are some exams in the first semester. I prefer coursework because I can research properly rather than memorising for an exam.',
    rubricNotes:
      'Tests research depth. Guessing wrongly is worse than admitting uncertainty. Feedback should tell the student where to find the answer.',
  },
  {
    category: 'progression',
    text: 'This course is at the same level as your previous qualification. Why do you need it?',
    answerKind: 'comparative',
    tips: [
      'If this does not apply to you, say so honestly.',
      'If it does, give a career reason, not a visa reason.',
      'Say what the new course gives you that the old one did not.',
    ],
    modelAnswer:
      'My previous degree was in [subject], which is broad. This course is specialised in [area], which is where the jobs are in my field now. My employer told me that without [specific qualification or skill] I cannot move up. That is why I need this specific course, even though it is the same level.',
    rubricNotes:
      'Same-level or second-master’s is a documented refusal trigger. Requires a concrete career justification. A visa-oriented answer is a red flag and must be coached away from, honestly.',
  },
  {
    category: 'finance',
    text: 'How will you pay your tuition fees and your living costs?',
    answerKind: 'explanatory',
    tips: [
      'Give real numbers. The interviewer expects numbers.',
      'Say who is paying and where the money came from.',
      'Never guess. Check with your family before the real interview.',
    ],
    modelAnswer:
      'My total tuition is [amount] pounds. I have already paid [amount] as a deposit, so [amount] is remaining. My father is sponsoring me. The money comes from [his business income / land sale / savings over X years], and we have bank statements showing it. For living costs I have budgeted about [amount] per month.',
    rubricNotes:
      'Numbers are mandatory. Any answer without a figure is weak. Guardrail: never help a student construct a funding story. If the funding is unclear, tell them to speak to their family and get the real facts.',
  },
  {
    category: 'finance',
    text: 'Who is your sponsor, what do they do, and roughly what do they earn?',
    answerKind: 'explanatory',
    tips: [
      'Say their relationship to you, their job, and an approximate income.',
      'If you do not know their income, find out before the real interview.',
      'Approximate is fine. "I do not know" is not.',
    ],
    modelAnswer:
      'My sponsor is my father. He runs [type of business] in [place] and has done for [number] years. His income is around [amount] per year. He has been saving for my education since I was in school, and the savings are in [bank].',
    rubricNotes:
      'Not knowing a sponsor’s occupation or approximate income is one of the most damaging answers possible. Feedback must be direct about this. Never suggest a figure to the student.',
  },
  {
    category: 'finance',
    text: 'What do you think your monthly living costs in the UK will be?',
    answerKind: 'factual',
    tips: [
      'Break it down: rent, food, transport, phone.',
      'Any realistic number is better than a vague answer.',
      'London costs much more than other cities. Know which you are in.',
    ],
    modelAnswer:
      'I have budgeted around [amount] pounds per month. Rent is about [amount], food around [amount], transport [amount], and the rest for phone and other things. I know {{city}} is [more / less] expensive than London, and I checked this on the university accommodation page.',
    rubricNotes:
      'Reward a breakdown over a single total. Reward awareness of the London differential. A figure far below reality suggests no research.',
  },
  {
    category: 'accommodation',
    text: 'Where do you plan to live, and how will you travel to campus?',
    answerKind: 'explanatory',
    tips: [
      'Say whether it is university halls or private renting.',
      'Say roughly how far from campus.',
      'Having actually looked this up is what they are testing.',
    ],
    modelAnswer:
      'For the first few months I plan to stay in university accommodation, because it is easier when I first arrive and I do not know the city. After that I will look for a shared flat with other students, which is cheaper. The halls are about [time] walk from the campus.',
    rubricNotes:
      'Low stakes but tests preparation. Any concrete plan is acceptable. "I have not thought about it" is a preparation flag.',
  },
  {
    category: 'immigration',
    text: 'Have you applied for a visa to any country before? Have you ever been refused?',
    answerKind: 'factual',
    tips: [
      'Answer completely honestly. They already have your record.',
      'If you were refused, say so, and say what you learned.',
      'Hiding a refusal is far worse than having one.',
    ],
    modelAnswer:
      'Yes. I applied for a [country] visa in [year] and it was refused because [real reason]. I understood afterwards that [what was missing]. Since then I have [what changed]. I have not had any other refusals.',
    rubricNotes:
      'ABSOLUTE GUARDRAIL. Never, under any circumstances, coach a student to conceal or reframe a refusal. If the transcript suggests concealment, the feedback must tell them plainly that UKVI already holds this record and that hiding it is the single worst thing they can do.',
  },
  {
    category: 'future_plans',
    text: 'What do you plan to do after you complete this course?',
    answerKind: 'explanatory',
    tips: [
      'Name a job role, not just a field.',
      'Say where: Nepal, or somewhere else. Be honest.',
      'Link it back to what you will have studied.',
    ],
    modelAnswer:
      'After the course I want to work as a [specific job title]. In Nepal there is growing demand for this in [sector], and companies like [example] hire for these roles. The skills from [named module] are exactly what those jobs ask for. My longer term plan is [next step].',
    rubricNotes:
      'Wants a named role and a named sector or employer. "I will get a good job" is a weak answer. Do not penalise a student for intending to work in the UK first under the Graduate route, that is lawful. Penalise incoherence between the course and the plan.',
  },
  {
    category: 'future_plans',
    text: 'How will this qualification help you specifically, back in Nepal?',
    answerKind: 'explanatory',
    tips: [
      'Name the industry in Nepal you are aiming at.',
      'Say what you will be able to do that you cannot do now.',
      'One concrete example is enough.',
    ],
    modelAnswer:
      'In Nepal the [sector] is growing, but there are very few people with [specific skill]. Right now I can do [current ability], but not [target ability]. After this course I will be able to [specific thing], and that is what companies like [example] are looking for. That is the gap I want to fill.',
    rubricNotes:
      'Tests whether the course-to-career logic holds. Reward naming a real Nepali sector or employer. Penalise generic statements about opportunity.',
  },
  {
    category: 'conversational',
    text: 'Tell me about a challenge you faced recently and how you handled it.',
    answerKind: 'explanatory',
    tips: [
      'A small real story works better than a big invented one.',
      'Say what happened, what you did, and what changed.',
      'This question tests natural English, so relax a little here.',
    ],
    modelAnswer:
      'Last year at work we had [real situation]. It was difficult because [reason]. What I did was [action you actually took]. In the end [what happened]. What I learned was [one honest lesson].',
    rubricNotes:
      'Tests spontaneity and natural English rather than credibility. This is the best question for detecting memorisation, because it cannot be predicted. Compare fluency here against the scripted questions.',
  },
  {
    category: 'conversational',
    text: 'Is there anything else you would like to add before we finish?',
    answerKind: 'closing',
    tips: [
      'Do not say "no". Use it.',
      'Add one thing you did not get to say.',
      'Thank them and keep it short.',
    ],
    modelAnswer:
      'Yes, one thing. I would just like to say that I have prepared for this for [time], and [one genuine point you did not get to make]. Thank you for your time.',
    rubricNotes:
      'The standard closing question. A flat "no" wastes the opportunity but is not a credibility failure. Reward one genuine additional point delivered briefly.',
  },

  // ---------------------------------------------------------------------------
  // PROBES.
  //
  // A probe is the SECOND question -- the one an interviewer asks after your
  // first answer. "My family is funding me." -> "Where did the money in that
  // account come from?" That second turn is where credibility interviews are
  // actually decided, and a bank of first-level questions alone rehearses a
  // conversation that does not happen.
  //
  // Every probe below was captured verbatim from a published source; 86 of the
  // 112 harvested came from universities' own guidance pages. `probeTrigger`
  // records the kind of first answer that invites it, which is what lets the
  // planner place a probe where it makes sense and what the results page shows
  // the student afterwards.
  //
  // A probe is never asked on its own. See buildQuestionPlan.
  // ---------------------------------------------------------------------------
  {
    category: 'why_uk',
    text: 'Why not study this course in your home country?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student names a course that is also widely available at home.',
    tips: [
      'Name the thing the UK course has that the Nepali one does not.',
      'One specific difference beats three general ones.',
      'Do not criticise Nepal. Compare the courses, not the countries.',
    ],
    modelAnswer:
      'The same subject is taught in Nepal, but [one concrete difference: the UK course is one year, or it includes a placement, or it carries [accreditation]]. That matters to me because [reason tied to your plan].',
    rubricNotes:
      'Wants ONE concrete difference between the two options. "Better quality" and "more recognised" score zero. Naming an accreditation, a module, a placement or the one-year structure scores high.',
  },
  {
    category: 'why_uk',
    text: 'Which other countries did you consider, and what made you decide on the UK?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student gives a one-line answer about the UK having the best universities.',
    tips: [
      'Name at least one country you actually looked at.',
      'Then give the reason you ruled it out.',
      '"The UK was my only choice" sounds unresearched, not loyal.',
    ],
    modelAnswer:
      'I also looked at [country]. I chose the UK because [one reason: course length, cost, the Graduate Route, a specific university]. [Country] would have meant [the trade-off you rejected].',
    rubricNotes:
      'Wants a real comparison with a named alternative and one decision criterion. An answer with no alternative named is a flag: it suggests an agent chose for them.',
  },
  {
    category: 'why_university',
    text: 'Which other universities did you consider?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says this university was their first and only choice.',
    tips: [
      'Name one or two you genuinely applied to or looked at.',
      'Then say what made you pick this one over them.',
      'It is normal to apply to several. Saying so is not disloyal.',
    ],
    modelAnswer:
      'I also had an offer from [university]. I chose {{university}} because [one specific thing: a module, a facility, an accreditation, the campus location].',
    rubricNotes:
      'Wants a named alternative plus one differentiating reason. Check the reason is actually distinctive: a claim true of every university in the peer set is not a reason.',
  },
  {
    category: 'why_university',
    text: 'What facilities are you expecting at {{university}} for your subject?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says the university has great facilities.',
    tips: [
      'Name a real one. A lab, a studio, a library, a specific building.',
      'If you do not know one, look at the course page before the real interview.',
      'One named facility is worth ten adjectives.',
    ],
    modelAnswer:
      'For my subject there is [named facility]. I am expecting to use it for [the part of the course it serves].',
    rubricNotes:
      'A named, checkable facility scores high. "Modern facilities" and "good labs" score zero. An invented facility is worse than an admission of not knowing.',
  },
  {
    category: 'why_course',
    text: 'What will you actually learn in the modules you just named?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student lists module names without describing their content.',
    tips: [
      'Pick ONE module and say what it covers.',
      'Two sentences is enough.',
      'Naming modules you cannot describe is worse than naming none.',
    ],
    modelAnswer:
      'In [module] we cover [topic] and [topic]. I am most interested in [one of them] because [link to your plan].',
    rubricNotes:
      'Tests whether the module names were memorised or understood. Any content detail scores. Repeating the module title back scores zero.',
  },
  {
    category: 'why_course',
    text: 'Do you know what level your course is at?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student names the course without stating its qualification level.',
    tips: [
      'Say the level: RQF 7 for a Master’s, RQF 6 for a Bachelor’s.',
      'Say it is higher than what you have already done, if it is.',
      'This is a short answer. Do not pad it.',
    ],
    modelAnswer:
      'It is a Master’s degree, RQF level 7. My bachelor’s was level 6, so this is a step up.',
    rubricNotes:
      'Factual. Correct level, and awareness that it is above their previous qualification. Getting the level wrong is a serious progression flag.',
  },
  {
    category: 'finance',
    text: 'Where did the money in that bank account come from?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student confirms the maintenance funds are already in the account.',
    tips: [
      'Say whose money it is and how it was earned or saved.',
      'If it was sold land or a loan, say so plainly.',
      'Money that appeared suddenly with no explanation is the single biggest refusal reason.',
    ],
    modelAnswer:
      'The funds are my [relation]’s savings from [source]. They have been in the account since [month].',
    rubricNotes:
      'Wants a traceable origin and a length of time. Vagueness here is the strongest single credibility flag in the whole interview. Honesty about a loan or a land sale scores better than a vague "family savings".',
  },
  {
    category: 'finance',
    text: 'What does your sponsor do, and how many people depend on that income?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student names a sponsor without describing them.',
    tips: [
      'Job, employer, and roughly what they earn.',
      'Then say how many people that income supports.',
      'Know the number before the interview. Guessing sounds like guessing.',
    ],
    modelAnswer:
      'My [relation] is a [job] at [employer] and earns about [amount] a year. That income supports [number] people including me.',
    rubricNotes:
      'Wants occupation, an income figure and a dependant count that make the funding plausible. An income that cannot cover the fees, with no other explanation, is a fail.',
  },
  {
    category: 'finance',
    text: 'Have you taken a loan? How will you pay it back?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student mentions a bank balance that appeared recently, or an education loan.',
    tips: [
      'If there is a loan, say the amount and the lender.',
      'Then say how you will repay it, with a real salary figure.',
      'Hiding a loan is far worse than having one.',
    ],
    modelAnswer:
      'Yes, [amount] from [bank], secured against [asset]. I plan to repay it from my salary as a [job], which is around [amount] a month in Nepal.',
    rubricNotes:
      'Wants disclosure plus a repayment plan grounded in a real salary. Denying a loan when the balance appeared recently is the classic contradiction interviewers look for.',
  },
  {
    category: 'accommodation',
    text: 'How far is that from campus, and how will you get to class?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student names a hall or an area they will live in.',
    tips: [
      'Say the distance or the journey time.',
      'Say bus, train or walk.',
      'If you do not know yet, say what you will do to find out.',
    ],
    modelAnswer:
      'It is about [number] minutes from campus. I will [walk / take the number [x] bus], which costs about [amount] a week.',
    rubricNotes:
      'Wants a journey time and a mode of travel. Shows the accommodation claim was researched rather than invented on the spot.',
  },
  {
    category: 'accommodation',
    text: 'How much will your accommodation cost each week?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says they will stay in university halls.',
    tips: [
      'Give a weekly figure in pounds.',
      'Say whether bills are included.',
      'This number should match the living costs you gave earlier.',
    ],
    modelAnswer:
      'It is about £[amount] a week including bills. Over the year that is about £[amount], which is inside the budget I described.',
    rubricNotes:
      'Cross-check against their stated monthly living costs and their funding. Two figures that do not reconcile is a stronger flag than either figure being high.',
  },
  {
    category: 'study_gap',
    text: 'Why is there such a long gap between your last course and this one?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says they were working after graduating.',
    tips: [
      'Give the reason plainly. Work, family, money, health.',
      'Then say what changed to make now the right time.',
      'A gap is normal. An unexplained gap is not.',
    ],
    modelAnswer:
      'I finished in [year] and worked as a [job] to [reason: save money / support my family]. I am returning now because [what changed].',
    rubricNotes:
      'Wants a specific reason and a trigger for returning now. Unexplained years are a standard refusal ground; a plain honest reason scores far better than an impressive vague one.',
  },
  {
    category: 'study_gap',
    text: 'What was your monthly salary in that job?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says they worked during the gap.',
    tips: [
      'Give the figure in rupees.',
      'Do not inflate it. It may be checked against your funding story.',
      'Short answer.',
    ],
    modelAnswer:
      'I earned about NPR [amount] a month as a [job] at [employer].',
    rubricNotes:
      'Factual, and a consistency check against the funding claim. A salary that cannot explain the savings they described is a contradiction.',
  },
  {
    category: 'education',
    text: 'Have you studied in the UK before? Why are you studying here again?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student mentions previous international travel or a previous UK qualification.',
    tips: [
      'Answer yes or no first.',
      'If yes, say what and when, and why this is a step up.',
      'Never hide a previous UK visa. It is on record.',
    ],
    modelAnswer:
      '[Yes, I studied [course] at [institution] in [year]. I am returning because [how this course is higher or different].] / [No, this is my first time studying in the UK.]',
    rubricNotes:
      'Previous UK study demands a clear progression argument. Concealment discovered later is fatal; disclosure with a progression reason is fine.',
  },
  {
    category: 'future_plans',
    text: 'What jobs could you actually do after this course?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says the course will improve their career prospects.',
    tips: [
      'Name one or two real job titles.',
      'Name a type of employer, or a real company.',
      '"Good opportunities" is not an answer.',
    ],
    modelAnswer:
      'I am aiming to work as a [job title] at a [type of employer], for example [named company or sector] in [city].',
    rubricNotes:
      'Wants named roles and a named sector or employer. Generic ambition scores zero; a specific role that connects to a named module scores highest.',
  },
  {
    category: 'future_plans',
    text: 'What salary do you expect when you go home?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says they will return home to work after graduating.',
    tips: [
      'Give a figure in rupees, monthly or yearly.',
      'Say why the UK degree raises it.',
      'If you took a loan, this number must be able to repay it.',
    ],
    modelAnswer:
      'A [job title] with a UK master’s earns about NPR [amount] a month in Nepal, compared with about [amount] without one.',
    rubricNotes:
      'Wants a plausible figure that justifies the spend and, where a loan exists, can repay it. The return-on-investment arithmetic is what this question is really testing.',
  },
  {
    category: 'immigration',
    text: 'Do you know how many hours you are allowed to work during term time?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says they intend to work part-time while studying.',
    tips: [
      'Know the number for your course level before the interview.',
      'Say that studying comes first.',
      'Do not say you are coming to the UK to work.',
    ],
    modelAnswer:
      'On a Student visa for my course I may work up to [number] hours a week in term time, and full time in the holidays. My study comes first.',
    rubricNotes:
      'Factual and non-negotiable. Getting this wrong, or framing work as the purpose of coming, is a direct hit on genuine-student credibility.',
  },
  {
    category: 'immigration',
    text: 'Have you made any previous visa applications? Were they successful?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says this is their first UK application, or mentions previous travel.',
    tips: [
      'Answer honestly. Refusals are on record.',
      'If you were refused, say which country, when, and why.',
      'A declared refusal is survivable. A hidden one is not.',
    ],
    modelAnswer:
      '[I have applied for a [country] visa in [year], which was [granted / refused because [reason]].] / [No, this is my first visa application.]',
    rubricNotes:
      'Concealment is the failure mode, not the refusal itself. An honest disclosure with the reason and what changed since scores acceptably; a discovered omission does not.',
  },
];

/**
 * TIMING IS DERIVED, NEVER TYPED IN.
 *
 * `Draft` deliberately has no `timeLimitSeconds`, so it is not possible to add
 * a question whose time contradicts the kind of answer it asks for. Every
 * number comes from lib/data/timing.ts, which carries the published sources.
 *
 * The bank previously held hand-set 45s and 60s limits that nobody had checked.
 * Both sit BELOW the floor of the only per-question specification any UK
 * university publishes (Oxford Brookes: one to two minutes), on a page that
 * also requires "at least two facts or examples" in the answer. You cannot give
 * two facts and a conclusion in 45 seconds, so the product was training
 * students to under-answer the real interview.
 */
export const QUESTIONS: Question[] = RAW.map((q, i) => ({
  ...q,
  id: `q-${String(i + 1).padStart(2, '0')}`,
  vertical: 'uk-precas',
  institutionId: null,
  timeLimitSeconds: answerSecondsFor(q.answerKind),
  readSeconds: readSecondsFor(q.answerKind),
}));

function fill(text: string, inst: Institution): string {
  return text
    .replaceAll('{{university}}', inst.name)
    .replaceAll('{{city}}', inst.city);
}

/** Resolve placeholders for one institution and strip the private rubric. */
export function publicQuestion(q: Question, inst: Institution): PublicQuestion {
  const { rubricNotes: _omit, ...rest } = q;
  return {
    ...rest,
    text: fill(q.text, inst),
    modelAnswer: fill(q.modelAnswer, inst),
    tips: q.tips.map((t) => fill(t, inst)),
  };
}

/** Server-side only. Keeps the rubric attached. */
export function resolvedQuestion(q: Question, inst: Institution): Question {
  return {
    ...q,
    text: fill(q.text, inst),
    modelAnswer: fill(q.modelAnswer, inst),
    tips: q.tips.map((t) => fill(t, inst)),
  };
}

/**
 * D-24. Questions the super admin adds, and questions a student asks for.
 *
 * `POST /api/super addQuestion` answered `{"id":"x-...","total":1}` and the
 * question was NEVER ASKED. `extraQuestions` in platform settings had two
 * writers, the admin screen and a student's own drill list, and **no reader
 * anywhere in the interview path** -- `eligiblePool()` and `buildQuestionPlan()`
 * returned only the hardcoded array below. So two separate promises were
 * silently broken, one of them to a student who had paid.
 *
 * Read through a primed cache rather than by making every call site async.
 * `getQuestion` is called from six places including a page render, and turning
 * all of them async to reach one setting would be a far larger change than the
 * bug deserves. Server routes call `primeExtraQuestions()` once at the top; the
 * sync functions then see the merged pool.
 */
let EXTRA: Question[] = [];

export async function primeExtraQuestions(): Promise<void> {
  try {
    const { platform } = await import('@/lib/platform');
    const s = await platform.getSettings();
    EXTRA = (s.extraQuestions ?? []).map((q) => ({
      id: q.id,
      vertical: 'uk-precas' as const,
      institutionId: null,
      category: (q.category as Question['category']) ?? 'conversational',
      text: q.text,
      timeLimitSeconds: 60,
      tips: [],
      modelAnswer: '',
      // The admin writes the intent; it is the private note the evaluator uses
      // and is never sent to the browser.
      rubricNotes: q.intent ?? '',
    }));
  } catch {
    // A settings read failure must never take the question bank down with it.
    EXTRA = [];
  }
}

/** The vetted bank plus anything added since, without a deploy. */
function pool(): Question[] {
  return EXTRA.length ? [...QUESTIONS, ...EXTRA] : QUESTIONS;
}

export function getQuestion(id: string): Question | undefined {
  return pool().find((q) => q.id === id);
}

/**
 * Build the question list for a session. Order is fixed at creation so that a
 * resumed session is deterministic. Trial sessions get the first `limit`
 * questions, which are chosen to span the full range of categories rather than
 * being the easy opening ones.
 */
/**
 * The paper for one sitting (N-26, N-27, Q-4).
 *
 * This used to be fully deterministic: every student on the platform received
 * the same ten questions in the same order. That is the worst possible property
 * for this product. Ten students in one consultancy lab compare notes, memorise
 * the set, and walk into a credibility interview with rehearsed answers — which
 * is the single thing the real interview is designed to catch. We would have
 * been coaching students into failing.
 *
 * So the plan is now **stratified random**, not random:
 *
 *   - it always opens with an introduction question, because a real interview
 *     does, and dropping a student into "how will you fund your studies" as the
 *     first thing they hear is not a rehearsal of anything;
 *   - it then takes one question from each category in turn, so the trial still
 *     spreads across the themes and still diagnoses a genuine weak spot. Pure
 *     shuffling would sometimes hand somebody six finance questions and tell
 *     them nothing about the rest;
 *   - WHICH question fills each slot is random.
 *
 * Randomness is drawn only from the vetted bank (N-27). A student who practises
 * three mocks and then meets nothing familiar has been cheated, and "it was
 * random" is not a defence.
 *
 * The result is stored on the session as `questionIds`, so the paper is fixed
 * at creation and a resume is deterministic (Q-4, N-45). Random once, never
 * random again.
 */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * N-27. Everything the plan can draw from, and nothing else.
 *
 * Randomness is bounded by this function. A question can only appear in a
 * student's paper if it is in the vetted bank — it is never generated, never
 * paraphrased, and never invented to fill a slot. A student who practises three
 * mocks and then meets nothing familiar has been cheated, and "it was random"
 * is not a defence.
 */
export function eligiblePool(): Question[] {
  return pool();
}

/**
 * Questions that can open a topic. Probes are excluded: a probe asked cold
 * ("Where did the money in that account come from?" as question one) is
 * nonsense, and it would also give away that the product does not understand
 * its own material.
 */
function rootPool(): Question[] {
  return pool().filter((q) => !q.isProbe);
}

/** Probes for one category, shuffled. */
function probesFor(category: string): Question[] {
  return shuffled(pool().filter((q) => q.isProbe && q.category === category));
}

export function buildQuestionPlan(limit: number): string[] {
  const QUESTIONS = rootPool();
  if (limit >= QUESTIONS.length) return withProbes(QUESTIONS.map((q) => q.id), limit);

  // Openers first. A real interview starts by asking who you are, so the
  // 'identity' category always fills slot one.
  const openers = QUESTIONS.filter((q) => q.category === 'identity');
  const picked: string[] = [];
  if (openers.length > 0) picked.push(shuffled(openers)[0]!.id);

  // One bucket per category, each internally shuffled.
  const buckets = new Map<string, string[]>();
  for (const q of shuffled(QUESTIONS)) {
    if (picked.includes(q.id)) continue;
    const list = buckets.get(q.category) ?? [];
    list.push(q.id);
    buckets.set(q.category, list);
  }

  // Round-robin across categories so coverage stays even however many we need.
  const order = shuffled([...buckets.keys()]);
  let progress = true;
  while (picked.length < limit && progress) {
    progress = false;
    for (const cat of order) {
      if (picked.length >= limit) break;
      const list = buckets.get(cat);
      if (list && list.length > 0) {
        picked.push(list.shift()!);
        progress = true;
      }
    }
  }
  return withProbes(picked, limit);
}

/**
 * Put probes where an interviewer would put them: straight after an answer on
 * the same topic, never anywhere else.
 *
 * This is deliberately NOT conditional on how the student answered. Branching
 * on a live evaluation would mean the interview could not be planned in
 * advance, and every guard in this product -- resume, entitlement, the stored
 * plan -- assumes a plan that exists before the first question is asked.
 * Placing the probe unconditionally gives the student the real experience of
 * being followed up on, without turning a working state machine into a
 * research project the week we ship.
 *
 * The count is bounded at about a third of the sitting. A mock that is half
 * probes stops being an interview and becomes an interrogation, and the
 * published banks are mostly first-level questions.
 */
function withProbes(rootIds: string[], limit: number): string[] {
  const maxProbes = Math.floor(limit / 3);
  if (maxProbes < 1) return rootIds.slice(0, limit);

  const used = new Set<string>();
  const out: string[] = [];

  for (const id of rootIds) {
    if (out.length >= limit) break;
    out.push(id);

    if (out.length >= limit) break;
    if (used.size >= maxProbes) continue;

    const root = getQuestion(id);
    // The closing question ends the interview. Nothing follows it.
    if (!root || root.answerKind === 'closing' || root.category === 'identity') continue;

    const probe = probesFor(root.category).find((x) => !used.has(x.id));
    if (probe) {
      used.add(probe.id);
      out.push(probe.id);
    }
  }
  return out.slice(0, limit);
}

/**
 * D18 practice mode: one question at a time.
 *
 * A full mock is the exam. Practice is the drill you do between exams, so it is
 * a single question, optionally from the category the student is weakest in.
 * The results page then tells them about that one answer, which is the fastest
 * useful loop in the product.
 */
export function buildPracticePlan(category?: string): string[] {
  // D-24. Practice draws from the merged pool too, or a question the admin
  // added is asked in a mock and never in a drill.
  const all = pool();
  // A probe only makes sense after an answer, so practice draws from roots.
  const roots = all.filter((q) => !q.isProbe);
  const bucket = category ? roots.filter((q) => q.category === category) : roots;
  const from = bucket.length > 0 ? bucket : all;
  const pick = from[Math.floor(Math.random() * from.length)]!;
  return [pick.id];
}

/** Categories that actually have questions, for the practice picker. */
export function practiceCategories(): string[] {
  return [...new Set(pool().map((q) => q.category))];
}
