import type { Draft } from '@/lib/data/question-draft';

/**
 * Abertay preparation, researched 2 October 2026. Stable a- ids are append-only.
 * These are authored practice adaptations of Abertay's published information,
 * NOT verbatim or student-reported interview questions. Source URLs record each
 * adaptation's basis; no item earns a 'very likely' claim from this file.
 * Course names, fees and student circumstances remain personal placeholders.
 */
export const ABERTAY_ID = 'inst-abertay-university';
export const ABERTAY_PRACTICE: { id: string; sourceUrl: string; draft: Draft }[] = [
  {
    "id": "a-01",
    "sourceUrl": "https://www.abertay.ac.uk/international/how-to-apply/",
    "draft": {
      "category": "why_university",
      "text": "Why have you chosen Abertay University for your studies, rather than another university offering your subject?",
      "answerKind": "explanatory",
      "tips": [
        "Give a real comparison and a feature of your own course. Abertay and the University of Dundee are different institutions."
      ],
      "modelAnswer": "I chose Abertay because [a feature of my actual course] matches my aim to [career goal]. I compared it with [another university] and found [a specific difference in teaching or course content]. Abertay is in Dundee, Scotland, and I researched its city-centre campus before deciding.",
      "rubricNotes": "Abertay explicitly says its recorded interview asks about the decision to study there. Reward personal course-based reasons, not rankings or an agent choosing on the applicant's behalf."
    }
  },
  {
    "id": "a-02",
    "sourceUrl": "https://www.abertay.ac.uk/visit/campus-tours/",
    "draft": {
      "category": "why_university",
      "text": "Which facilities at Abertay’s Dundee campus are relevant to your course, and how would you use them?",
      "answerKind": "explanatory",
      "tips": [
        "Research facilities for your actual programme; do not claim access to a lab just because another course uses it."
      ],
      "modelAnswer": "I would use [a verified facility relevant to my course] for [specific study activity]. I also researched the Bernard King Library for independent study. The campus is in Dundee city centre; I checked the facilities available for my particular programme.",
      "rubricNotes": "Campus research practice, not a published interview question. Do not accept facilities copied from the University of Dundee or assume every Abertay student uses cybersecurity labs."
    }
  },
  {
    "id": "a-03",
    "sourceUrl": "https://www.abertay.ac.uk/international/how-to-apply/",
    "draft": {
      "category": "why_course",
      "text": "What is the exact Abertay course on your offer, how will you study it, and when does it start?",
      "answerKind": "explanatory",
      "tips": [
        "Use your offer and programme document. Do not confuse an online course with an on-campus course."
      ],
      "modelAnswer": "My offer is for [exact award and course title], starting [month and year]. It is [duration], studied [full-time/on-campus, as stated in my offer]. I checked the programme document and my offer rather than using the details of a similarly named online degree.",
      "rubricNotes": "Check consistency with the applicant's actual offer. Never impose one year or a September start on every Abertay programme. Course choice is part of the decision-to-study theme."
    }
  },
  {
    "id": "a-04",
    "sourceUrl": "https://www.abertay.ac.uk/international/how-to-apply/",
    "draft": {
      "category": "why_course",
      "text": "Which two modules from your Abertay programme interest you most, and what will you learn from them?",
      "answerKind": "explanatory",
      "tips": [
        "Name modules from your own programme and intake, then explain them in your own words."
      ],
      "modelAnswer": "The modules I researched are [actual module one] and [actual module two]. The first develops [skill] and the second covers [topic]. These matter to me because [specific connection to my prior study or intended role]. I used the programme document for my intake to check their names.",
      "rubricNotes": "Reward accurate course-specific knowledge. Do not substitute module names from Abertay online degrees or another programme. No universal module list is held for all applicants."
    }
  },
  {
    "id": "a-05",
    "sourceUrl": "https://www.abertay.ac.uk/international/how-to-apply/",
    "draft": {
      "category": "education",
      "text": "How does the academic background you submitted to Abertay prepare you for your chosen programme?",
      "answerKind": "explanatory",
      "tips": [
        "Keep qualification names, dates and grades consistent with your submitted documents."
      ],
      "modelAnswer": "I completed [qualification] at [institution] in [year]. In [module or project] I learned [skill] and applied it to [example]. That prepares me for [part of my Abertay programme], while [new topic] is what I want to develop next.",
      "rubricNotes": "Application-consistency practice based on Abertay's certified transcript requirements and credibility assessment. Reward a concrete academic example; do not invent grades or experience."
    }
  },
  {
    "id": "a-06",
    "sourceUrl": "https://www.abertay.ac.uk/international/how-to-apply/",
    "draft": {
      "category": "progression",
      "text": "What new knowledge will your Abertay course give you that you have not already covered in your previous studies?",
      "answerKind": "explanatory",
      "tips": [
        "Explain the difference between your previous curriculum and the new programme."
      ],
      "modelAnswer": "My previous course covered [topic] at [level]. At Abertay I want to develop [new skill or specialism] through [module or project]. This is a clear next step because [specific skill gap], rather than repeating my earlier qualification.",
      "rubricNotes": "Derived course-choice preparation. Assess the personal study rationale; same-level study is not automatically a failure if the specialism and progression are coherent."
    }
  },
  {
    "id": "a-07",
    "sourceUrl": "https://www.abertay.ac.uk/media/fkpjymmg/a4-cas-shield-guide_final.pdf",
    "draft": {
      "category": "finance",
      "text": "What tuition fee, scholarship and deposit figures have you entered in Abertay’s CAS Shield, and how much remains to be paid?",
      "answerKind": "explanatory",
      "tips": [
        "Use confirmed amounts from your offer and receipts. Do not reuse fees or deposit percentages from old webinars."
      ],
      "modelAnswer": "My tuition fee is [amount] according to my offer. My confirmed scholarship is [amount, or none] and I have paid [deposit] with a receipt. That leaves [remaining balance]. These figures match the finance section and documents I submitted to CAS Shield.",
      "rubricNotes": "Abertay's guide requires funding areas, scholarship amounts and balance information. Check arithmetic and consistency; no single tuition fee or deposit percentage is correct for all applicants."
    }
  },
  {
    "id": "a-08",
    "sourceUrl": "https://www.abertay.ac.uk/media/fkpjymmg/a4-cas-shield-guide_final.pdf",
    "draft": {
      "category": "finance",
      "text": "Who is funding your Abertay studies, and what evidence supports that funding in CAS Shield?",
      "answerKind": "explanatory",
      "tips": [
        "Describe the source of funds and the evidence you actually supplied."
      ],
      "modelAnswer": "My funding comes from [genuine source]. [Sponsor] earns income from [work or business], and I submitted [relevant evidence]. The available funds cover my remaining tuition and living costs. If I have a loan or scholarship, I can explain its approved amount and conditions.",
      "rubricNotes": "Funding is explicitly assessed by Abertay. Cross-check sponsor identity and available funds with earlier answers. Do not treat future part-time earnings as secured funding."
    }
  },
  {
    "id": "a-09",
    "sourceUrl": "https://www.abertay.ac.uk/media/fkpjymmg/a4-cas-shield-guide_final.pdf",
    "draft": {
      "category": "finance",
      "text": "For your studies in Dundee, how much living-cost evidence do you need in addition to your remaining tuition, and how have you prepared it?",
      "answerKind": "explanatory",
      "tips": [
        "Separate the UKVI minimum from your actual budget. Check the current GOV.UK guidance and your funding route."
      ],
      "modelAnswer": "Dundee is outside London. The current UKVI figure is {{ukviMonthly}} per month for up to nine months, or {{ukviTotal}} for nine months, in addition to the unpaid tuition recorded on my CAS. For bank-fund evidence I checked the 28-day holding period and that the period ends within 31 days of my visa application. My documents reflect my actual funding route.",
      "rubricNotes": "Abertay links its finance guidance to GOV.UK. Use the outside-London band. Recognise official loan/sponsorship evidence routes and applicable exemptions rather than insisting every applicant uses a bank statement."
    }
  },
  {
    "id": "a-10",
    "sourceUrl": "https://www.abertay.ac.uk/accommodation/student-rooms-halls/",
    "draft": {
      "category": "accommodation",
      "text": "Which accommodation have you researched in Dundee for Abertay, and how would you get to the Bell Street campus?",
      "answerKind": "explanatory",
      "tips": [
        "Parker House is one option, not a compulsory booking. Use the current provider quote and your real booking status."
      ],
      "modelAnswer": "I researched [actual provider and address]. The rent is [current quoted amount] for [contract length], with [included bills]. My route to Abertay's Bell Street campus is [researched route and time]. I have [booked/not booked] it, and my backup is [real alternative].",
      "rubricNotes": "Abertay accommodation preparation, not confirmed interview wording. Parker House is run by iQ and is around five minutes' walk from campus; other options exist. Never assume the applicant has booked."
    }
  },
  {
    "id": "a-11",
    "sourceUrl": "https://www.abertay.ac.uk/accommodation/student-rooms-halls/",
    "draft": {
      "category": "accommodation",
      "text": "If Abertay’s preferential-rate rooms at Parker House are full, what is your accommodation plan?",
      "answerKind": "explanatory",
      "tips": [
        "A preferential rate is not guaranteed. Explain a realistic alternative within your budget."
      ],
      "modelAnswer": "The reduced-rate rooms are limited and allocated first come, first served. I would compare any available Parker House rooms at iQ's standard rate with [another Dundee option], checking the contract, bills and travel to Bell Street. I have budgeted [amount] and would confirm availability before booking.",
      "rubricNotes": "Provider-specific preparation from Abertay's current halls page. Reward a genuine researched backup; do not mark Parker House as mandatory or describe it as university-owned."
    }
  },
  {
    "id": "a-12",
    "sourceUrl": "https://www.abertay.ac.uk/international/how-to-apply/",
    "draft": {
      "category": "future_plans",
      "text": "How does your chosen Abertay programme fit the work you plan to do after graduation?",
      "answerKind": "explanatory",
      "tips": [
        "Connect your actual programme to a realistic role; use a real example you researched."
      ],
      "modelAnswer": "I plan to pursue [role] in [location or sector]. The [module or project] at Abertay develops [skill] needed for that work. I checked [real vacancy or professional requirement] to understand the skills expected. This connects my previous experience, the programme and my career plan.",
      "rubricNotes": "Derived preparation for explaining the decision to study, not a confirmed Abertay interview topic. Reward concrete course-to-career logic without demanding an invented employer, salary or job guarantee."
    }
  },
  {
    "id": "a-13",
    "sourceUrl": "https://www.abertay.ac.uk/media/fkpjymmg/a4-cas-shield-guide_final.pdf",
    "draft": {
      "category": "why_university",
      "text": "What research did you personally do before choosing Abertay, even if a consultancy helped with your application?",
      "answerKind": "explanatory",
      "tips": [
        "Be honest about consultancy help and describe research you actually did yourself."
      ],
      "modelAnswer": "My consultancy helped with [truthful task], but I personally read [course page or programme document], compared [alternative], and checked [funding or accommodation detail]. I completed my own Pre-CAS questionnaire, and I can explain the information in my application.",
      "rubricNotes": "Abertay says the applicant must complete the questionnaire independently. Agent involvement itself is not a fault; assess ownership and accurate personal explanation. Do not coach a false denial of agent assistance."
    }
  },
  {
    "id": "a-14",
    "sourceUrl": "https://www.abertay.ac.uk/international/how-to-apply/",
    "draft": {
      "category": "why_course",
      "text": "How will the teaching and assessment on your Abertay course help you develop the skills you need?",
      "answerKind": "explanatory",
      "tips": [
        "Check your own programme’s teaching and assessment; do not assume every degree has the same format."
      ],
      "modelAnswer": "My programme uses [teaching format] and assesses [coursework, exams or project, as documented]. In [specific module], I will practise [skill] through [learning activity]. I checked these details in my programme information because they are more useful to my decision than the course title alone.",
      "rubricNotes": "Derived course-choice preparation. No blanket assessment format or guaranteed placement is held. Reward a programme-specific explanation consistent with the applicant's documents."
    }
  },
  {
    "id": "a-15",
    "sourceUrl": "https://www.abertay.ac.uk/media/fkpjymmg/a4-cas-shield-guide_final.pdf",
    "draft": {
      "category": "finance",
      "text": "You mentioned a scholarship or deposit. How did that change the remaining balance in your Abertay funding plan?",
      "answerKind": "explanatory",
      "tips": [
        "Use your real figures; if neither applies, say that and explain your balance."
      ],
      "modelAnswer": "My starting fee was [amount]. After my confirmed scholarship of [amount] and my paid deposit of [amount], my remaining tuition is [calculation]. I have separately budgeted my living costs and can show the scholarship confirmation and payment receipt.",
      "rubricNotes": "Follow-up to the finance section. Check arithmetic without inventing a scholarship or assuming a standard deposit.",
      "isProbe": true,
      "probeTrigger": "A previous answer in this theme invites a check of the practical details."
    }
  },
  {
    "id": "a-16",
    "sourceUrl": "https://www.abertay.ac.uk/accommodation/student-rooms-halls/",
    "draft": {
      "category": "accommodation",
      "text": "Does your Dundee rent quote include bills, and what costs are outside that accommodation contract?",
      "answerKind": "explanatory",
      "tips": [
        "Use the actual contract and distinguish included bills from other living costs."
      ],
      "modelAnswer": "My quote includes [actual inclusions]. I budgeted separately for [food, transport, laundry or other real exclusions]. The contract lasts [weeks], so I calculated the total for that period rather than multiplying one week by an assumed academic year.",
      "rubricNotes": "Follow-up grounded in the accommodation listing: Parker House tiers include bills and wifi but laundry is pay-as-you-go. Other providers have different terms. Do not apply Parker House inclusions to every residence.",
      "isProbe": true,
      "probeTrigger": "A previous answer in this theme invites a check of the practical details."
    }
  }
];
