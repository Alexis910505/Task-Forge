---
name: TaskForge
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#767587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4745e5'
  primary: '#4744e5'
  on-primary: '#ffffff'
  primary-container: '#6161ff'
  on-primary-container: '#ffffff'
  inverse-primary: '#c1c1ff'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fc'
  on-secondary-container: '#57657a'
  tertiary: '#006d2e'
  on-tertiary: '#ffffff'
  tertiary-container: '#00893c'
  on-tertiary-container: '#ffffff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1dfff'
  primary-fixed-dim: '#c1c1ff'
  on-primary-fixed: '#09006b'
  on-primary-fixed-variant: '#2c24ce'
  secondary-fixed: '#d5e3fc'
  secondary-fixed-dim: '#b9c7df'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#3a485b'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-label:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  space-1: 0.25rem
  space-2: 0.5rem
  space-4: 1rem
  space-6: 1.5rem
  space-8: 2rem
  container-max: 1440px
  sidebar-width: 260px
  gutter: 1.5rem
---

## Brand & Style

This design system is built for high-stakes operational environments where clarity and reliability are paramount. The brand personality is **Industrial-Modern**: a fusion of the precision found in modern developer tools and the rugged dependability required by field services and logistics.

The visual style leans heavily into **Corporate Minimalism**. It avoids decorative flourishes in favor of high-functioning utility. The UI should feel systematic and architectural, evoking an emotional response of "controlled efficiency." By prioritizing structural hierarchy and data density, the design system ensures that complex task workflows remain legible for both office administrators and field workers operating in varied lighting conditions.

## Colors

The palette is anchored by a vibrant **Electric Blue** (#6161FF) derived from the brand's core identity, used strategically for primary actions and focus states. This is balanced by a deep **Slate** scale which provides the "enterprise-grade" professional foundation.

A high-visibility **Success Green** (#22C55E) is utilized for status indicators, completion states, and "all-clear" field updates. In dark mode, surfaces shift to a deep navy-slate rather than pure black to maintain depth and reduce eye strain during night shifts or in low-light environments. Contrast ratios are strictly maintained at WCAG AA standards or higher to ensure accessibility for field personnel.

## Typography

This design system utilizes **Inter** exclusively to leverage its exceptional legibility and systematic feel. The type scale is optimized for data-heavy interfaces, prioritizing clarity over expression.

**Label-bold** is a specialized role for metadata and status badges, using high-contrast weight and slight letter spacing to stand out in dense grids. **Mono-label** uses tabular figures for numerical data like logistics IDs, timestamps, and coordinates, ensuring vertical alignment in lists. On mobile devices, heading sizes are aggressively scaled down to ensure that critical operational data remains "above the fold" on smaller handheld screens.

## Layout & Spacing

The layout follows a **Fluid Content Grid** within a fixed sidebar framework. The navigation sidebar remains anchored at 260px for quick access to core modules (Tasks, Assets, Fleet, Personnel).

Content follows an 8px rhythmic grid system to ensure visual consistency across all components.
- **Desktop:** A 12-column fluid grid with 24px gutters. Content is often organized into "Card Groups" that span 4, 6, or 12 columns.
- **Tablet:** Collapses the sidebar into a compact icon-rail (64px) to maximize workspace. Gutters reduce to 16px.
- **Mobile:** Single column layout with 16px safe-area margins. Navigation moves to a bottom-bar for thumb-optimized access during field operations.

## Elevation & Depth

This design system uses **Tonal Layering** supplemented by **Low-Contrast Outlines** rather than heavy shadows. This "flat-depth" approach prevents the UI from feeling cluttered.

- **Level 0 (Background):** The base canvas (White or Deep Slate).
- **Level 1 (Cards/Sidebar):** A subtle background shift or 1px border (#E2E8F0 in light, #1E293B in dark) defines the primary workspace containers.
- **Level 2 (Modals/Popovers):** Used for temporary overlays. These feature a soft, extra-diffused ambient shadow (10% opacity) and a backdrop blur (8px) to maintain context while focusing the user.
- **Active State:** Elements being dragged or interacted with use a 2px primary-colored glow to provide immediate tactile feedback.

## Shapes

The shape language is **Soft-Square**. By utilizing a base radius of 4px (Soft), the design system maintains an organized, professional appearance that feels more "industrial" and "robust" than fully rounded consumer apps.

Larger containers like primary dashboard cards utilize `rounded-lg` (8px) to distinguish them from smaller UI controls like buttons and inputs which stay at the standard 4px. Status chips for task priority use a fully pill-shaped radius to differentiate them from interactive buttons at a glance.

## Components

### Buttons & Inputs
Buttons feature a solid, high-contrast fill for primary actions and a "ghost" style (border only) for secondary actions. Input fields use a 1px slate border that thickens and changes to primary blue on focus, ensuring field workers can easily identify the active entry area.

### Cards
Cards are the primary organizational unit. They feature a header area with a 1px bottom border to separate titles and actions from the body content. In logistics and maintenance views, cards should include a "dense mode" option that reduces internal padding.

### Chips & Status Indicators
High-contrast labels are used for status tracking (e.g., "IN PROGRESS," "PENDING APPROVAL"). These use the `label-bold` typography and background tints corresponding to their status (Green for Success, Amber for Warning, Blue for Info).

### Lists & Tables
Enterprise-grade tables must support "Sticky Headers" and "Sticky First Columns" for horizontal scrolling on mobile. Rows use a subtle hover state transition (#F8FAFC) to help users track their eye line across wide data sets.

### Sidebar Navigation
The sidebar uses a dark-themed contrast even in light mode to provide a clear mental model of "Navigation" vs "Workspace." Active links are indicated by a 3px vertical "accent bar" on the left edge.