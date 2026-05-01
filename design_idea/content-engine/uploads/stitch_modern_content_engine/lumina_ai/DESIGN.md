---
name: Lumina AI
colors:
  surface: '#f5fbf5'
  surface-dim: '#d6dbd6'
  surface-bright: '#f5fbf5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff5ef'
  surface-container: '#eaefea'
  surface-container-high: '#e4eae4'
  surface-container-highest: '#dee4de'
  on-surface: '#171d1a'
  on-surface-variant: '#3d4943'
  inverse-surface: '#2c322e'
  inverse-on-surface: '#ecf2ed'
  outline: '#6d7a73'
  outline-variant: '#bccac1'
  surface-tint: '#006c4e'
  primary: '#00694c'
  on-primary: '#ffffff'
  primary-container: '#008560'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dbae'
  secondary: '#0060a8'
  on-secondary: '#ffffff'
  secondary-container: '#5da9fe'
  on-secondary-container: '#003d6d'
  tertiary: '#993f3a'
  on-tertiary: '#ffffff'
  tertiary-container: '#b85751'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#86f8c9'
  primary-fixed-dim: '#68dbae'
  on-primary-fixed: '#002115'
  on-primary-fixed-variant: '#00513a'
  secondary-fixed: '#d2e4ff'
  secondary-fixed-dim: '#a1c9ff'
  on-secondary-fixed: '#001c38'
  on-secondary-fixed-variant: '#004880'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410003'
  on-tertiary-fixed-variant: '#7e2a27'
  background: '#f5fbf5'
  on-background: '#171d1a'
  surface-variant: '#dee4de'
typography:
  h1:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.01em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: '0'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2.5rem
  container-max: 1280px
  gutter: 1.5rem
---

## Brand & Style
The brand personality for this design system is centered on "Intelligent Clarity." As an AI content engine, the interface must bridge the gap between complex machine learning capabilities and human-centered productivity. The emotional response should be one of calm confidence, efficiency, and professional reliability. 

The design style is **Corporate / Modern**, characterized by a sophisticated balance of utility and aesthetic polish. It avoids the coldness of traditional enterprise software by utilizing a soft, tinted background and organic rounded corners. The focus is on content legibility and reducing cognitive load through a clear information hierarchy and purposeful whitespace.

## Colors
The palette is rooted in a professional "Deep Teal" primary and a "Confidence Blue" secondary. This combination signals growth and technical stability. 

- **Primary Teal (#1D9E75):** Used for primary actions, success states, and brand identifiers.
- **Secondary Blue (#378ADD):** Used for supportive actions, links, and informational highlights.
- **Backgrounds:** The primary interface utilizes an off-white teal tint (#E1F5EE) to reduce eye strain compared to pure white, while pure white (#FFFFFF) is reserved for content cards and floating surfaces to create distinct layering.
- **Neutrals:** Text utilizes a warm, dark charcoal (#2C2C2A) rather than pure black to maintain an approachable, high-end feel.

## Typography
The system uses **Inter** exclusively to ensure a functional, systematic, and utilitarian aesthetic. The typographic scale prioritizes vertical rhythm and readability. 

Headlines use slightly tighter letter spacing and heavier weights to provide a strong visual anchor for content sections. Body text uses a generous line height (1.5–1.6) to ensure long-form AI-generated content is easy to digest. Labels and captions are set with slightly increased tracking to maintain legibility at smaller scales.

## Layout & Spacing
This design system employs a **12-column fluid grid** for dashboard views and a **fixed-width centered container** for document-focused workflows. 

The spacing rhythm is built on a 4px baseline. Components and layouts should use multiples of 8px (0.5rem) to ensure consistency. Plenty of whitespace is mandated around major content blocks to prevent the UI from feeling "cramped," a common pitfall in data-heavy AI tools. Internal padding for cards and modals should scale between 24px (lg) and 40px (xl) to maintain an airy, premium feel.

## Elevation & Depth
Depth is conveyed through **tonal layers** and **ambient shadows**. The background (#E1F5EE) acts as the base floor. Content "lives" on white surfaces (#FFFFFF) that sit slightly above the floor.

Shadows are soft, diffused, and slightly tinted with the primary teal color to maintain color harmony. Use three levels of elevation:
- **Low:** 2px blur, 10% opacity (Buttons, input fields).
- **Medium:** 12px blur, 8% opacity (Standard content cards, dropdowns).
- **High:** 24px blur, 12% opacity (Modals, active AI prompt overlays).

Avoid heavy borders; instead, use subtle 1px strokes in a slightly darker neutral tint to define boundaries on white surfaces.

## Shapes
The shape language is defined by a "High-Quality Rounded" approach. A base radius of **0.5rem (8px)** is applied to most standard components like buttons, input fields, and checkboxes. 

Larger containers, such as content cards, use **1rem (16px)**, while top-level surfaces like modals or primary feature blocks use **1.5rem (24px)**. This tiered roundedness creates a nesting effect where smaller internal elements feel "held" by larger external containers.

## Components

- **Buttons:** Primary buttons use the Teal (#1D9E75) with white text. Secondary buttons use a subtle Teal tint background with Teal text. All buttons feature 8px rounded corners and a slight transition on hover.
- **Input Fields:** Use white backgrounds with a subtle gray border. On focus, the border shifts to Blue (#378ADD) with a faint glow.
- **Cards:** White surfaces with a 16px corner radius and a medium ambient shadow. Cards are the primary vessel for AI-generated outputs.
- **Chips:** Small, highly rounded (pill-style) tags for categories. Use low-saturation tints of the secondary blue to denote metadata without distracting from the primary content.
- **AI Prompt Bar:** A distinctive component featuring a slightly larger corner radius (24px) and a subtle blue-to-teal gradient border to indicate its "active" intelligence role.
- **Checkboxes & Radios:** Use the primary teal for checked states to maintain brand consistency.
- **Lists:** Clean, borderless rows with subtle hover states (using #E1F5EE) to indicate interactivity.