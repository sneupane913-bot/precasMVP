---
name: Academic Clarity
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#191c1e'
  on-tertiary-container: '#818486'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Noto Serif
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Noto Serif
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: Noto Serif
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Noto Serif
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1140px
  gutter: 20px
---

## Brand & Style

The design system is centered on the concept of "Academic Clarity"—a student-first philosophy that prioritizes cognitive ease and deep focus. The brand personality is authoritative yet approachable, mimicking the quiet, structured atmosphere of a premium university library.

The design style utilizes **Minimalism** with subtle **Tonal Layering**. By leveraging generous whitespace, the interface reduces anxiety often associated with high-stakes testing, fostering a sense of calm and competence. Every element serves a functional purpose, eliminating visual noise to guide the student toward their primary goal: focused practice and mastery.

## Colors

The palette is anchored by **Deep Navy Ink** (#0F172A), used for typography and structural elements to establish an authoritative, academic foundation. **Emerald Green** (#10B981) serves as the primary action color, signaling progress, success, and positive movement.

**Generous Whitespace** is treated as a core color asset, utilizing white (#FFFFFF) and a very light Slate (#F8FAFC) for background differentiation. This high-contrast approach ensures maximum legibility and a clean, premium aesthetic. Secondary actions and disabled states utilize muted greys to maintain a clear visual hierarchy.

## Typography

This design system employs a sophisticated pairing of **Noto Serif** for headings and **Hanken Grotesk** for body and interface text. 

- **Noto Serif** provides the academic "voice," lending authority to instructions and module titles.
- **Hanken Grotesk** offers a contemporary, highly legible experience for long-form reading and interactive labels.

For mobile devices, larger display styles scale down to prevent text wrapping issues while maintaining a clear hierarchy. Line heights are intentionally generous (1.6 for body) to improve readability for students during long study sessions.

## Layout & Spacing

The layout follows a **Fluid Grid** model with strict margin constraints to preserve whitespace. 

- **Mobile First**: All layouts are designed starting at 375px, using a 4-column grid with 16px margins.
- **Desktop**: Expands to a 12-column grid within a max-width container of 1140px. 
- **Rhythm**: A base 8px unit dictates all padding and margins. Vertical spacing between sections (XL) is intentionally large to create a "breathable" interface.

Tap targets are prioritized for mobile users, ensuring all interactive elements have a minimum height of 48px to accommodate comfortable touch interactions.

## Elevation & Depth

To maintain a minimalist and clean aesthetic, this design system avoids heavy shadows. Instead, it uses **Tonal Layers** and **Low-Contrast Outlines**.

- **Surface Levels**: The base background is white. Secondary containers (like cards or sidebars) use the tertiary color (#F8FAFC) or a very thin 1px border (#E2E8F0).
- **Interactive Depth**: Only the primary action buttons and active "Focus" cards use a very soft, highly diffused ambient shadow (0px 4px 20px, 4% opacity of the primary color) to indicate "lift" without creating visual clutter.

## Shapes

The shape language is **Soft**. A subtle 0.25rem (4px) corner radius is applied to input fields, buttons, and small UI components to take the edge off the "technical" feel of a test-prep platform while remaining professional.

Larger containers and instructional cards utilize `rounded-lg` (8px) to feel approachable. Completely round "pill" shapes are reserved exclusively for progress indicators and status chips to distinguish them from actionable buttons.

## Components

### Buttons
Primary buttons use the Emerald Green background with White text. They feature a generous padding (16px 24px) to ensure they are high-visibility and easy to tap. Secondary buttons are "ghost" style with a 1px Navy border.

### Input Fields
Inputs are defined by a 1px Slate border that thickens and changes to Navy on focus. Labels are always positioned above the field in `label-md` for clarity.

### Progress Indicators
A thin, horizontal bar using Emerald Green on a light grey track. In study modes, this should be sticky to the top of the viewport to provide constant feedback without obscuring content.

### Practice Cards
Question cards use the Tertiary background (#F8FAFC) with 24px internal padding. They are designed to stand out against the white page background using only a slight tonal shift rather than a border, creating a seamless, integrated look.

### Checkboxes & Radios
Custom-styled to be larger than standard browser defaults (24px x 24px). The Emerald Green fill is used only when selected, providing immediate and satisfying visual confirmation of a student's choice.