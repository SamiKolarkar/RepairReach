---
name: Field Professional
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fd'
  surface-container: '#ededf8'
  surface-container-high: '#e7e7f2'
  surface-container-highest: '#e1e2ec'
  on-surface: '#191b23'
  on-surface-variant: '#434654'
  inverse-surface: '#2e3038'
  inverse-on-surface: '#f0f0fb'
  outline: '#737685'
  outline-variant: '#c3c6d6'
  surface-tint: '#0c56d0'
  primary: '#003d9b'
  on-primary: '#ffffff'
  primary-container: '#0052cc'
  on-primary-container: '#c4d2ff'
  inverse-primary: '#b2c5ff'
  secondary: '#4f5f7b'
  on-secondary: '#ffffff'
  secondary-container: '#cdddff'
  on-secondary-container: '#51617e'
  tertiary: '#7b2600'
  on-tertiary: '#ffffff'
  tertiary-container: '#a33500'
  on-tertiary-container: '#ffc6b2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#0040a2'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#b7c7e8'
  on-secondary-fixed: '#091c35'
  on-secondary-fixed-variant: '#374763'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59b'
  on-tertiary-fixed: '#380d00'
  on-tertiary-fixed-variant: '#812800'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ec'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
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
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  margin-edge: 16px
  gutter: 12px
  touch-target-min: 48px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style

The design system is built on the pillars of reliability, efficiency, and clarity. It is a work-focused environment designed specifically for technicians who operate in high-pressure field conditions. The aesthetic follows a **Corporate / Modern** movement with a heavy emphasis on **Minimalism** to reduce cognitive load during complex tasks.

The visual language prioritizes utility over decoration. By utilizing significant whitespace and a structured layout, the UI ensures that critical information—such as job locations, part numbers, and status updates—is instantly scannable. The emotional response is one of calm authority, giving the user confidence that the tool is as professional as the service they provide.

## Colors

The palette is anchored by a deep, trustworthy blue that communicates stability. The primary color is used sparingly for high-intent actions and navigation to maintain focus. 

- **Functional Status:** We use a high-chroma traffic-light system for instant status recognition: Green for completed/verified, Amber for pending/warning, and Red for rejected/critical issues.
- **Surface Strategy:** The design system utilizes a clean white base for cards and interactive elements, set against a very light gray background to create subtle contrast and depth without using heavy lines.
- **Text Contrast:** Neutrals are tiered to ensure that secondary information (like timestamps or labels) is distinct from primary content.

## Typography

The typography in this design system utilizes **Inter** for its exceptional legibility on mobile screens and its neutral, systematic character. 

Hierarchy is established through weight and color rather than excessive size variations. Headlines are bold and tight to anchor the page, while body text uses a generous line height to ensure readability in varying light conditions (e.g., outdoor direct sunlight). Labels use an uppercase style with increased letter spacing to differentiate metadata from actionable text.

## Layout & Spacing

This design system employs a **Fluid Grid** tailored for Android devices. The layout is optimized for "The Thumb Zone," placing critical interactive elements within the lower two-thirds of the screen to facilitate one-handed operation.

- **Grid:** A 4-column fluid grid for mobile with 16px outer margins.
- **Rhythm:** An 8px linear scale (with 4px increments for tight components) governs all padding and margins.
- **Verticality:** Information is stacked in clear horizontal rows to support natural scrolling and scanning patterns.

## Elevation & Depth

To maintain a minimalist look while providing clear affordances, the design system uses **Ambient Shadows** and tonal layering. 

Interactive elements like cards and buttons sit on a "Low Elevation" plane (Level 1), using soft, diffused shadows with a large blur radius and low opacity (approx. 8-10%) to suggest lift without creating visual clutter. Elevated states (like active dragging or modals) use a slightly more pronounced shadow (Level 2). Static background elements use "Tonal Layers"—subtle shifts in background color—to differentiate between header areas and content zones.

## Shapes

The shape language is defined by a **Rounded** philosophy. Standard components (buttons, input fields) use a 0.5rem (8px) radius, while the primary container cards use a larger 1rem (16px) radius to create a soft, approachable feel that balances the technical nature of the app.

This consistency in rounding helps group related information visually and reinforces the professional, modern identity of the interface. Full-width buttons at the bottom of the screen may use a 0px radius or be fully rounded "pills" depending on the specific action type.

## Components

The components are engineered for "Field-First" utility:

- **Large Touch Targets:** Every interactive element, including checkboxes and icons, maintains a minimum hit area of 48x48px to accommodate gloved hands or movement.
- **Rounded Cards:** Job details and service records are housed in cards with a 16px corner radius and a soft shadow, clearly separating individual tasks.
- **Persistent Bottom Navigation:** A fixed bar provides instant access to 'Jobs', 'Messages', 'Parts', and 'Profile'.
- **Action Buttons:** Primary actions are full-width and high-contrast blue. Secondary actions use the ghost-style with a subtle border.
- **Status Chips:** Small, high-contrast labels used within cards to communicate job progress (e.g., "In Progress," "Pending Parts").
- **Input Fields:** Large, clearly outlined text fields with floating labels to ensure the technician knows exactly what information is being entered even after they start typing.
- **Job Action Bar:** A sticky container at the bottom of job detail pages for "Clock In" or "Complete Job" actions, ensuring they are always reachable.