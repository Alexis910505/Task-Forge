---
name: TaskForge Dark
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c2c6d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8c90a0'
  outline-variant: '#424654'
  surface-tint: '#b0c6ff'
  primary: '#b0c6ff'
  on-primary: '#002d6e'
  primary-container: '#558dff'
  on-primary-container: '#002761'
  inverse-primary: '#0058ca'
  secondary: '#89ceff'
  on-secondary: '#00344d'
  secondary-container: '#00a2e6'
  on-secondary-container: '#00344e'
  tertiary: '#ffb690'
  on-tertiary: '#542100'
  tertiary-container: '#e86d17'
  on-tertiary-container: '#4a1c00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b0c6ff'
  on-primary-fixed: '#001944'
  on-primary-fixed-variant: '#00429b'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb690'
  on-tertiary-fixed: '#331100'
  on-tertiary-fixed-variant: '#783200'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 40px
  margin-tablet: 24px
  margin-mobile: 16px
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  stack-xl: 48px
---

## Brand & Style

This design system is engineered for peak productivity in enterprise SaaS environments. The aesthetic is rooted in **Modern Minimalism** with a focus on high-fidelity execution. It targets power users who require deep focus over long periods, utilizing a dark-mode-first approach to reduce eye strain while maintaining an air of professional authority.

The brand personality is precise, reliable, and sophisticated. The UI avoids unnecessary decoration, favoring structural integrity and subtle micro-interactions that signal high performance. Every element is designed to feel intentional, with a heavy emphasis on "Information Density" managed through impeccable whitespace and a "Dark Slate" hierarchy.

## Colors

The palette is anchored by "Midnight Charcoal" and "Deep Slate" foundations to provide a stable, low-fatigue backdrop. Unlike standard blacks, these deep blues provide a richer sense of depth.

- **Primary & Accent:** A vibrant, high-contrast blue (#2E7BFF) is used sparingly for primary actions and critical status indicators, ensuring they "pop" against the dark background.
- **Surface Tiers:** We use a step-down approach for surfaces. The base layer is the darkest, with each subsequent functional layer (cards, modals) becoming progressively lighter to simulate proximity to the user.
- **High Contrast:** Text is strictly maintained at a high contrast ratio. Primary text utilizes off-white for readability, while metadata uses mid-tone slates.

## Typography

This design system utilizes a tiered typographic approach to balance modern aesthetics with technical utility.

1.  **Manrope (Headlines):** Used for all structural headings to provide a refined, modern feel with its balanced geometric shapes.
2.  **Inter (Body):** The workhorse for the UI. It provides exceptional legibility at small sizes and high-density data views.
3.  **JetBrains Mono (Labels/Data):** Employed for status chips, IDs, and technical metadata. The monospaced nature emphasizes the "high-performance" and "tool-like" quality of the enterprise software.

Tracking is tightened slightly for large headlines to maintain a compact, high-fidelity appearance.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. While the main content area is capped at 1440px to ensure line lengths remain readable, internal components utilize a fluid grid for maximum efficiency.

- **The 4px Rule:** All spacing (padding, margins, gaps) must be a multiple of 4px. This creates a rigorous mathematical rhythm.
- **Grid:** A 12-column grid is standard for desktop, collapsing to 8-columns for tablet and a single-column stack for mobile.
- **Density:** As an enterprise tool, this design system favors "Comfortable Density"—minimizing wasted space without compromising touch targets or legibility. Use `stack-md` (16px) as the default gap for most component groupings.

## Elevation & Depth

In this dark-mode environment, depth is communicated through **Tonal Layering** and **Subtle Outlines** rather than heavy shadows.

- **Surface Levels:** 
  - Level 0 (Background): #020617.
  - Level 1 (Cards/Sidebar): #0F172A with a 1px solid border (#334155).
  - Level 2 (Popovers/Modals): #1E293B with a subtle blue-tinted drop shadow (0px 10px 30px rgba(0,0,0,0.5)).
- **Inner Glow:** Interactive elements like active inputs or primary buttons feature a very soft 1px inner stroke to simulate a "beveled" high-fidelity edge.
- **Glassmorphism:** Use sparingly for global navigation overlays or hovering toolbars. Apply a `backdrop-filter: blur(12px)` with a 10% opacity white tint to maintain visibility of the content beneath.

## Shapes

The shape language is **Rounded**, striking a balance between the clinical feel of sharp corners and the overly casual nature of pill shapes. 

- **Standard Elements:** Buttons, inputs, and cards use a 0.5rem (8px) radius.
- **Large Elements:** Modals and large containers scale up to 1rem (16px).
- **Consistent Continuity:** Ensure that nested elements have a smaller radius than their parent containers to maintain visual harmony (Inner radius = Outer radius - Padding).

## Components

### Buttons
- **Primary:** High-contrast blue background, white text. No gradient. 1px inner top border (lighter blue) for a tactile feel.
- **Secondary:** Ghost style. Transparent background with a #334155 border. Text in #F8FAFC.
- **State Changes:** Hover states should involve a brightness increase of 10% rather than a color shift.

### Input Fields
- **Default:** Darker than the surface background (#020617) to create a "well" effect.
- **Focus:** 2px solid #2E7BFF border with a soft outer glow.
- **Labels:** Always use `label-md` (JetBrains Mono) for field labels to emphasize the technical nature of the task.

### Chips & Badges
- **Status Badges:** Use low-saturation background tints with high-saturation text for readability (e.g., Success = Dark Green background / Emerald text).
- **Interactive Chips:** 8px roundedness, utilizing the secondary background color.

### Cards
- Cards must not have heavy shadows. Use a 1px #334155 border as the primary separator. For "Active" or "Selected" cards, change the border color to the primary blue.

### Lists & Tables
- Data-heavy views should use alternating row stripes (Zebra striping) with only 2% difference in hex value to provide subtle scanning guides.