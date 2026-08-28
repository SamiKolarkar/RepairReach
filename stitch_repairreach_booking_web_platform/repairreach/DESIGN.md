---
name: RepairReach
colors:
  surface: '#f8f9ff'
  surface-dim: '#ccdbf3'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d5e3fc'
  on-surface: '#0d1c2e'
  on-surface-variant: '#3f484c'
  inverse-surface: '#233144'
  inverse-on-surface: '#eaf1ff'
  outline: '#6f787d'
  outline-variant: '#bec8cd'
  surface-tint: '#006781'
  primary: '#005a71'
  on-primary: '#ffffff'
  primary-container: '#0e7490'
  on-primary-container: '#d3f1ff'
  inverse-primary: '#81d1f0'
  secondary: '#006b5f'
  on-secondary: '#ffffff'
  secondary-container: '#62fae3'
  on-secondary-container: '#007165'
  tertiary: '#4b5459'
  on-tertiary: '#ffffff'
  tertiary-container: '#636c71'
  on-tertiary-container: '#e5eef4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b9eaff'
  primary-fixed-dim: '#81d1f0'
  on-primary-fixed: '#001f29'
  on-primary-fixed-variant: '#004d62'
  secondary-fixed: '#62fae3'
  secondary-fixed-dim: '#3cddc7'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005047'
  tertiary-fixed: '#dbe4ea'
  tertiary-fixed-dim: '#bfc8ce'
  on-tertiary-fixed: '#141d21'
  on-tertiary-fixed-variant: '#3f484d'
  background: '#f8f9ff'
  on-background: '#0d1c2e'
  surface-variant: '#d5e3fc'
typography:
  h1:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  h3:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  button:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: auto
  max-width: 1200px
---

## Brand & Style
The brand personality is centered on "Reliable Accessibility." It balances the technical precision of a repair service with the approachability of a local neighborhood helper. The design system leverages a **Corporate Modern** style with a minimalist lean to ensure clarity during the booking process. 

The goal is to evoke a sense of relief and confidence in the user. By utilizing expansive whitespace and a clear visual hierarchy, this design system reduces the cognitive load often associated with home or technical repairs. The interface feels light and breathable, prioritizing ease of navigation and clear calls to action over decorative complexity.

## Colors
This design system utilizes a professional palette anchored by a trustworthy **Deep Teal** (#0E7490) as the primary brand color. This shade provides the "corporate" weight necessary for a service platform. A vibrant **Mint Teal** (#2DD4BF) serves as a secondary accent for secondary buttons and progress indicators, adding a "friendly" and energetic spark.

The background is a soft, off-white (#FAFAFA) to reduce eye strain, while neutrals are pulled from a slate-blue family to maintain a cohesive cool-toned professional atmosphere. High-contrast colors like error red and success green are slightly desaturated to fit the "soft" aesthetic of the theme.

## Typography
**Manrope** is the sole typeface for this design system, chosen for its modern, geometric construction that remains highly legible at various sizes. It bridges the gap between a technical "system" font and a friendly consumer brand.

Headlines use a heavy weight (800) and tight letter spacing to create a strong, authoritative presence. Body text is set with generous line heights to ensure long-form service descriptions remain readable on mobile devices. Labels and utility text use a semi-bold weight to maintain clarity even at smaller scales.

## Layout & Spacing
The design system follows a **Fluid Grid** model optimized for mobile-first consumption. On mobile devices, a single-column layout is preferred with 20px side margins to ensure the content doesn't feel cramped. As the screen scales to desktop, the layout transitions to a 12-column grid with a maximum container width of 1200px.

A strict 8px spacing rhythm governs all element relationships. For mobile touch targets, a minimum "safe zone" of 48x48px is enforced for all interactive elements. Section spacing is generous (40px-64px) to emphasize the "clean" and "professional" brand pillar.

## Elevation & Depth
Depth is conveyed through **Ambient Shadows**. This design system avoids harsh borders in favor of extra-diffused, low-opacity shadows that use a subtle primary color tint (#0E7490 at 5-8% opacity) instead of pure black. This creates a softer, more integrated look.

Three primary elevation levels are used:
1.  **Level 0 (Flat):** Used for the main background and inactive input states.
2.  **Level 1 (Surface):** Subtle shadow for cards and navigation bars, making them appear slightly lifted from the page.
3.  **Level 2 (Floating):** Used for active dropdowns, modals, and hovered states of primary buttons, creating a clear "interaction layer."

## Shapes
This design system uses a **Rounded** shape language to reinforce the "friendly" brand attribute. The standard radius of 0.5rem (8px) is applied to all standard components like buttons and input fields.

Larger containers, such as service cards and modals, utilize a 1rem (16px) radius to emphasize their role as distinct content modules. Full-width mobile buttons and tag chips may use a "pill" style (full rounding) to differentiate them from standard form elements.

## Components

### Buttons
Buttons are tall (56px on mobile) with bold, centered text. The **Primary Button** uses a solid Deep Teal background with white text and a Level 2 shadow on hover. **Secondary Buttons** use a Mint Teal outline with a subtle light-teal fill.

### Input Fields
Inputs are designed for high-friction environments. They feature a 56px height, a light gray border (#E2E8F0), and a Level 1 shadow when focused. Labels are always visible above the input, never just as placeholders, to ensure accessibility.

### Cards
Cards are the primary vehicle for service listings. They feature a Level 1 shadow, 16px padding, and 16px corner radius. On mobile, cards are full-width minus the side margins to maximize real estate for images and pricing info.

### Chips & Tags
Used for service categories (e.g., "Plumbing," "Electrical"). These use a soft-teal background (#F0F9FF) with primary teal text. They have a 100px border-radius (pill-shaped) to distinguish them from clickable buttons.

### Checkboxes & Radios
Larger than standard (24x24px) to accommodate "fat-finger" mobile interactions. They use the primary teal color for the "checked" state to signify a confirmed action.

### Lists
Service lists use generous vertical padding (16px-24px) between items and a very thin horizontal separator (#F1F5F9) to maintain a clean, organized aesthetic.