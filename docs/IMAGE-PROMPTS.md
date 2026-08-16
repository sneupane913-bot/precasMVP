# Image Prompts

**Generate these in ChatGPT Image, save with the exact filename given, into
`precas-mvp/public/img/`.**

The filenames matter. I will write the code against these exact paths, so a
renamed file is a broken image. If you skip one, tell me which — the code has a
graceful fallback for every single one, but I need to know so I do not ship a
grey box.

---

## Read this once before generating

Paste this **style block at the start of every prompt**, then the specific
prompt underneath it. Consistency across the set matters far more than any one
image being beautiful — nine photos that look like one photographer beats nine
better photos that look bought from a stock site.

```
STYLE (applies to this whole set):
Editorial documentary photography, shot on a 50mm lens at f/2.0. Natural
available light only, no flash, no studio lighting. Muted, slightly
desaturated colour with warm neutral tones — soft creams, warm greys, muted
navy. Gentle film grain. Shallow depth of field with a soft background.
Real, candid, unposed: someone concentrating, not someone performing.
Nepali subjects, Kathmandu interiors — modest, real rooms, not luxury.
NO stock-photo energy: no thumbs up, no handshakes, no laughing at a laptop,
no whiteboards, no westerners, no corporate offices, no graduation caps.
NO text, NO logos, NO watermarks anywhere in the image.
Leave the composition uncluttered — large calm areas where UI text can sit.
```

---

## The set — 9 photographs and 3 illustrations

### 1 · `hero-desktop.jpg` — 1920×1080

The single most important image on the site. First thing anybody sees.

```
A young Nepali woman, around nineteen, sitting at a small wooden desk in a
modest Kathmandu bedroom in the late afternoon. She is looking at a laptop
screen with quiet concentration, mid-thought, not smiling. Over-ear headphones
rest around her neck. Warm low sunlight comes through a window on the LEFT,
falling across her face and the desk. Behind her, softly out of focus, a plain
wall and a shelf with a few books.
Composition: she sits in the RIGHT THIRD of the frame. The left half is calm
and uncluttered — soft wall and window light — because large headline text
will be placed there.
Mood: calm, serious, hopeful. She is preparing for something that matters.
```

### 2 · `hero-mobile.jpg` — 1080×1620 (portrait)

Same subject and session, recomposed. Not a crop of the above.

```
The same young Nepali woman at the same desk, same light, same clothes, shot
in PORTRAIT orientation. She sits in the LOWER THIRD of the frame, looking at
her laptop. The upper half of the frame is soft window light and plain wall,
uncluttered, because headline text will sit there.
```

### 3 · `step-1-choose.jpg` — 1200×900 (4:3)

```
Close, over-the-shoulder view of the same young Nepali woman holding a phone in
one hand, scrolling. Her thumb is mid-scroll. The phone screen is BLANK WHITE —
no interface, no text, no icons. Soft indoor daylight. Her face is partly in
frame, thoughtful. Background softly blurred.
```

### 4 · `step-2-speak.jpg` — 1200×900 (4:3)

```
The same young Nepali woman speaking towards a laptop webcam, mid-sentence,
one hand slightly raised as people do when explaining something. She looks
focused and a little nervous, not performing. The laptop screen is BLANK WHITE.
Evening indoor light. Shot slightly from the side so we see both her face and
the laptop edge.
```

### 5 · `step-3-report.jpg` — 1200×900 (4:3)

```
The same young Nepali woman sitting back slightly, reading something on her
phone with a small, private, relieved expression — not a broad smile. The
phone screen is BLANK WHITE. Soft warm light. Quiet and resolved in mood, the
end of the journey the other two images started.
```

### 6 · `trust-band.jpg` — 1600×600

Sits behind the university strip. Must be quiet enough to place logos on.

```
A very soft, heavily out-of-focus interior: a study room with warm daylight
through a large window. Almost abstract — soft bands of cream, pale blue-grey
and warm white. No recognisable people or objects. Extremely low contrast and
low detail, like a background plate. It must never compete with anything
placed on top of it.
```

### 7 · `dashboard-welcome.jpg` — 1200×800

For the top of the student dashboard.

```
A tidy, uncluttered corner of a desk in warm morning light: a closed notebook,
a pen, a glass of water, and the corner of a laptop. NO PEOPLE. Shot from
above at a slight angle. Lots of empty desk surface. Calm, ordered, ready —
the feeling of sitting down to work rather than of work already piled up.
```

### 8 · `signin-aside.jpg` — 1000×1400 (portrait)

The left panel of the sign-in screen on desktop.

```
A young Nepali man, around twenty, seated at a desk near a window, seen from
behind and slightly to the side, so his face is not visible. He is looking at a
laptop with BLANK WHITE screen. Soft daylight. Very calm, quiet composition
with a lot of negative space in the upper half.
```

### 9 · `og-share.jpg` — 1200×630

What appears when the link is shared on WhatsApp or Facebook. This one carries
most of the first impressions in Nepal, where links spread on WhatsApp.

```
The same young Nepali woman at her desk with the laptop, warm evening light,
composed so she sits on the RIGHT and the LEFT HALF is clean soft wall — a
title will be overlaid there. Slightly richer and more contrasted than the hero
image, because it will be seen small in a chat thread.
```

---

## The three illustrations

Different prompt style. **Do not paste the photographic style block for these.**

### 10 · `empty-reports.svg` (or `.png` at 800×600, transparent)

```
A minimal two-colour line illustration, thin even 2px strokes, NO fill, NO
shading, NO faces, transparent background. Colours: dark navy #0d1b2a for the
line work and green #0f9d63 for one small accent only.
Subject: a single sheet of paper with three simple lines of writing on it and
one small check mark. Calm and geometric, in the style of a modern editorial
spot illustration. Plenty of empty space around the subject.
```

### 11 · `empty-search.svg` (or `.png` at 800×600, transparent)

```
Same minimal two-colour line illustration style: 2px navy #0d1b2a strokes, one
#0f9d63 accent, no fill, no faces, transparent background.
Subject: a simple magnifying glass resting beside a small map pin. Geometric
and calm. Plenty of empty space.
```

### 12 · `empty-practice.svg` (or `.png` at 800×600, transparent)

```
Same minimal two-colour line illustration style: 2px navy #0d1b2a strokes, one
#0f9d63 accent, no fill, no faces, transparent background.
Subject: a simple microphone with two small sound arcs beside it. Geometric and
calm. Plenty of empty space.
```

---

## University logos — you do NOT need to generate these

Do not use an image model for these. A generated logo would be a **fake version
of somebody else's trademark**, which is both wrong and legally risky.

The code draws a monogram tile instead — the initials in serif on a tinted
square — and it looks deliberate rather than broken. When you want the real
ones, download each from the university's own press or brand page and drop the
file into `public/university-logos/` using these exact names:

```
bpp.png · uel.png · uwl.png · wolverhampton.png · ravensbourne.png · coventry.png
```

The tile is a fixed size and the logo is contained inside it, so a missing file
never shifts the layout and a wrong-sized file never stretches.

---

## Checklist

Save all of these into `precas-mvp/public/img/`:

- [ ] `hero-desktop.jpg` 1920×1080
- [ ] `hero-mobile.jpg` 1080×1620
- [ ] `step-1-choose.jpg` 1200×900
- [ ] `step-2-speak.jpg` 1200×900
- [ ] `step-3-report.jpg` 1200×900
- [ ] `trust-band.jpg` 1600×600
- [ ] `dashboard-welcome.jpg` 1200×800
- [ ] `signin-aside.jpg` 1000×1400
- [ ] `og-share.jpg` 1200×630
- [ ] `empty-reports.png` 800×600 transparent
- [ ] `empty-search.png` 800×600 transparent
- [ ] `empty-practice.png` 800×600 transparent

**Two things that will save you a regeneration.** Keep the same woman across
images 1–5 and 9 — say "the same young Nepali woman from the previous image"
in each follow-up prompt, or attach the first one as a reference. And check
every screen in every photo is genuinely blank: a model-invented interface in
the hero is the fastest way to make a real product look fake.

Do not compress them before sending. I will resize and convert to WebP as part
of the build, which is where that belongs.
