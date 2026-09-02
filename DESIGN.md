---
name: FertCalc Pro
description: Fertilizer blend calculator and agronomic planning tool
colors:
  emerald-accent: "#10b981"
  emerald-accent-hover: "#059669"
  emerald-accent-subtle: "rgba(16,185,129,0.12)"
  coal-ground: "#09090b"
  slate-surface: "#18181b"
  slate-raised: "#27272a"
  slate-elevated: "#3f3f46"
  text-bright: "#fafafa"
  text-secondary: "#a1a1aa"
  text-muted: "#71717a"
  border-soft: "rgba(255,255,255,0.08)"
  border-strong: "rgba(255,255,255,0.14)"
  signal-danger: "#ef4444"
  signal-warning: "#f59e0b"
  signal-info: "#3b82f6"
  nutrient-nitrogen: "#60a5fa"
  nutrient-phosphate: "#fb923c"
  nutrient-potash: "#a78bfa"
  nutrient-sulfur: "#34d399"
  nutrient-boron: "#a16207"
typography:
  body:
    fontFamily: "'Figtree', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Figtree', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.06em"
  display:
    fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace"
    fontSize: "clamp(1.5rem, 4vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.1
  title:
    fontFamily: "'Figtree', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
  xl: "12px"
spacing:
  xs: "0.25rem"
  sm: "0.375rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
components:
  button-primary:
    backgroundColor: "{colors.emerald-accent}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.emerald-accent-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-ghost-hover:
    backgroundColor: "{colors.slate-raised}"
    textColor: "{colors.text-bright}"
  card:
    backgroundColor: "{colors.slate-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.coal-ground}"
    textColor: "{colors.text-bright}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  input-focus:
    backgroundColor: "{colors.coal-ground}"
    textColor: "{colors.text-bright}"
  badge:
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    size: "1.75rem"
---

# Design System: FertCalc Pro

## Overview

**Creative North Star: "The Co-op Dashboard"**

FertCalc Pro is a modern operations board for agricultural business. It is data-dense, professional, and built to move fast at scale. The interface runs dark by default because retail counters are often dim and screens are viewed all day. Every surface exists to present numbers clearly and let the operator act on them without hunting.

The system favors density over whitespace, monospace for numeric data, and emerald as the single accent that signals "go" across every module. Controls are sturdy and reliable — they feel like they can take a beating, built for calloused hands and fast decisions. There is no decorative chrome; the data is the product.

Dual-theme support (dark default, light toggle) ensures outdoor field use on tablets remains readable. Nutrient colors (N=blue, P=orange, K=purple, S=green, B=amber) are industry conventions and never change between themes.

**Key Characteristics:**
- Dark-first, tonal layering with subtle shadows on interactive overlays
- Emerald accent used sparingly — primary actions and success states only
- Monospace numerals (JetBrains Mono) for all calculated values
- Figtree for all UI text — geometric, readable, and quietly distinctive
- Single-column sidebar + wide main panel on desktop; full-width stacked on mobile
- Nutrient colors are domain-fixed and carry meaning, not decoration

## Colors

The palette is coal and zinc with one living accent. Emerald signals action, confirmation, and the brand itself. Everything else recedes.

### Primary
- **Emerald Accent** (#10b981): Primary actions, active states, success feedback, brand identity. Hover deepens to #059669. Subtle tint (rgba 12% opacity) for checkbox backgrounds and focus rings.

### Neutral
- **Coal Ground** (#09090b): Page background — the darkest surface, establishing the depth floor.
- **Slate Surface** (#18181b): Card and panel backgrounds. One step above ground.
- **Slate Raised** (#27272a): Hover states, secondary backgrounds, collapsible headers.
- **Slate Elevated** (#3f3f46): Tertiary surface for disabled or nested elements.
- **Text Bright** (#fafafa): Primary text on dark backgrounds.
- **Text Secondary** (#a1a1aa): Supporting text, descriptions, inactive labels.
- **Text Muted** (#71717a): Timestamps, annotations, disabled text.
- **Border Soft** (rgba 8% white): Default card/input borders — barely visible separation.
- **Border Strong** (rgba 14% white): Hover borders, emphasized dividers.

### Signal
- **Danger Red** (#ef4444): Errors, delete actions, nutrient shortfall flags.
- **Warning Amber** (#f59e0b): Caution states, nutrient excess flags, per-batch highlights.
- **Info Blue** (#3b82f6): Informational toasts, secondary highlights.

### Nutrient (domain-fixed)
- **Nitrogen Blue** (#60a5fa), **Phosphate Orange** (#fb923c), **Potash Violet** (#a78bfa), **Sulfur Emerald** (#34d399), **Boron Amber** (#a16207). These are agronomic conventions. They do not change between themes and are never used decoratively outside nutrient context.

### Named Rules
**The One Accent Rule.** Emerald is the only chromatic accent in the neutral UI. Nutrient colors appear strictly within nutrient data contexts. If something needs emphasis and it is not a nutrient, it is emerald or it is weight/size — never a second accent color.

## Typography

**Body Font:** Figtree (with ui-sans-serif, system-ui fallback)
**Data Font:** JetBrains Mono (with SF Mono, Fira Code fallback)
**Label Font:** Figtree, uppercase, tracked

**Character:** Figtree provides geometric warmth without the ubiquity of Inter. JetBrains Mono carries every calculated number — rates, prices, totals, analyses — giving the dashboard its instrument-panel character. The pairing is functional: you read Figtree, you calculate with JetBrains Mono.

### Hierarchy
- **Display** (JetBrains Mono 600, clamp 1.5rem–2.5rem, lh 1.1): Target nutrient inputs, rate cards, cost hero. The largest numbers on screen.
- **Title** (Figtree 600, 1rem, lh 1.4): Section headings, card titles, page headers.
- **Body** (Figtree 400, 0.875rem, lh 1.5): Descriptions, form labels, table content. Max measure 65–75ch where prose appears.
- **Label** (Figtree 600, 0.6875rem, uppercase, ls 0.06em): Section sub-headers, field labels, unit annotations. Always muted color.
- **Caption** (Figtree 400, 0.75rem): Tooltips, analysis text, timestamps.

### Named Rules
**The Numbers-in-Mono Rule.** Every numeric value that is calculated, entered, or displayed as data uses JetBrains Mono. Figtree is for words. This split is absolute — mixing them blurs the line between label and value.

## Layout

The main calculator uses a 12-column grid: 3 columns for the sidebar (products, field info) and 9 for the main panel (targets, rates, cost). On screens below `lg` (1024px), the sidebar collapses into a toggleable section above the main content.

Spacing rhythm: 0.25rem (xs) → 0.375rem (sm) → 0.75rem (md) → 1rem (lg) → 1.25rem (xl). Cards use `lg` internal padding. Gaps between cards use `md` (0.75rem) to `lg` (1rem). The sidebar sticks to the top of the viewport and scrolls independently.

Breakpoints: 480px (mobile stacking), 640px (sm — type scale up), 1024px (lg — sidebar visible). Coarse-pointer media query enlarges all touch targets regardless of viewport width.

## Elevation & Depth

The system uses tonal layering as its primary depth mechanism — ground (#09090b) → surface (#18181b) → raised (#27272a) → elevated (#3f3f46). Each step is a subtle zinc shift, not a shadow.

Subtle shadows appear only on interactive overlays that demand attention above the page flow.

### Shadow Vocabulary
- **Overlay** (`0 8px 32px rgba(0,0,0,0.4)`): Print preview panel, modal dialogs. The heaviest shadow in the system.
- **Dropdown** (`0 4px 16px rgba(0,0,0,0.25)`): Toast notifications, draft banner, tools dropdown. Medium emphasis.
- **None**: Cards, inputs, buttons, badges. These rely on borders and tonal steps, never shadows.

### Named Rules
**The Flat-at-Rest Rule.** Surfaces are flat at rest. Shadows appear only on elements that float above the page (overlays, toasts, dropdowns). A card never has a shadow — its border and tonal step are sufficient.

## Shapes

Corners follow a tight radius scale: 4px for small controls (stepper buttons, checkboxes), 6px for standard components (buttons, inputs, badges), 10px for cards and containers, 12px for overlays and modals. No fully rounded elements except progress bars and dot indicators.

Borders are always 1px and use the soft border token (8% opacity). Hover states shift to strong border (14% opacity). No colored borders except nutrient shortfall/excess flags, which use danger red or warning amber.

Product badges are 28px squares with 6px radius, carrying 2-3 letter abbreviations in white on the product's assigned color.

## Components

### Buttons
Sturdy and reliable — solid fills, no outlines on primary, generous touch targets on coarse-pointer devices.

- **Shape:** Rounded rectangle (6px radius)
- **Primary:** Emerald background, white text, 0.5rem 1rem padding, 600 weight, 0.8125rem. Hover lifts 1px (translateY) and deepens to accent-hover.
- **Ghost:** Transparent background, secondary text color. Hover fills with raised surface and brightens text.
- **Secondary:** Raised background with soft border. Hover strengthens border.
- **Danger:** Danger red background, white text. Used only for destructive actions (delete blend, remove plan).
- **Touch:** All buttons gain min-height 2.75rem on coarse-pointer devices.

### Cards / Containers
- **Corner Style:** Rounded (10px radius)
- **Background:** Surface token (#18181b dark, #ffffff light)
- **Border:** 1px soft border
- **Shadow:** None — depth from tonal step only
- **Internal Padding:** 1rem (lg spacing)

### Inputs / Fields
- **Standard (.inp):** Ground background, soft border, 6px radius, 0.5rem 0.75rem padding. Focus: emerald border + 1px accent-subtle ring.
- **Large Numeric (.inp-xl):** Ground background, JetBrains Mono, centered, responsive font size (1.5rem → 2rem → 2.5rem). Used in stepper controls for targets and acres.
- **Price Input (.price-input):** Transparent background, bottom-border only, right-aligned, tabular-nums. Minimal footprint for sidebar product rows.
- **Read-only:** Muted text color, not-allowed cursor, no focus ring.

### Stepper Controls
- **Standard:** 1.5rem square, 4px radius, soft border. Houses +/- characters.
- **Large:** 2rem square, 6px radius. Used for target nutrients and field info.
- **Touch-enlarged:** 2.5rem / 2.75rem on coarse-pointer devices.
- **Wrap:** Flex row with 0.25rem gap. Input fills remaining space.

### Badges
- **Product badges:** 1.75rem square, 6px radius, product color background, white bold text (0.625rem). Shows 2-3 letter abbreviation.
- **Status badges:** Pill-shaped (rounded-full), category-colored background at low opacity, matching text color. Used for plan status, feature status.
- **Unit badge ($/TON):** Accent-subtle background, accent text, monospace. Informational only.

### Navigation
- **Sidebar:** Icon buttons in a vertical strip on desktop. Each is a rounded 6px square with ghost styling. Active state: emerald accent with white icon.
- **Mobile:** Hamburger menu expands to a card with stacked nav items. Each item is a full-width ghost button.
- **Mode toggle (Dry/Liquid):** Pair of bordered buttons. Active state: emerald fill with white text, transparent border.

### Toast Notifications
- **Shape:** 8px radius, 1px border, dropdown shadow
- **Info:** Surface background, strong border, primary text
- **Success:** Emerald-tinted background (12% opacity), emerald text, emerald border (25%)
- **Error:** Red-tinted background (12% opacity), danger text, red border (25%). Persists until dismissed with close button.
- **Position:** Fixed bottom-right, respects safe-area insets

### Collapsible Sections
- **Toggle:** Uppercase label, 0.75rem, raised background, soft border. Chevron rotates on expand.
- **Body:** No additional border — shares the toggle's border-radius on open state (toggle loses bottom radius).

## Do's and Don'ts

### Do:
- **Do** use JetBrains Mono for every numeric value — rates, prices, totals, percentages, nutrient amounts.
- **Do** use emerald exclusively for primary actions, success states, and brand identity. Resist adding a second accent.
- **Do** test every control at coarse-pointer size (min 44px touch target) and on mobile-width viewports.
- **Do** use the tonal step (ground → surface → raised → elevated) to indicate nesting depth. Cards on ground, nested elements on raised.
- **Do** preserve nutrient color assignments (N=blue, P=orange, K=purple, S=green, B=amber) in every context where nutrients appear.
- **Do** keep labels uppercase, tracked, muted, and small (0.6875rem). They recede behind the data they introduce.

### Don't:
- **Don't** add box-shadows to cards, inputs, or buttons. Shadows are reserved for overlays and floating elements only.
- **Don't** use nutrient colors outside of nutrient data context. Violet is for potassium values, not decorative headings.
- **Don't** mix Figtree and JetBrains Mono within the same data element. A price is mono; its label is Figtree.
- **Don't** use gradient text, glass effects, or decorative blur. The aesthetic is flat, tonal, and clean.
- **Don't** introduce a second accent color. If something needs emphasis, use emerald, weight, or size.
- **Don't** use rounded-full on buttons or inputs. The form language is squared (4-12px radius), never pill-shaped except status badges and progress bars.
