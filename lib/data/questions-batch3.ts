import type { Draft } from '@/lib/data/question-draft';

/**
 * THE THIRD LOAD (7 September 2026): enough bank for ten sittings with no
 * repeats, and the openers a real interview actually uses.
 *
 * Why this batch exists. The first customer feedback on the live product was
 * that a paper did not feel like the student's university, and the second
 * thing the client asked for is that a student who buys ten mocks never hears
 * the same question twice. A full sitting is 17 questions, about 12 roots and
 * 5 probes, so ten sittings need at least 120 roots and 50 probes with even
 * category coverage. The bank held 95 roots and 29 probes, and only THREE
 * openers, so every fourth mock would have re-used an introduction.
 *
 * Every question below is taken from the 17 August harvest
 * (PreCAS-question-bank.xlsx, 401 questions from 33 fetched pages) and the
 * per-university guidance pages listed in lib/data/institution-facts.ts.
 * Each entry names its source in a comment. Nothing is invented. Where a
 * university publishes the question on its own offer-holder page, its
 * institution id is in `publishedBy`, and the plan prefers it for that
 * university (Q-12).
 *
 * Placeholders: {{university}}, {{city}}, {{ukviMonthly}}, {{ukviBand}},
 * {{ukviTotal}} are resolved per institution from institution-facts.ts.
 * No money figure is typed into any question here; when GOV.UK changes the
 * number, institution-facts.ts is the one edit.
 *
 * Model answers are structures in the simple spoken English a Nepali student
 * can produce, never scripts. Rubric notes are private.
 */

const ABERDEEN = 'inst-university-of-aberdeen';
const READING = 'inst-university-of-reading';
const BROOKES = 'inst-oxford-brookes-university';
const HALLAM = 'inst-sheffield-hallam-university';
const STAFFS = 'inst-staffordshire-university';
const BRADFORD = 'inst-university-of-bradford';
const WESTMINSTER = 'inst-university-of-westminster';
const BOURNEMOUTH = 'inst-bournemouth-university';
const MIDDLESEX = 'inst-middlesex-university';
const LINCOLN = 'inst-university-of-lincoln';
const PORTSMOUTH = 'inst-university-of-portsmouth';
const BCU = 'inst-birmingham-city-university';
const HERTS = 'inst-university-of-hertfordshire';
const NORTHUMBRIA = 'inst-northumbria-university';
const COVENTRY = 'inst-coventry';
const COVENTRY_LONDON = 'inst-coventry-university-london';
const KENT = 'inst-university-of-kent';

export const BATCH3: Draft[] = [
  // =========================================================================
  // IDENTITY. Seven more openers, so ten sittings can each start differently.
  // A real interview opens by establishing who is speaking; the published
  // lists (Edwise, Optimus, Meridean, Staffordshire, Aberdeen) all start here.
  // =========================================================================
  {
    // Source: Meridean "Give self-introduction", Optimus "Tell me about yourself".
    category: 'identity',
    text: 'Tell me about yourself: where you are from, what you have studied, and what you are doing now.',
    answerKind: 'intro',
    tips: [
      'Three parts: where you are from, your last qualification, what you do today.',
      'Say your target course at {{university}} in the last sentence.',
      'Thirty to forty seconds. Do not tell your whole life story.',
    ],
    modelAnswer:
      'I am [name], from [city] in Nepal. I completed my [qualification] in [subject] from [college] in [year]. At the moment I am [working as [role] at [company] / preparing for my studies]. I have applied for the [course] at {{university}} starting in [month].',
    rubricNotes:
      'Opener. Looking for place, qualification, current activity and the target course, in order. Penalise an answer over 60 seconds or under 15. Do not penalise accent or hesitation.',
  },
  {
    // Source: Staffordshire guide "What is your current occupation?"
    category: 'identity',
    text: 'What is your current occupation, and how long have you been doing it?',
    answerKind: 'factual',
    publishedBy: [STAFFS],
    tips: [
      'Say the job title, the employer and the start month.',
      'If you are not working, say what you do with your days instead.',
      'Do not upgrade a job title. The offer letter and the CV are already on file.',
    ],
    modelAnswer:
      'I work as a [role] at [company] in [city]. I started in [month year], so it has been about [length]. My main work is [one real task]. / I am not working at the moment. Since [month] I have been [preparing for IELTS / helping in the family business / looking after [responsibility]].',
    rubricNotes:
      'Factual. Wants title, employer, start date and one concrete duty. Cross-check the dates against the study-gap and salary answers later in the sitting. "Business" with no detail is a flag.',
  },
  {
    // Source: Aberdeen "What was the last course of study you completed and when?"
    category: 'identity',
    text: 'What was the last course you completed, and when did you finish it?',
    answerKind: 'factual',
    publishedBy: [ABERDEEN],
    tips: [
      'Full name of the qualification, the college, and the month and year you finished.',
      'If you finished but the certificate came later, say both dates.',
      'This is a date question. Know your own dates.',
    ],
    modelAnswer:
      'My last course was a [Bachelor of / Master of / +2 in] [subject] at [college], under [university or board]. I finished my final exams in [month year] and received the certificate in [month year].',
    rubricNotes:
      'Consistency anchor for the whole sitting: the gap, the work history and the savings story must all fit this date. Vagueness about their own graduation date is a serious flag.',
  },
  {
    // Source: harvest "Tell me about your family" (Bradford "Do you have family in your home country?",
    // Aberdeen "How many people are dependent on their income?").
    category: 'identity',
    text: 'Tell me about your family. Who do you live with, and what do they do?',
    answerKind: 'explanatory',
    tips: [
      'Parents, brothers and sisters, and what each one does for a living.',
      'Say who depends on the family income. It comes up again in the money questions.',
      'Short and plain. This is not a test of English, it is a test of consistency.',
    ],
    modelAnswer:
      'I live with my parents in [city]. My father is a [occupation] and my mother is a [occupation / at home]. I have [number] [brothers/sisters]; one is [studying / working as]. My [relation] is the main earner and [number] people depend on that income.',
    rubricNotes:
      'Sets up the sponsor and dependants facts that the finance probes will test. Note the number of dependants and the earner named here; a different sponsor later is a contradiction.',
  },
  {
    // Source: harvest "11. English ability" layer; consultancy guides (NWC, Edwise) ask about the English test.
    category: 'identity',
    text: 'Which English test did you take, what score did you get, and which part was hardest for you?',
    answerKind: 'factual',
    tips: [
      'Name the test, the overall score and the date.',
      'Say honestly which section was hardest and what you did about it.',
      'If your university waived the test, say what evidence they accepted instead.',
    ],
    modelAnswer:
      'I took [IELTS / PTE / Duolingo / OIETC] in [month year] and scored [overall], with [band] in [weakest section]. [Section] was hardest because [reason]. I worked on it by [one concrete thing]. / {{university}} accepted my [qualification] in place of a test.',
    rubricNotes:
      'Factual. Wants test, score, date, weakest section. The spoken English in this answer is itself the evidence; do not penalise accent. A claimed 7.5 with an answer that does not reach a sentence is a flag for the memorisation check.',
  },
  {
    // Source: consultancy guides (Optimus, Meridean) and the Brunel CAS Shield policy: interviewers open
    // by checking the student understands what the interview is for.
    category: 'identity',
    text: 'Do you know why this interview is taking place, and what we are trying to find out?',
    answerKind: 'explanatory',
    tips: [
      'It checks that you are a genuine student who has researched the course and can pay for it.',
      'Say it in your own words. Do not recite a definition.',
      'Add one sentence about why you are comfortable with that.',
    ],
    modelAnswer:
      'I understand the university has to be sure I am a genuine student before it gives me a CAS. So you want to know that I chose {{university}} and my course for real reasons, that I understand what I will study, and that my family can pay for it. I am happy to answer, because I have done the research myself.',
    rubricNotes:
      'Looking for genuine understanding: sponsor duty, genuineness, funding, course knowledge. A recited legal definition scores low on personal truth. Reward "I did the research myself".',
  },
  {
    // Source: consultancy guides (NWC, Edwise) "How did you prepare for this interview?"; the memorisation
    // check the universities describe (Oxford Brookes: general answers anyone could give).
    category: 'identity',
    text: 'How did you prepare for this interview?',
    answerKind: 'explanatory',
    tips: [
      'Name the real things you read: the course page, the module list, the accommodation page.',
      'It is fine to say a consultancy helped. Say what you did yourself.',
      'Do not say you memorised answers. Say you learned the facts.',
    ],
    modelAnswer:
      'I read the course page for [course] at {{university}} and wrote down the modules. I checked the accommodation options and the cost of living in {{city}}. I also sat with my [relation] and went through the money plan so I know the real numbers. My consultancy explained the format, but the facts I learned myself.',
    rubricNotes:
      'Reward named sources (course page, module list, accommodation page). "My consultancy prepared me" with nothing of the student\'s own is a dependence flag. Cross-check the module and cost claims against later answers.',
  },

  // =========================================================================
  // EDUCATION
  // =========================================================================
  {
    // Source: The Mentors Circle "What was your final percentage or CGPA?"; Bradford "Where have you
    // studied previously".
    category: 'education',
    text: 'What was your final percentage or GPA, and how does it compare with what {{university}} asked for?',
    answerKind: 'factual',
    tips: [
      'Say the real number and the grading system it is in.',
      'Then say the entry requirement from your offer letter.',
      'If you were below it and got an offer anyway, say what else they considered.',
    ],
    modelAnswer:
      'I finished with [percentage / GPA] out of [scale], which is [division / class]. {{university}} asked for [requirement] for this course, so I meet it. [If lower: they also considered my [work experience / statement of purpose].]',
    rubricNotes:
      'Factual. The transcript is already on file, so the test is whether the student knows their own result and the entry requirement. Not knowing the requirement is a research flag.',
  },
  {
    // Source: Reading "If you have studied in the UK previously were your studies successful, and have you
    // considered the Student visa time limit?"
    category: 'education',
    text: 'If you have studied in the UK before, did you complete that course, and how much of your Student visa time limit have you used?',
    answerKind: 'factual',
    publishedBy: [READING],
    tips: [
      'If you have never studied in the UK, say so in one sentence.',
      'If you have, say the course, the outcome, and the dates of that visa.',
      'Know the five-year limit at degree level. It is a real rule.',
    ],
    modelAnswer:
      'I have not studied in the UK before; this is my first UK visa. / I studied [course] at [institution] from [year] to [year] and completed it with [result]. That visa used [n] years of the time allowed at degree level, so this course fits inside the limit.',
    rubricNotes:
      'Most Nepali applicants answer "never". For a returner, wants completion, dates, and awareness of the time cap (broadly five years at degree level). Never help hide an incomplete course; UKVI holds the record.',
  },
  {
    // Source: Staffordshire "Do you have relatives who have studied at a similar level or studied overseas?"
    category: 'education',
    text: 'Does anyone in your family have a degree, or has anyone studied overseas before you?',
    answerKind: 'factual',
    publishedBy: [STAFFS],
    tips: [
      'A simple yes or no, then one sentence of detail.',
      'Being the first in your family is a good answer if you say why it matters to you.',
      'If a relative is abroad, say where and what they do. It will be checked against your immigration answers.',
    ],
    modelAnswer:
      'Yes, my [relation] did a [degree] at [place] and now works as [job]. Talking to them is one reason I chose this course. / No, I would be the first in my family to study abroad, which is why my parents and I planned this carefully.',
    rubricNotes:
      'Cross-check against the relatives-abroad answers in the immigration theme. A relative in the UK named here and denied later is a contradiction. First-in-family is a positive if it comes with a reason.',
  },
  {
    // Source: The Mentors Circle "How has your previous academic background prepared you for this programme?"
    category: 'education',
    text: 'Describe one project or assignment from your previous studies that prepared you for this course.',
    answerKind: 'explanatory',
    tips: [
      'One real project. What it was, what you did, what the result was.',
      'Link it to one named module in the new course.',
      'A small real project beats a big invented one.',
    ],
    modelAnswer:
      'In my final year I did a project on [topic] where I [what you did]. The result was [outcome]. The [module] in my new course at {{university}} goes deeper into exactly that, so I already know the basics and I know why I want to learn more.',
    rubricNotes:
      'Wants a specific, checkable project with an outcome and a named module link. Generic "we did many projects" scores low on specificity. Detail that can be probed is the point.',
  },

  // =========================================================================
  // STUDY GAP
  // =========================================================================
  {
    // Source: BCU "You have had a (long) break in your studies, why are you returning to study now?";
    // Leverage Edu "Why are you starting your studies again now after such a long break?"
    category: 'study_gap',
    text: 'Why are you returning to study now, rather than two years ago or two years from now?',
    answerKind: 'explanatory',
    publishedBy: [BCU],
    tips: [
      'Give the real trigger: a promotion you could not get, a change at home, savings reaching the target.',
      'Say why this year and not earlier.',
      'One honest reason is stronger than three general ones.',
    ],
    modelAnswer:
      'Two years ago I could not afford it and I had not decided my field. Since then I worked at [company], which showed me I need [skill] to move up, and my family completed the savings for this in [month]. So this intake is the first one that made sense for both my career and our money.',
    rubricNotes:
      'Timing logic. Wants a concrete trigger tied to dates that match the work and savings answers. "I always wanted to study abroad" alone is generic. Never help construct a reason that is not there.',
  },
  {
    // Source: Gloucestershire "If you have had a significant break in your studies, why do you want to
    // return to the UK?"; Brookes gap question.
    category: 'study_gap',
    text: 'After a break from study, what makes you confident you can cope with full-time academic work again?',
    answerKind: 'explanatory',
    tips: [
      'Name something you have done recently that needed study discipline: IELTS, a certificate, a course at work.',
      'Say how you will manage time in the first month.',
      'Do not pretend it will be easy. Say how you will handle it.',
    ],
    modelAnswer:
      'I prepared for [IELTS / a professional certificate] this year, studying [hours] a day while working, and I got [result]. That showed me I can still study with discipline. At {{university}} I plan to use the first month to set a routine and use the academic support they offer for international students.',
    rubricNotes:
      'Wants recent evidence of study discipline and a plan, not reassurance. Reward a named recent qualification with a date. Penalise "I am a hard worker" with nothing behind it.',
  },
  {
    // Source: Edwise "Do you have any study gaps, and what did you do during them?"; Aberdeen postgraduate gap.
    category: 'study_gap',
    text: 'Between finishing your last course and today, which months were you not working and not studying, and what were you doing then?',
    answerKind: 'explanatory',
    tips: [
      'Account for every block of time, month by month if you can.',
      'Family responsibility, illness and exam preparation are all real reasons. Say them plainly.',
      'Do not leave dark months. The interviewer will find them.',
    ],
    modelAnswer:
      'I finished in [month year]. From [month] to [month] I prepared for [exam]. From [month] to [month] I was at home helping my family with [responsibility]. From [month] I have been working at [company]. There were about [n] months with no job, and I used them to [what].',
    rubricNotes:
      'Month-accounting. Wants dated blocks with no gaps. Cross-check against the occupation and salary answers. A student who cannot account for a year is one of the strongest refusal signals; the feedback must say so kindly and clearly.',
  },

  // =========================================================================
  // WHY THE UK
  // =========================================================================
  {
    // Source: Bournemouth "What specific aspects of the UK's education system appeal to you?";
    // Coventry "What you know about the UK education system".
    category: 'why_uk',
    text: 'What is different about how a UK university teaches, and why does that suit you?',
    answerKind: 'explanatory',
    publishedBy: [BOURNEMOUTH, COVENTRY, COVENTRY_LONDON],
    tips: [
      'Name one real feature: coursework-based assessment, a dissertation, a placement year, independent study.',
      'Then say why that fits how you learn.',
      'Saying "one-year masters" alone is what everyone says. Add something specific.',
    ],
    modelAnswer:
      'In Nepal most of my marks came from final exams. At {{university}} my course is assessed mostly by [coursework and a dissertation / projects], and there is a lot of independent reading. That suits me because [reason from your own experience]. It also has [placement / a professional body link], which I could not get at home.',
    rubricNotes:
      'Reward a named, checkable feature tied to the actual course. "Quality education" and "one-year masters" alone are the generic answers Oxford Brookes warns fail. Penalise recitation.',
  },
  {
    // Source: Bournemouth "How did you decide that the UK was the best place for you to achieve your
    // academic goals?"; Westminster "What are your reasons for studying in the UK?"
    category: 'why_uk',
    text: 'Walk me through how you decided on the UK. What did you compare, and who did you talk to?',
    answerKind: 'explanatory',
    publishedBy: [BOURNEMOUTH, WESTMINSTER],
    tips: [
      'Describe the actual steps: which countries, which websites, which people.',
      'Say what made you drop the other options.',
      'A decision with steps sounds real. A decision with only adjectives does not.',
    ],
    modelAnswer:
      'I started with [country A] and [country B] as well as the UK. I compared course length, total cost and whether the course had [feature]. I spoke to [relation or friend] who studied in [place]. The UK won because [one or two concrete reasons], and {{university}} because [one reason].',
    rubricNotes:
      'Decision process. Wants named alternatives, criteria and a person consulted. An answer that names only the UK\'s strengths without a comparison is weak on genuine intent.',
  },
  {
    // Source: Reading "How would study in the UK differ from studying in your home country?"
    category: 'why_uk',
    text: 'Could you have studied this subject in Nepal? What would you miss by studying at home?',
    answerKind: 'comparative',
    publishedBy: [READING],
    tips: [
      'Be fair to Nepal. Say what is available there.',
      'Then name the specific thing your UK course has that the Nepali option does not.',
      'Cost is a reason against the UK, so explain why it is still worth it for you.',
    ],
    modelAnswer:
      'Yes, [college] in Nepal offers a similar [subject] course. But it does not have [module / specialisation / accreditation / placement] that the course at {{university}} has, and employers in [field] in Nepal value a UK qualification for [reason]. It costs much more, and my family and I decided it is worth it because [reason].',
    rubricNotes:
      'Comparative. Reward a named Nepali alternative and a specific gap. Penalise "Nepal has no good universities", which is both untrue and generic. The cost acknowledgement is a positive.',
  },

  // =========================================================================
  // WHY THIS UNIVERSITY
  // =========================================================================
  {
    // Source: Bournemouth "What role did the university's links to industry, placements, or rankings play
    // in your choice?"; Bradford "What facilities are unique to your course/needs?"
    category: 'why_university',
    text: 'What did you find out about {{university}} that you could not have said about any other university?',
    answerKind: 'explanatory',
    publishedBy: [BOURNEMOUTH, BRADFORD],
    tips: [
      'One fact that is true of {{university}} and not of the others you looked at.',
      'A named facility, a named accreditation, a named partnership, a named module.',
      'If your fact is a ranking, add a second fact. Rankings alone are weak.',
    ],
    modelAnswer:
      'The thing that stood out was that {{aboutUniversity}}. I checked and the other universities I applied to, [names], did not offer that. It matters for me because [reason tied to your plan]. The campus is in {{city}}, which also fits my budget.',
    rubricNotes:
      'The distinctiveness test. Reward a checkable fact and an explicit comparison. Rankings-only and "good reputation" score low on genuine intent (Oxford Brookes: it is not enough to rely on rankings). A fact that belongs to a different university is a serious flag; check against the university facts you are given.',
  },
  {
    // Source: Sheffield Hallam / Staffordshire "Where is the college / university?"; Middlesex "Where is
    // your institution?"; Aberdeen "Where is the University of Aberdeen?"
    category: 'why_university',
    text: 'Where exactly is {{university}}, and how would you get there from the airport on your first day?',
    answerKind: 'factual',
    publishedBy: [HALLAM, STAFFS, MIDDLESEX, ABERDEEN],
    tips: [
      'City, the part of the city, and the nearest station.',
      'Which airport you land at and roughly how long the journey takes.',
      'If the university offers an airport pick-up, say so.',
    ],
    modelAnswer:
      'The campus is in {{city}}, in the [area] part of the city, near [station]. I will land at [airport] and take [train / coach] to {{city}}, which takes about [time]. {{university}} offers [a meet-and-greet service / arrival advice], and I have booked [accommodation] near the campus.',
    rubricNotes:
      'Factual research check. Wants area, nearest station, arrival airport and a realistic journey. Check the city against the university facts. Not knowing which city the campus is in is a serious flag.',
  },
  {
    // Source: NWC "Do you know any alumni of this university? What are their experiences?"; Sheffield
    // Hallam "Do you know anyone else who has already studied there?"
    category: 'why_university',
    text: 'Have you spoken to any current students or graduates of {{university}}? What did they tell you?',
    answerKind: 'explanatory',
    publishedBy: [HALLAM, STAFFS],
    tips: [
      'If yes: who, how you know them, and one specific thing they said.',
      'If no: say what you read instead, such as student reviews or the university\'s own pages.',
      'Do not invent a cousin. It will be asked about again.',
    ],
    modelAnswer:
      'Yes, [name or relation] studied [course] there and finished in [year]. They told me [one specific thing about teaching, the campus or the city]. / No, I do not know anyone personally, so I read [student reviews / the international student pages] and watched [the university\'s own videos] to understand the campus.',
    rubricNotes:
      'Reward a specific relayed detail. A named relative in the UK here must match the immigration answers. "No" with real alternative research is a fine answer; do not penalise it.',
  },
  {
    // Source: The Mentors Circle "How did you first hear about this university, and who assisted with your
    // application?"; Bournemouth "What did you discover about BU that influenced your decision?"
    category: 'why_university',
    text: 'Who first suggested {{university}} to you, and what did you check for yourself before accepting the offer?',
    answerKind: 'explanatory',
    tips: [
      'It is fine if a consultancy or a friend suggested it. Say so.',
      'Then list what you personally checked: the course page, fees, the city, the modules.',
      'The interviewer wants to hear that the decision is yours.',
    ],
    modelAnswer:
      'My [consultancy / friend / relation] first mentioned {{university}}. Before I accepted, I checked the course page and the module list, the total fees, the accommodation costs in {{city}} and the entry requirements. I also compared it with [other university]. In the end I chose it because [one specific reason].',
    rubricNotes:
      'Agent involvement is normal; agent dependence is the flag. Reward a list of things the student personally verified. "They selected it for me" with nothing else must be named honestly in feedback.',
  },
  {
    // Source: Oxford Brookes "What facilities and support services does the university offer?";
    // Bournemouth "How do BU's facilities, location, or student support services relate to your needs?"
    category: 'why_university',
    text: 'Which service or facility at {{university}} will you actually use in your first term, and why?',
    answerKind: 'explanatory',
    publishedBy: [BROOKES, BOURNEMOUTH],
    tips: [
      'One named thing: the library, a lab, the careers service, the international student office, a society.',
      'Say what you will use it for.',
      'Choose something that fits your course, not the gym.',
    ],
    modelAnswer:
      'I will use the [named facility, for example the [subject] lab or the careers service] because my course needs [reason]. I also plan to go to the international student welcome sessions in the first week, and join the [society] to meet people from my subject.',
    rubricNotes:
      'Reward a named facility that fits the course. Generic "library and gym" scores low on specificity. Check any named facility against the university facts where possible; do not penalise a plausible one you cannot verify.',
  },

  // =========================================================================
  // WHY THIS COURSE
  // =========================================================================
  {
    // Source: The Mentors Circle "Name three core modules of your programme and explain what one covers";
    // Optimus "Can you name at least three modules".
    category: 'why_course',
    text: 'Name three core modules of your course, and explain what one of them actually covers.',
    answerKind: 'factual',
    tips: [
      'Three real module names from the course page.',
      'Pick one and say in plain words what you will learn in it.',
      'If the university has not published the modules yet, say which ones it lists as examples.',
    ],
    modelAnswer:
      'The core modules include [module one], [module two] and [module three]. [Module one] covers [what it covers in plain words], and I am interested in it because [reason linked to your work or plan].',
    rubricNotes:
      'The single most-used concrete probe in the harvest. Reward three real module names and a plain-language explanation of one. Names with no understanding invite the "explain your course in your own words" probe. Wrong-university module names are a serious flag.',
  },
  {
    // Source: Reading "What attracted you to study this course?"; Northumbria "What motivated you to
    // choose your course of study?"
    category: 'why_course',
    text: 'What first made you interested in this subject, and when did you decide to study it at this level?',
    answerKind: 'explanatory',
    publishedBy: [READING, NORTHUMBRIA],
    tips: [
      'A real moment: a job task, a teacher, a problem at home, a project.',
      'Then the date you decided to go further with it.',
      'Personal and specific beats impressive and general.',
    ],
    modelAnswer:
      'I first got interested in [subject] when [real moment, for example: I was handling [task] at work and realised I did not understand [thing]]. In [month year] I decided to study it properly, and when I compared courses the one at {{university}} covered [module], which is exactly the gap I had.',
    rubricNotes:
      'Wants an origin story with a date and a named module. Penalise "it has good scope" and "high demand" with nothing personal. Reward a work-linked or study-linked trigger.',
  },
  {
    // Source: Bournemouth "Did you explore similar courses at other institutions? What made this course the
    // most suitable?"
    category: 'why_course',
    text: 'You could study this subject at many universities. What is different about the version of the course at {{university}}?',
    answerKind: 'comparative',
    publishedBy: [BOURNEMOUTH],
    tips: [
      'Compare the actual course content: a module, a specialisation, a placement, a project.',
      'Name one other university\'s course you compared it with.',
      'If the courses are really similar, say what else decided it: cost, city, entry requirements.',
    ],
    modelAnswer:
      'I compared it with the [subject] course at [other university]. The course at {{university}} has [named module or feature] which the other does not, and it is assessed by [method], which suits me. [Other university] was [cheaper / in a bigger city], but the content here fits my plan better because [reason].',
    rubricNotes:
      'Comparative. Reward a named alternative and a content-level difference. Penalise a comparison built only on rankings or city. Check that the feature named belongs to this university.',
  },
  {
    // Source: Aberdeen "Why do you think this course will be beneficial for you or enhance your current
    // knowledge?"
    category: 'why_course',
    text: 'What can you do today, and what will you be able to do after this course that you cannot do now?',
    answerKind: 'explanatory',
    publishedBy: [ABERDEEN],
    tips: [
      'Two lists: what you can do now, what the course adds.',
      'Use one named module for the "after" part.',
      'End with the job or business that needs the new skill.',
    ],
    modelAnswer:
      'Today I can [current skill from work or study]. What I cannot do is [specific gap]. The [module] on this course teaches exactly that, and the [dissertation / project] will let me apply it. After the course I will be able to [new capability], which is what a [target role] in Nepal needs.',
    rubricNotes:
      'Before-and-after logic with a named module. Reward specific capabilities. Penalise an answer that lists course benefits with no link to the student\'s own current level.',
  },

  // =========================================================================
  // PROGRESSION
  // =========================================================================
  {
    // Source: Global Pathways "Why study at the same level again?"; Westminster "why you are studying
    // another course and why now".
    category: 'progression',
    text: 'You already hold a qualification at this level. What does a second one add that your first did not?',
    answerKind: 'comparative',
    publishedBy: [WESTMINSTER],
    tips: [
      'Be honest that it is the same level. Then say what is different in content.',
      'A change of field with a career reason is a good answer.',
      'Say what employers in your field ask for that your first degree lacks.',
    ],
    modelAnswer:
      'My first [degree] was in [subject] and it gave me [what]. This course is at the same level but in [different field or specialisation], and it adds [named module or skill] that my work in [field] now needs. Employers in Nepal for [role] specifically ask for [that], which my first degree did not cover.',
    rubricNotes:
      'Academic progression is a UKVI sponsor duty; a same-level course needs a coherent reason. Reward a specific content gap and a named career requirement. "For better opportunities" alone is a flag.',
  },
  {
    // Source: Global Pathways "Why are you changing subject?"; The Mentors Circle "Why are you not
    // continuing in your previous field of study?"
    category: 'progression',
    text: 'Why are you not continuing in the field you studied before?',
    answerKind: 'explanatory',
    tips: [
      'Say plainly what happened: the job market, a discovery at work, a family business.',
      'Show the bridge: one thing from the old field you will still use.',
      'Do not criticise your old subject. Explain your move.',
    ],
    modelAnswer:
      'I studied [old field] and worked in it for [time]. During that time I found that [honest reason, for example: the work I enjoyed most was actually [new field], or the jobs in my area were in [new field]]. I am not throwing away my old subject: [skill] from it will help me in [module] on the new course.',
    rubricNotes:
      'Subject switch. Reward an honest trigger and a named bridge between fields. A switch with no story is a genuineness flag; never help build one that is not there.',
  },

  // =========================================================================
  // FINANCE
  // =========================================================================
  {
    // Source: The Mentors Circle "What is the living-cost requirement set by UKVI for your course
    // location?"; Lincoln "What are the UKVI maintenance requirements?"
    category: 'finance',
    text: 'For a student at {{university}}, how much does UKVI say you must show for living costs, and for how many months?',
    answerKind: 'factual',
    publishedBy: [LINCOLN],
    tips: [
      'Know whether {{city}} counts as London or outside London for UKVI. It changes the figure.',
      'Say the monthly amount and the number of months.',
      'Say whether that money is already in the account and in whose name.',
    ],
    modelAnswer:
      '{{university}} is {{ukviBand}} for UKVI, so I must show {{ukviMonthly}} a month for nine months, which is {{ukviTotal}}, plus my first-year fee that is not yet paid. That money has been in my [relation]\'s account at [bank] since [month], so it meets the 28-day rule.',
    rubricNotes:
      'The correct figure for this campus is {{ukviMonthly}} a month ({{ukviBand}}) for 9 months, {{ukviTotal}} in total. A student who quotes the other band has not researched their own city; say so. Reward the 28-day awareness and naming whose account it is.',
  },
  {
    // Source: The Mentors Circle "Have you paid the tuition deposit? How much, and on what date?";
    // Optimus "how much deposit have you paid?"
    category: 'finance',
    text: 'Have you paid a tuition deposit? How much, when, and from which account did it go?',
    answerKind: 'factual',
    tips: [
      'Amount, date, and the account it was paid from.',
      'If the deposit came from a different person than your main sponsor, explain why.',
      'This is on the university\'s own records. Get it right.',
    ],
    modelAnswer:
      'Yes. I paid a deposit of [amount] on [date] from my [relation]\'s account at [bank], the same account that holds my living-cost money. / Not yet; my offer says the deposit is due by [date] and my [relation] will pay it from [account].',
    rubricNotes:
      'Factual, and the university already holds the receipt. A deposit from an unexplained third party is a provenance flag. Cross-check the payer against the sponsor named elsewhere.',
  },
  {
    // Source: The Mentors Circle "How did your sponsor accumulate these funds, and over what period?";
    // Edwise "How were the funds arranged?"
    category: 'finance',
    text: 'How did your sponsor build up the money for your studies, and over how long?',
    answerKind: 'explanatory',
    tips: [
      'Salary, business income, land sale, savings: name the real source.',
      'Say roughly how many years it took.',
      'If part of it is a loan, say so now, not when they find it.',
    ],
    modelAnswer:
      'My [relation] has been saving from [salary at [employer] / the income of [business]] for about [n] years. Part of the total came from [sale of land in [year] / a fixed deposit that matured in [month]]. [If a loan: [amount] is an education loan from [bank], sanctioned on [date].] The rest has been in the account since [month].',
    rubricNotes:
      'Provenance over years, not weeks. Wants a source, a period, and any lump sums explained. A large sum with no history is the classic flag; cross-check with the deposit-timing probe if it fires.',
  },
  {
    // Source: The Mentors Circle "Is your education loan sanctioned or disbursed? Which bank, and what is the
    // sanctioned amount?"; Innovation Immigration "Have you taken an education loan?"
    category: 'finance',
    text: 'If you have an education loan, which bank is it from, how much is sanctioned, and has it been paid out yet?',
    answerKind: 'factual',
    tips: [
      'If no loan, say so in one sentence.',
      'If yes: bank, sanctioned amount, whether it is disbursed, and what security was given.',
      'Know the difference between sanctioned and disbursed. Interviewers do.',
    ],
    modelAnswer:
      'I have no loan; the funding is from my [relation]\'s savings. / Yes, an education loan of [amount] from [bank], sanctioned on [date] against [property / fixed deposit] as security. [It is disbursed and in the account / it will be disbursed once the CAS is issued.] Repayment starts [when], over [years].',
    rubricNotes:
      'Factual. Wants bank, amount, status, security and repayment plan. A loan that is neither sanctioned nor disbursed cannot count as available funds; say so plainly. Cross-check the repayment plan against the expected salary answer.',
  },
  {
    // Source: Portsmouth "If you are a sponsored student, what does your sponsorship cover?"; NWC "Do you
    // have any scholarship awards or financial aid?"
    category: 'finance',
    text: 'Does anyone other than your family contribute: a scholarship, an employer, a government scheme? What exactly does it cover?',
    answerKind: 'factual',
    publishedBy: [PORTSMOUTH],
    tips: [
      'If nothing, say clearly that your family funds everything.',
      'If yes: the name of the award, the amount, and what it does not cover.',
      'Have the award letter details in your head.',
    ],
    modelAnswer:
      'No, my family is funding everything. / Yes, {{university}} gave me a [named scholarship] of [amount] off the tuition fee, confirmed on [date]. It covers [what] and does not cover [living costs / the rest of the fee], which my [relation] pays.',
    rubricNotes:
      'Factual. Reward exact award name, amount and what is excluded. A claimed scholarship the university facts do not mention is not automatically false, but ask for the letter in feedback.',
  },
  {
    // Source: Staffordshire "Do you know the likely hourly rate of pay?" and "How reliant are you on being
    // able to work?"
    category: 'finance',
    text: 'If you work part-time in the UK, what would you realistically earn, and does your plan depend on it?',
    answerKind: 'factual',
    publishedBy: [STAFFS],
    tips: [
      'Know the current minimum wage for your age, roughly.',
      'Twenty hours a week in term time is the limit at degree level.',
      'The right answer is that your budget works with zero part-time income.',
    ],
    modelAnswer:
      'The minimum wage is around [amount] an hour for my age, and I can work up to 20 hours a week in term time, so at most about [amount] a month. But my budget does not depend on it. My fees and the {{ukviMonthly}} a month living cost are covered by my [relation]. Any part-time work would be for experience and small extras.',
    rubricNotes:
      'The dependence test. Any plan that needs part-time income to cover fees or the UKVI amount is a refusal signal; say so. Reward knowing the 20-hour limit and a realistic rate. Do not penalise a rough wage figure.',
  },

  // =========================================================================
  // ACCOMMODATION AND LIVING
  // =========================================================================
  {
    // Source: Sheffield Hallam "Have you already arranged accommodation?"; The Mentors Circle "How will you
    // arrange your accommodation in the UK?"
    category: 'accommodation',
    text: 'Have you already arranged your accommodation, or when and how will you do it?',
    answerKind: 'factual',
    publishedBy: [HALLAM],
    tips: [
      'Booked or not booked. Then the name of the hall or the area.',
      'If not booked, say the deadline and the options you have shortlisted.',
      'Know the weekly cost of your first choice.',
    ],
    modelAnswer:
      'I have booked [hall name / a room in [area]] through [university accommodation / a private provider] for [weeks] at about [amount] a week, starting [date]. / I have not booked yet. The university accommodation deadline is [date], and I have shortlisted [hall] and [hall]; I will book once the CAS is issued.',
    rubricNotes:
      'Factual. Wants a named option, a cost per week and a date. Cross-check the weekly cost against the monthly budget given elsewhere. "I will find something when I arrive" is a research flag.',
  },
  {
    // Source: NWC "Why are you interested in the specific city where you'll study?"; The Mentors Circle
    // "What specifically attracted you to [city name]?"
    category: 'accommodation',
    text: 'Apart from the university, why {{city}}? What do you know about living there as a student?',
    answerKind: 'explanatory',
    tips: [
      'Two real facts about {{city}}: size, transport, cost, a community, a local industry.',
      'Say how it fits your budget and your subject.',
      'Do not describe London if your campus is not in London.',
    ],
    modelAnswer:
      '{{city}} is a [size] city with [one real fact, for example a big student population or a particular industry]. For UKVI it counts as {{ukviBand}}, so living costs are [manageable / higher, and I have budgeted for it]. There is [a Nepali community / good bus and train links], and it has [employers in my field], which matters for my placement and my plans.',
    rubricNotes:
      'City knowledge. Reward two checkable facts and awareness of the {{ukviBand}} cost band. A description that is clearly of a different city is a serious flag; check against the university facts.',
  },
  {
    // Source: Staffordshire "Do you need a meet and greet service?" / "Will you need help finding
    // accommodation?"; Aberdeen airport and travel questions.
    category: 'accommodation',
    text: 'What happens in your first week in the UK? Where will you sleep on night one, and what will you sort out first?',
    answerKind: 'explanatory',
    publishedBy: [STAFFS],
    tips: [
      'Night one: the hall, a hotel, or a relative. Name it.',
      'First tasks: police registration if needed, BRP or eVisa, bank account, SIM, enrolment.',
      'Show you have read the university\'s arrival guide.',
    ],
    modelAnswer:
      'I arrive on [date] and go straight to [hall / address], which I have booked from that night. In the first week I will collect my [BRP / set up my eVisa], open a bank account, get a SIM, and attend enrolment and the international welcome at {{university}} on [date]. The university\'s arrival page lists these steps and I have followed it.',
    rubricNotes:
      'Practical readiness. Reward a named first-night address and a realistic task list drawn from the arrival guidance. A student with no idea where they sleep on night one has not planned the move.',
  },
  {
    // Source: The Mentors Circle "What is the typical weather in [city]?" (asked to test genuine research);
    // Bradford "What do you know about the city".
    category: 'accommodation',
    text: 'What will you find hardest about daily life in {{city}} compared with home, and what have you done to prepare for it?',
    answerKind: 'explanatory',
    tips: [
      'Pick something real: the cold, cooking for yourself, being alone, the cost.',
      'Say one concrete thing you have already done about it.',
      'Honesty here reads as maturity, not weakness.',
    ],
    modelAnswer:
      'The hardest part will probably be [the cold and dark winter / cooking and managing money alone / being away from family]. I have prepared by [one concrete step: learning to cook, making a weekly budget, joining the {{university}} Nepali society group online, buying warm clothes]. I also know the international student office can help if I struggle.',
    rubricNotes:
      'Maturity check. Reward a real difficulty and a concrete preparation step. Penalise "no problem, I will adjust" with nothing behind it. Do not penalise admitting worry.',
  },

  // =========================================================================
  // IMMIGRATION AND COMPLIANCE
  // =========================================================================
  {
    // Source: The Mentors Circle "Are you considering using the UK Graduate Route?"; Leverage Edu "Do you
    // intend to work in the UK after completing your course?"
    category: 'immigration',
    text: 'Do you know what the Graduate visa is, and are you planning to use it?',
    answerKind: 'explanatory',
    tips: [
      'Say what it is in one sentence: a post-study work visa after graduating.',
      'It is honest to say you may apply. Then say what you would do with it and when you return.',
      'Do not say you know nothing about it. That reads as either untrue or unresearched.',
    ],
    modelAnswer:
      'Yes. The Graduate visa lets a student stay and work after finishing the course, and the length is changing to 18 months for applications from 2027. I may apply for it to get [n] months of experience in [field], because employers in Nepal value UK work experience. After that my plan is to return to [city] and [job or business].',
    rubricNotes:
      'Graduate Route: 2 years for current applicants, reduced to 18 months for applications made from 1 January 2027. Neither honest ambition to use it nor a plan to return is a flag; contradiction between this answer and "I will return immediately" elsewhere IS. Reward accuracy and a dated return plan.',
  },
  {
    // Source: The Mentors Circle "Have you previously travelled to the UK? For what purpose?"; Bradford
    // "Have you ever visited the UK before?"
    category: 'immigration',
    text: 'Have you ever been to the UK before, even as a visitor? When, and for what purpose?',
    answerKind: 'factual',
    publishedBy: [BRADFORD],
    tips: [
      'A plain yes or no.',
      'If yes: the dates, the visa type, and that you left on time.',
      'UKVI already has the record. Never leave a visit out.',
    ],
    modelAnswer:
      'No, I have never been to the UK; this will be my first time. / Yes, I visited in [month year] on a [visitor visa] for [purpose], for [n] weeks, and I returned to Nepal on [date], before the visa expired.',
    rubricNotes:
      'Factual, on record. A previous visit with dates and a timely departure is a positive. Any past overstay must be answered honestly; never help soften it.',
  },
  {
    // Source: The Mentors Circle "Do you have any family members living in the UK, Canada, USA, Australia,
    // or anywhere else outside India?"; NWC "Do you have a family member or relative living in the UK?"
    category: 'immigration',
    text: 'Do you have close relatives living outside Nepal, in the UK or anywhere else? Where, and what is their status?',
    answerKind: 'factual',
    tips: [
      'Parents, siblings, uncles and aunts, cousins you are close to. Country and status.',
      'A relative abroad is not a problem. Hiding one is.',
      'If a relative is in the UK, say whether you will live with them. It affects your accommodation answer.',
    ],
    modelAnswer:
      'My [relation] lives in [country] as a [citizen / permanent resident / student / worker] since [year]. Nobody else is abroad. / No, all my close family are in Nepal. [If in the UK: they live in [city]; I will not be living with them because my campus is in {{city}}.]',
    rubricNotes:
      'Cross-check against the family, accommodation and "know anyone in the UK" answers. A UK relative who appears here and nowhere else, or the reverse, is a contradiction to name. The relative itself is not a negative.',
  },
  {
    // Source: Staffordshire "Do you understand the responsibilities of students entering the UK"; Hallam
    // "do you know how many hours you would be permitted to work".
    category: 'immigration',
    text: 'What are three things you are required to do, or not allowed to do, while on a Student visa?',
    answerKind: 'factual',
    publishedBy: [STAFFS, HALLAM],
    tips: [
      'Attend and make progress; work only within the hours allowed; no self-employment; report changes of address.',
      'Say them in your own words, not as a list you learned.',
      'If unsure of one, say what you would check on the university\'s visa page.',
    ],
    modelAnswer:
      'I must attend my classes and keep up with my studies, because the university reports my attendance. I can work up to 20 hours a week in term time at degree level, but I cannot be self-employed or work full time in term. I have to keep my address and contact details up to date with {{university}} and not claim public funds.',
    rubricNotes:
      'Wants three correct conditions: attendance and progress, the work-hours limit (20h degree level, 10h below), no self-employment, address reporting, no public funds. Reward plain-words accuracy. A student who thinks they can work full time has a plan that will fail.',
  },

  // =========================================================================
  // PLANS AFTER THE COURSE
  // =========================================================================
  {
    // Source: Optimus "What job title and salary do you expect to secure in your home country after
    // completing this degree?"; Aberdeen "What is your expected salary on return?"
    category: 'future_plans',
    text: 'What job title will you apply for when you go back to Nepal, and what is a realistic starting salary for it?',
    answerKind: 'factual',
    publishedBy: [ABERDEEN],
    tips: [
      'A real job title that exists in Nepal, and a salary in rupees you have actually checked.',
      'Say where the number comes from: a job advert, a person you know.',
      'A realistic Nepali salary is a stronger answer than a big one.',
    ],
    modelAnswer:
      'I will apply for [job title] roles at [type of employer] in [city]. From job adverts on [site] and from [person], the starting salary is around NPR [amount] a month, rising to NPR [amount] with experience. That is [n] times what I earn now, which is why the course is worth the cost for us.',
    rubricNotes:
      'Return-plan realism. Reward a real title, a sourced salary in NPR, and a link to the investment. A salary far above the Nepali market is a research flag; a plan that only works in the UK is a return flag.',
  },
  {
    // Source: The Mentors Circle "Do you have a job, business, or property in India that you will return
    // to?"; Global Pathways "What ties do you have at home?"
    category: 'future_plans',
    text: 'Is there a specific job, business or responsibility waiting for you in Nepal when you finish?',
    answerKind: 'explanatory',
    tips: [
      'A family business, an employer who will take you back, land, an elderly parent: name it.',
      'If there is nothing waiting, say what you will build and where.',
      'Real ties, plainly stated, are the strongest return evidence.',
    ],
    modelAnswer:
      'Yes. My family runs [business] in [city], and after the course I will [role in it]. / My employer [company] has said they will take me back as [role]; I have that in writing. / Nothing is guaranteed, but my parents and [property / responsibility] are in [city], and I plan to [start / join] [what] there.',
    rubricNotes:
      'Ties to home. Reward a named, checkable tie. Cross-check against the family and finance answers. Never help invent a business that has not been mentioned before.',
  },
  {
    // Source: NWC "If staying in the UK after studies, what are your career plans there?"; The Mentors
    // Circle "Do you intend to settle in the UK long-term?"
    category: 'future_plans',
    text: 'If you were offered a good job in the UK after graduating, what would you do?',
    answerKind: 'explanatory',
    tips: [
      'Honest and calm. It is allowed to take experience on the Graduate visa.',
      'Then say when you would return and why.',
      'Do not say "I would never stay". Interviewers do not believe it, and it is not the rule anyway.',
    ],
    modelAnswer:
      'If it was in my field, I would take it for the time the Graduate visa allows, because [n] months of UK experience in [field] is valuable when I go home. But my plan is to return to Nepal by [year], because [tie: family business, parents, a job waiting]. I am not planning to settle in the UK.',
    rubricNotes:
      'Genuine-intent test. A calm, rule-accurate answer with a dated return plan is the strong answer. Contradiction with an earlier "I will return immediately" or "I will settle" must be named. Do not penalise a plan to use the Graduate visa.',
  },
  {
    // Source: Portsmouth "Do you plan to do further study, or go into work? If so, how and where?"
    category: 'future_plans',
    text: 'After this course, is your next step a job or more study? If more study, where, and who would pay?',
    answerKind: 'factual',
    publishedBy: [PORTSMOUTH],
    tips: [
      'One clear next step.',
      'If a PhD or a second masters, say where and how it would be funded.',
      'Endless study with no job in the plan is a flag. Show the job.',
    ],
    modelAnswer:
      'My next step is a job as [role] in [city], Nepal. / I would like to do a [PhD / professional qualification] in [subject] later, after [n] years of work, probably at [place], funded by [scholarship / my own savings from work]. Before that I need the work experience.',
    rubricNotes:
      'Wants one concrete next step. Further study is fine with a place and a funding source; a chain of courses with no employment is a genuineness flag. Cross-check with the salary and ties answers.',
  },
  {
    // Source: NWC "What career opportunities will this degree open up for you?"; Westminster "What research
    // have you done about future employment prospects".
    category: 'future_plans',
    text: 'Name two employers in Nepal who hire people with this qualification, and what they would hire you to do.',
    answerKind: 'factual',
    publishedBy: [WESTMINSTER],
    tips: [
      'Real company or organisation names.',
      'The actual role they advertise for.',
      'If you checked a job advert, say where you saw it.',
    ],
    modelAnswer:
      '[Employer one] in [city] hires [role] with a [qualification]; I saw their advert on [site] in [month]. [Employer two] does the same for [role]. I would be applying for [role] at that kind of employer, doing [what the job involves].',
    rubricNotes:
      'Job-market research. Reward two named employers with roles. Vague sectors ("banks, NGOs") score low on specificity. Check plausibility, not existence; the point is that the student has looked.',
  },

  // =========================================================================
  // CONVERSATIONAL AND ENGLISH
  // =========================================================================
  {
    // Source: AEC Overseas "How will you spend your semester breaks?"; The Mentors Circle "What do you plan
    // to do in your free time?"
    category: 'conversational',
    text: 'How will you spend your semester breaks and your free time in the UK?',
    answerKind: 'explanatory',
    tips: [
      'Something specific: a society, a sport, visiting one place, part-time work within the rules.',
      'Show you know the term dates roughly.',
      'Relaxed and natural. This is a conversation question.',
    ],
    modelAnswer:
      'In term time I want to join [society or sport] and spend weekends [what]. In the winter break I will probably stay in {{city}} and [work part-time within the hours allowed / study for January exams]. In the long summer break I plan to [visit one place / do a placement / go home for a few weeks].',
    rubricNotes:
      'Fluency and naturalness. Reward specifics and awareness of work-hour rules in breaks (full time allowed in vacations). Penalise a memorised list. Do not penalise simple English.',
  },
  {
    // Source: The Mentors Circle "What challenges do you expect as an international student, and how will you
    // manage them?" (asked as a conversation question, distinct from the why_uk version).
    category: 'conversational',
    text: 'Describe a time you had to manage on your own without your family. What did you learn from it?',
    answerKind: 'explanatory',
    tips: [
      'A real episode: living in a hostel, a job in another city, handling a family task alone.',
      'What went wrong and what you did about it.',
      'One lesson, in one sentence.',
    ],
    modelAnswer:
      'When I [moved to [city] for work / stayed in a hostel for +2], I had to [manage money / cook / handle [problem]] on my own. At first [what went wrong]. I learned to [what you changed]. That is why I feel ready to live alone in {{city}}.',
    rubricNotes:
      'Conversational, tests spontaneous English and maturity. Reward a real episode with a specific difficulty. An answer with no episode, only conclusions, scores low on specificity.',
  },
  {
    // Source: NWC "Tell me about a challenge"; Staffordshire "Do you think your course is appropriate for
    // someone your age?" (age and life-stage reasoning).
    category: 'conversational',
    text: 'Some people would say you should be settling into a career at your age, not starting a course. What would you say to them?',
    answerKind: 'explanatory',
    publishedBy: [STAFFS],
    tips: [
      'Do not get defensive. Give the reason the course fits this stage of your life.',
      'Say what you have done already and what the course adds.',
      'Short, confident, personal.',
    ],
    modelAnswer:
      'I would say I have already spent [n] years working as [role], and that is exactly why I know what I am missing. The course at {{university}} gives me [named skill or module] that will take me from [current role] to [target role]. Doing it now, at [age], means I get the benefit for the rest of my career.',
    rubricNotes:
      'Age and life-stage reasoning, from the Staffordshire guide. Reward a calm answer that uses work history as the reason. Penalise defensiveness or "age does not matter" with nothing else.',
  },

  // =========================================================================
  // PROBES, THIRD LOAD. Fired only after a root of the same category.
  // =========================================================================
  {
    // Source: Aberdeen "How long have the funds been in the account?" follow-up chain; The Mentors Circle
    // "Your statement shows a large deposit".
    category: 'finance',
    text: 'You mentioned a land sale. When was it registered, and where is the sale document?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says part of the funding came from selling land or property.',
    tips: [
      'Month and year of the sale, and that the registration paper exists.',
      'Say where the money went after the sale.',
      'If the sale is not complete, say that honestly.',
    ],
    modelAnswer:
      'The land in [place] was sold in [month year]. The registration document from the [land revenue office] is with my [relation], and we have submitted a copy. The money was deposited into [bank] on [date], and it has stayed there since.',
    rubricNotes:
      'Provenance of a lump sum. Wants a date, a document and the deposit trail. An unregistered or "in process" sale does not count as available funds; say so plainly.',
  },
  {
    // Source: Aberdeen "What is your financial sponsor's income?" chain; Reading "how will they manage
    // their own regular living expenses".
    category: 'finance',
    text: 'What is your sponsor\'s income after their own household costs, and is that enough for your second year?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student gives a sponsor income figure or describes family living costs.',
    tips: [
      'Monthly income minus monthly household spending, roughly.',
      'Then compare it with what you need per year.',
      'If savings, not income, cover year two, say so.',
    ],
    modelAnswer:
      'My [relation] earns about NPR [amount] a month and the household spends around NPR [amount], so about NPR [amount] is saved each month. Year two needs about [amount], which is covered by [that saving over the year / the fixed deposit of [amount] that matures in [month]].',
    rubricNotes:
      'Arithmetic check. Compare the numbers with the sponsor and living-cost answers already given; a saving rate that cannot produce the stated bank balance is a contradiction to name. Reward honest, rough arithmetic.',
  },
  {
    // Source: Staffordshire "Are you able to verify the genuineness of these documents?"
    category: 'finance',
    text: 'If we rang your sponsor\'s bank today, would they confirm the balance on the statement you submitted?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student describes the bank statement submitted for the visa.',
    tips: [
      'A simple yes, with the bank and the branch.',
      'Say the balance has not moved since the statement.',
      'If some money has been used since, say what for.',
    ],
    modelAnswer:
      'Yes. The account is at [bank], [branch], in my [relation]\'s name, and the balance is still [amount]. The only money that has left it since the statement was [the deposit to {{university}} / nothing].',
    rubricNotes:
      'Document genuineness. Hesitation here is a strong flag but do not overread nervousness; look for the bank, branch and an unchanged balance. Never help construct a story around a document.',
  },
  {
    // Source: Innovation Immigration / The Mentors Circle loan chain: repayment against expected salary.
    category: 'finance',
    text: 'Your loan repayment starts after the course. How much is it a month, and how does that fit the salary you expect?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says an education loan is part of the funding.',
    tips: [
      'Monthly repayment, roughly.',
      'Compare it with the Nepali salary you gave earlier.',
      'If it does not fit, the plan has a hole. Better to find it here.',
    ],
    modelAnswer:
      'The repayment will be about NPR [amount] a month over [years], starting [when]. With a starting salary of around NPR [amount] as a [role], that is about [fraction] of my income, and my family will help in the first year if needed.',
    rubricNotes:
      'Cross-check the repayment against the expected-salary answer. A repayment larger than the stated salary is a contradiction; name it plainly and kindly.',
  },
  {
    // Source: Lincoln "What will you learn in these modules?" chain; Kent "how you'll be assessed".
    category: 'why_course',
    text: 'You named a module. What is one assignment or exam you will have to pass in it?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student names a module.',
    tips: [
      'Coursework, a report, a presentation, a timed exam: say which, if the course page tells you.',
      'If you do not know, say how the course is assessed overall.',
      'Do not guess a percentage you have not seen.',
    ],
    modelAnswer:
      'From the module page, [module] is assessed by [a report / a group project / an exam]. I am [looking forward to / a bit nervous about] that because [reason]. Overall the course is mostly [coursework / exams].',
    rubricNotes:
      'Depth behind a module name. Reward a real assessment type; accept "the page does not say, but the course is mostly coursework". Penalise confident invention.',
  },
  {
    // Source: The Mentors Circle "Who is the course leader?"; Brookes "Compare teaching styles".
    category: 'why_course',
    text: 'Who teaches that module, or what research is the department known for?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student mentions a module, a lecturer, or the department\'s reputation.',
    tips: [
      'A lecturer\'s name, or one research area from the department page.',
      'If you do not know a name, say what the department page highlights.',
      'Never invent a professor.',
    ],
    modelAnswer:
      'The course leader is [name], and the department page says they work on [area]. / I do not know the individual lecturers yet, but the department at {{university}} is known for [research area from its page], which is close to what I want to work on.',
    rubricNotes:
      'Reward a name or a real research area; accept honest "I do not know the names" with a department fact. A confidently wrong name is worse than none.',
  },
  {
    // Source: Westminster "how far is it from the campus you will study on"; Aberdeen "bus routes".
    category: 'accommodation',
    text: 'You said you will live off campus. Which bus or train would you take, and how much would that cost a month?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says they will live away from campus.',
    tips: [
      'A route or a line name, and a rough monthly cost.',
      'Say whether a student travel pass exists.',
      'Add it to your monthly budget out loud.',
    ],
    modelAnswer:
      'From [area] I would take the [bus number / train line] to campus, about [minutes]. A monthly student pass is around [amount], which I have included in my [amount] monthly budget.',
    rubricNotes:
      'Cross-check the travel cost against the monthly budget answer. Reward a named route and a pass. Do not penalise a rough figure.',
  },
  {
    // Source: Hallam "Have you already arranged accommodation?" chain; Bradford "availability".
    category: 'accommodation',
    text: 'If that hall is full when you apply, what is your second option and what does it cost?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student names a specific hall or accommodation.',
    tips: [
      'A second named option, with a weekly price.',
      'Show the difference in cost and how you would cover it.',
      'A plan B is evidence of real research.',
    ],
    modelAnswer:
      'My second choice is [hall or private provider] in [area], at about [amount] a week, which is [more / less] than my first choice. If I have to take it, the extra [amount] a month comes from [where].',
    rubricNotes:
      'Reward a named second option and a covered cost difference. A student with only one option has done some research; a student with none has done little.',
  },
  {
    // Source: Portsmouth "have you ever breached the conditions of your visa"; Reading "why" for a refusal.
    category: 'immigration',
    text: 'You mentioned a refusal. What reason did the refusal letter give, and what has changed since then?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student discloses a previous visa refusal for any country.',
    tips: [
      'The actual reason from the letter, in plain words.',
      'What is different now: funds, documents, course, preparation.',
      'Never hide it. The record exists.',
    ],
    modelAnswer:
      'The [country] refusal in [month year] said [reason from the letter, for example: the funds had not been in the account long enough]. Since then [what changed: the money has been in the account for [n] months / I have a different sponsor / I chose a course that follows from my degree]. I have declared the refusal in this application.',
    rubricNotes:
      'Honest handling of a refusal. Reward a specific stated reason and a concrete change. Never help conceal or soften; UKVI holds the record. Contradiction with an earlier "never refused" is the most serious flag in the sitting.',
  },
  {
    // Source: Hallam "Have you organised schooling for your children?"; Meridean dependants chain.
    category: 'immigration',
    text: 'You mentioned family who might join you. Do you know who is allowed to bring dependants on a Student visa now?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student mentions a spouse or children coming to the UK.',
    tips: [
      'Since January 2024 most taught masters students cannot bring dependants.',
      'Say what your family will do instead.',
      'An accurate answer here shows you have read the rules.',
    ],
    modelAnswer:
      'Yes. Since 2024 only postgraduate research students and government-sponsored students can bring dependants, so on my [taught masters / bachelor\'s] my [spouse / children] cannot come with me. They will stay in [city] with [family], and I will visit in the summer break.',
    rubricNotes:
      'Dependants rule: from January 2024, only postgraduate research and government-sponsored students may bring dependants. A student planning to bring a spouse on a taught masters has a plan that will fail; say so clearly and kindly.',
  },
  {
    // Source: Bradford "Where have you studied previously"; Mentors Circle backlog chain.
    category: 'education',
    text: 'You mentioned a backlog. How many attempts did it take, and what did you do differently the last time?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student mentions a failed subject, a backlog or a repeated year.',
    tips: [
      'The number of attempts, plainly.',
      'One specific change: a tutor, a study group, more time.',
      'The transcript already shows it. Own it.',
    ],
    modelAnswer:
      'It took [n] attempts. The first time I [reason]. Before the last attempt I [what you changed], and I passed with [mark]. After that my marks in [related subjects] improved too.',
    rubricNotes:
      'Reward a plain count and a concrete change. Do not penalise the backlog itself; penalise evasion. Cross-check with the GPA answer if both were asked.',
  },
  {
    // Source: Westminster "why you are studying another course and why now"; Global Pathways subject switch.
    category: 'education',
    text: 'Which specific part of your old degree will you actually use on this course?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student claims their previous study connects with the new course.',
    tips: [
      'One module or skill from the old degree, by name.',
      'The module on the new course where it will be used.',
      'If the honest answer is "very little", say the career reason instead.',
    ],
    modelAnswer:
      'From my [old degree] I will use [named subject or skill], for example [what you did in it]. That comes straight into the [new module] at {{university}}. The rest of the new course is new to me, which is the point.',
    rubricNotes:
      'Tests a claimed link. Reward a named old-course element mapped to a named new-course module. "Everything is related" is a claim with no evidence.',
  },
  {
    // Source: Coventry "Can you explain any gaps"; Aberdeen postgraduate gap chain.
    category: 'study_gap',
    text: 'What documents could you show for that time, such as an employment letter, a pay slip or an exam registration?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student accounts for a gap with work, exam preparation or family responsibility.',
    tips: [
      'Name the actual paper: experience letter, salary slips, bank credits, an IELTS registration.',
      'If there is no paper for part of it, say so and say why.',
      'Honesty about a gap with no paperwork is better than a paper that does not exist.',
    ],
    modelAnswer:
      'For the work at [company] I have an experience letter and salary slips from [month] to [month], and the salary shows in my bank statement. For the [exam preparation] months I have the [IELTS registration / class receipt] from [institute]. For the [n] months at home there is no document, because I was helping my family with [what].',
    rubricNotes:
      'Evidence for the gap story. Reward named documents matched to dated blocks. An undocumented stretch stated honestly is fine; an undocumented stretch described as employment is a flag.',
  },
  {
    // Source: Aberdeen "What is/was your monthly salary?" chain against the savings story.
    category: 'study_gap',
    text: 'At that salary, how much of your own savings did you manage to put towards this course?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student states a salary from a job during the gap.',
    tips: [
      'A rough amount saved, and over how many months.',
      'It is fine if it is small or zero. Say where the rest comes from.',
      'The number should fit the salary you just gave.',
    ],
    modelAnswer:
      'From NPR [salary] a month I saved about NPR [amount] a month for [n] months, so around NPR [total], which I used for [IELTS, the application fee, my flight]. The main funding is from my [relation], not from my savings.',
    rubricNotes:
      'Arithmetic and honesty. Savings must fit the salary and the months stated. Reward a small honest figure; flag a saving that exceeds the salary.',
  },
  {
    // Source: Westminster "Did you consider any other countries"; Reading "rather than Australia or the USA".
    category: 'why_uk',
    text: 'What was the total cost of the option you rejected, compared with this one?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student names another country or university they considered.',
    tips: [
      'A rough total for the other option: fees plus living.',
      'The same for {{university}}.',
      'Then the reason that beat the cost difference.',
    ],
    modelAnswer:
      '[Other option] would have cost about [amount] a year in fees plus [amount] living, so roughly [total]. {{university}} is [amount] in fees plus about {{ukviMonthly}} a month for living, so roughly [total]. It was [cheaper / more], and I still chose it because [reason].',
    rubricNotes:
      'Tests whether the comparison was real. Reward rough numbers on both sides. A student who cannot put any figure on the rejected option probably did not compare it.',
  },
  {
    // Source: Bournemouth "What differences did you consider between studying in the UK and in your home
    // country"; Brookes "What have you learned about the UK education system?"
    category: 'why_uk',
    text: 'You mentioned the UK education system. What is one rule or feature of it you only learned during your research?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student praises the UK education system in general terms.',
    tips: [
      'Something specific: credit systems, the dissertation, plagiarism rules, the marking scale.',
      'Say where you read it.',
      'One real fact beats three adjectives.',
    ],
    modelAnswer:
      'I learned that a UK masters is [180 credits] and that the [dissertation] alone is [60 credits]. I also read on the {{university}} pages that a 70 is a distinction, which is very different from percentages in Nepal. I found this on [where].',
    rubricNotes:
      'Follows a generic "UK education is world class" answer. Reward one accurate, checkable fact (180-credit masters, 60-credit dissertation, 70 as distinction, referencing rules). Penalise more adjectives.',
  },
  {
    // Source: Bournemouth "Were there other universities you considered? Why did you not choose them?";
    // The Mentors Circle "why did you decline their offers?"
    category: 'why_university',
    text: 'What did the university you rejected offer that {{university}} does not?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student names another university they applied to or considered.',
    tips: [
      'Be fair to the other university. Name one real advantage it had.',
      'Then the reason {{university}} still won.',
      'A fair comparison sounds like a real decision.',
    ],
    modelAnswer:
      '[Other university] had [a bigger city / a lower fee / a well-known name]. But its course did not include [module or feature], and the living costs there were [higher]. {{university}} gave me [what], which mattered more for my plan.',
    rubricNotes:
      'Tests whether the alternatives were real. Reward a fair, specific advantage for the rejected option. "It was worse in every way" is not a comparison.',
  },
  {
    // Source: Brookes "Where is Oxford located? How close is the campus to the city centre?"
    category: 'why_university',
    text: 'How far is the campus from the city centre of {{city}}, and what is around it?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student describes the campus or the city.',
    tips: [
      'Minutes by bus or on foot from the centre.',
      'One or two things near the campus: a station, shops, halls.',
      'If there is more than one campus, say which one is yours.',
    ],
    modelAnswer:
      'My campus is [in the centre / about [n] minutes by bus from the centre] of {{city}}, near [station or landmark]. Around it there are [halls, a supermarket, the library]. {{university}} has [one campus / other campuses at [place]], and my course is taught at [which].',
    rubricNotes:
      'Campus geography. Reward a rough distance and one real nearby feature; check the city against the university facts. Describing a campus that belongs to another university is a serious flag.',
  },
  {
    // Source: Hallam "If you intend to return home to seek employment, which companies do you hope to apply
    // to?" chain; Aberdeen expected salary.
    category: 'future_plans',
    text: 'You named an employer. What would they need to see from you, beyond the degree, to hire you?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student names a company or organisation they plan to apply to.',
    tips: [
      'Experience, a certification, a skill, a language: something real from an advert.',
      'Say how you will get it during or after the course.',
      'Shows you have read a job description, not just a company name.',
    ],
    modelAnswer:
      'From their adverts, [employer] asks for [n] years of experience in [area] and [a certification / a skill]. I will get part of that from the [placement / project] in my course, and the rest from [the Graduate visa months / my current job]. That is why I chose a course with [feature].',
    rubricNotes:
      'Depth behind a named employer. Reward a real requirement and a plan to meet it. A student who knows the name but not what the job needs has done shallow research.',
  },
  {
    // Source: Optimus "What are your specific career plans immediately after graduation?"; Aberdeen
    // "What do you intend to do when your visa expires?"
    category: 'future_plans',
    text: 'What is the exact month your visa ends, and what will you be doing in the month after that?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student describes their plans after the course.',
    tips: [
      'Course end date plus the wrap-up period the visa gives.',
      'One concrete thing for the month after: a flight home, a Graduate visa application, a job start.',
      'Knowing your own visa end date is basic. Check it.',
    ],
    modelAnswer:
      'My course ends in [month year], and the Student visa runs for [n] months after that, so it ends around [month year]. In the month after that I will [be back in [city] starting at [employer] / have applied for the Graduate visa before it expired and be working at [type of job]].',
    rubricNotes:
      'Date awareness. A masters visa typically allows a few months after the course end. Reward a rough correct date and a concrete next action. Vagueness about their own visa end date is a compliance flag.',
  },
  {
    // Source: Bradford "Do you have family in your home country?"; Mentors Circle ties chain.
    category: 'future_plans',
    text: 'Who in Nepal is counting on you to come back, and what happens to them if you do not?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says they will return to Nepal.',
    tips: [
      'A person and a responsibility: parents, a business, a sibling\'s education.',
      'Plain and personal. This is the answer interviewers remember.',
      'Do not exaggerate. One real tie is enough.',
    ],
    modelAnswer:
      'My parents are in [city]; my father is [age] and I am the [eldest / only] son or daughter, so [responsibility]. Our [business / land] needs someone to run it, and that is my plan. If I did not come back, [what would happen], and that is not something I would do.',
    rubricNotes:
      'Return ties, tested personally. Reward a named person and a real consequence. Must match the family and ties answers earlier. Do not penalise emotion or simple English.',
  },
  {
    // Source: The Mentors Circle English-ability layer; the memorisation check every university describes.
    category: 'conversational',
    text: 'Explain that same answer again in different words, as if I had not understood you.',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'Any answer that sounded rehearsed or unusually fluent.',
    tips: [
      'Do not repeat the same sentences. Say the same idea more simply.',
      'Shorter is fine. Different is what matters.',
      'This is the test for memorised answers. Relax and just talk.',
    ],
    modelAnswer:
      'Sure. What I mean is [the same point in plain, shorter words]. The main reason is [one reason], and that is why [conclusion].',
    rubricNotes:
      'The reword test. Reward a genuinely different phrasing of the same content; near-verbatim repetition sets soundsMemorised. Simpler English on the second attempt is a positive, not a negative.',
  },
  // =========================================================================
  // THE COUNSELLOR'S LIST (7 September 2026). The client's UK-department
  // counsellor supplied the questions their students are actually drilled on.
  // Each one below was checked against the bank; these are the ones that were
  // missing, each also traced to a published source in the harvest.
  // =========================================================================
  {
    // Source: BCU "Why did you choose this course?" (9 sources, the most-published question in the
    // harvest); Sheffield Hallam / Staffordshire "how does it relate to your previous study?";
    // counsellor list.
    category: 'why_course',
    text: 'Why did you choose this course, and how does it relate to what you studied before?',
    answerKind: 'explanatory',
    publishedBy: [BCU, HALLAM, STAFFS, BROOKES, BOURNEMOUTH, BRADFORD, NORTHUMBRIA, READING],
    tips: [
      'One real reason for the course, then one named link to your last qualification.',
      'A module name or a subject from your old course makes it concrete.',
      'If the field is new for you, say the honest career reason for the change.',
    ],
    modelAnswer:
      'I chose [course] because I want to work as [role], and this course covers [named module], which is the part I am missing. In my [previous degree] I studied [subject], and the [topic] in it connects directly to [module] here. So it is a step forward from what I already know, not a fresh start.',
    rubricNotes:
      'The most-asked question in every published list. Wants a personal reason plus a named link between old and new study. Generic "good scope" or "high demand" scores low. A claimed link with no named subject or module is a specificity flag.',
  },
  {
    // Source: Westminster "Can you describe the facilities at the University?"; Reading "What facilities do
    // you expect there to be"; Bradford "What facilities are unique to your course"; counsellor list.
    category: 'why_university',
    text: 'What facilities does {{university}} have for your course?',
    answerKind: 'factual',
    publishedBy: [WESTMINSTER, READING, BRADFORD, HALLAM, STAFFS],
    tips: [
      'Facilities for YOUR subject: a lab, a studio, a trading room, a moot court, a clinic, software.',
      'Name one you read about on the department page.',
      'Library, gym and Wi-Fi are true everywhere. They do not show research.',
    ],
    modelAnswer:
      'For [subject], {{university}} has [named facility from the course or department page], which students use for [what]. There is also [second facility or software]. I read about this on the course page, and it matters to me because [reason linked to your plan].',
    rubricNotes:
      'Research check. Reward a named, subject-specific facility. Generic campus facilities score low on specificity. Check any named facility against the university facts where possible; a facility that belongs to another university is a serious flag.',
  },
  {
    // Source: The Mentors Circle "What modules will you be studying in your first semester?"; SOAS "What
    // modules are you planning to take?"; counsellor list.
    category: 'why_course',
    text: 'Which modules will you study in your first semester, and which ones come later?',
    answerKind: 'factual',
    tips: [
      'Two or three first-semester modules by name.',
      'Then one thing that comes later, such as the dissertation or a placement.',
      'If the university has not published the order, say what the course page lists as core.',
    ],
    modelAnswer:
      'In the first semester I will study [module one], [module two] and [module three]. In the second semester there is [module], and the [dissertation / project / placement] comes at the end. The course page at {{university}} lists these as core, and [module] is the one I am most looking forward to.',
    rubricNotes:
      'Structure knowledge. Reward real module names placed in a plausible order. Do not penalise uncertainty about exact semester placement if the names are right. Names with no understanding invite the module probe.',
  },
  {
    // Source: counsellor list; student reports of Wolverhampton's interview (settling in and integrating);
    // The Mentors Circle "What challenges do you expect as an international student".
    category: 'conversational',
    text: 'How will you handle the cultural differences you will meet in the UK?',
    answerKind: 'explanatory',
    tips: [
      'Name one real difference: food, weather, how people talk to teachers, living alone.',
      'Say one concrete thing you will do about it.',
      'Show you expect it and are not afraid of it.',
    ],
    modelAnswer:
      'One difference will be [for example: students call lecturers by their first name and are expected to question them, which is not how we study in Nepal]. I will [what you will do: ask questions in seminars even when it feels rude, join the international student society, cook Nepali food with friends]. I expect the first month to be hard and I am ready for that.',
    rubricNotes:
      'Adjustment and maturity. Reward a specific difference and a concrete plan. Penalise "no problem, I will adjust easily" with nothing behind it. Do not penalise admitting nervousness.',
  },
  {
    // Source: counsellor list; Reading "What attracted you to study this course?"; Bournemouth "What did
    // you discover about BU that influenced your decision?"
    category: 'why_university',
    text: 'What excites you most about studying at {{university}}?',
    answerKind: 'explanatory',
    publishedBy: [BOURNEMOUTH],
    tips: [
      'One thing, and it should be specific to {{university}}: a module, a lecturer, a facility, a placement, the city.',
      'Say why it excites YOU, not why it is good in general.',
      'Enthusiasm with a fact behind it is the answer.',
    ],
    modelAnswer:
      'The thing I am most excited about is that {{aboutUniversity}}. For my course that means [the module / the facility / the placement] I have wanted since [when], and this is the first time I will actually get to do it. That is why I chose {{university}} over [other option].',
    rubricNotes:
      'Genuine interest test. Reward a specific, checkable thing tied to a personal reason. Generic excitement about "the UK" or "a world-class university" scores low.',
  },
  {
    // Source: Leverage Edu "What are the facilities and rankings of the university?"; counsellor list.
    category: 'why_university',
    text: 'Can you name any rankings, achievements or special features of {{university}}?',
    answerKind: 'factual',
    tips: [
      'One real ranking or award, with the year, if you know it.',
      'Then one feature that is not a ranking: an accreditation, a partnership, a research centre.',
      'A ranking on its own is a weak reason. A ranking plus a feature is research.',
    ],
    modelAnswer:
      '{{university}} was [ranking or award, for example: rated [level] in the Teaching Excellence Framework / ranked [n] for [subject] in [guide] in [year]]. More important for me, {{aboutUniversity}}, which is directly linked to my course.',
    rubricNotes:
      'Rankings are the classic generic answer (Oxford Brookes: "it is not enough to rely on university rankings"), so reward the second, non-ranking fact more than the first. A wrong or invented ranking is worse than none. Do not verify exact positions; look for plausibility and a non-ranking feature.',
  },
  {
    // Source: counsellor list; Oxford Brookes "How will this qualification support your long-term goals?";
    // NWC "What are your long-term career goals, and how does this course fit?"
    category: 'future_plans',
    text: 'What is your biggest dream in life, and how does this course fit into it?',
    answerKind: 'explanatory',
    publishedBy: [BROOKES],
    tips: [
      'One dream, in one sentence. Real, not impressive.',
      'Then the steps: this course, the first job, and what comes after.',
      'Show the dream lives in Nepal, or say honestly where it lives.',
    ],
    modelAnswer:
      'My biggest dream is to [one real thing: run my own [business] in [city], become a [role] at [type of organisation], build [what] for my family]. This course gives me [named skill or qualification] that I cannot get at home. After it I will start as [role], and in [n] years I want to [next step towards the dream].',
    rubricNotes:
      'Long-term intent, tested personally. Reward a specific dream with steps that pass through this course and land in Nepal or are honest about where they land. Contradiction with the return-plan answers must be named. Do not penalise a modest dream.',
  },
  {
    // Source: NWC "Do you plan to work while studying in the UK? How will you balance it?"; counsellor list.
    category: 'conversational',
    text: 'How will you balance your studies, your social life and any part-time work in the UK?',
    answerKind: 'explanatory',
    tips: [
      'Studies first. Say how many hours a week you will study and when.',
      'Part-time work only inside the 20-hour limit, and only if the budget does not need it.',
      'One thing you will do for yourself each week.',
    ],
    modelAnswer:
      'My studies come first: about [hours] a week of classes plus [hours] of reading, mostly in the library after class. If I work, it will be at most [n] hours a week, within the 20-hour rule, and my budget does not depend on it. On weekends I will [one social thing: play football with the Nepali society, cook with flatmates].',
    rubricNotes:
      'Priorities and rule awareness. Reward studies-first with realistic hours, the 20-hour limit, and a budget that does not need the job. A plan built around working is a refusal signal; say so kindly.',
  },
  {
    // Source: counsellor list; Staffordshire "Do you need a meet and greet service?" (first-days
    // practicalities); Sheffield Hallam "Have you already arranged accommodation?"
    category: 'conversational',
    text: 'Imagine it is your first week at {{university}}. What is the first thing you will do after your classes finish?',
    answerKind: 'explanatory',
    tips: [
      'Something practical and real: find the library, register with a doctor, buy groceries, call home.',
      'Show you know where things are on campus and in {{city}}.',
      'Relaxed and natural. This is a conversation question.',
    ],
    modelAnswer:
      'After my first classes I will go to the library and find the section for [subject], because I want to start the reading early. Then I will [register with the GP near my hall / buy groceries at [shop] / go to the international student welcome]. In the evening I will call my family in [city] and tell them how it went.',
    rubricNotes:
      'Fluency, imagination and practical readiness. Reward concrete, local, plausible actions. Penalise a memorised list. Do not penalise simple English.',
  },
  {
    // Source: counsellor list; student reports of Wolverhampton's interview ("how they'll settle in and
    // integrate"); Oxford Brookes "What facilities and support services does the university offer?"
    category: 'conversational',
    text: 'How will you deal with loneliness, homesickness or stress during your time in the UK?',
    answerKind: 'explanatory',
    publishedBy: [BROOKES],
    tips: [
      'Admit it will happen. Everyone gets homesick in the first months.',
      'One person you will talk to, one routine you will keep, one service at {{university}} you would use.',
      'Show you know the university has wellbeing support and you would actually use it.',
    ],
    modelAnswer:
      'I know the first two or three months will be hard, especially in winter. I will call my family every [day or two], keep a routine of [study, exercise, cooking], and join the [Nepali society / a sport] so I have friends who understand. If it gets serious, {{university}} has a student wellbeing service and I would go to it, because it is better than falling behind quietly.',
    rubricNotes:
      'Wellbeing readiness. Reward honesty, a named routine, a named person and a named support service. Penalise "I will be fine" with nothing behind it. Never penalise admitting worry; a student who plans for homesickness is more credible than one who denies it.',
  },
];
