# FertCalc Pro

Precision fertilizer blending calculator for ag retailers and agronomists. Optimize nutrient rates, generate customer quotes, and manage blend sheets — all in one tool.

## Features

- **Blend Optimizer** — Set N-P-K-S-B nutrient targets and auto-calculate the cheapest product rates to meet them
- **Dry & Liquid Modes** — Switch between granular (lbs/acre) and liquid (gal/acre) with full unit conversion
- **Quote Generator** — Print-ready customer quotes with per-acre pricing and nutrient breakdown
- **Blend Sheet Generator** — Loading sequence, batch log, and tonnage summary for the plant floor
- **Cost Analysis** — Per-acre cost hero, cost-per-pound of each nutrient, and detailed breakdown table
- **Additive Support** — Nitrogen stabilizers, chemical additives, seed, and application cost tracking
- **Cloud Sync** — Company-wide blend storage via Supabase with role-based access
- **Multi-tenant** — Company-scoped products, pricing, and user management

### Tools

| Tool | Description |
|------|-------------|
| Crop Library | Nutrient recommendations by crop and yield goal |
| Fields | Field management with acreage and location |
| Soil Tests | Soil test records linked to fields |
| App Planner | Split application planning across the season |
| Inventory | Product inventory tracking |
| Spreader Cal | Spreader calibration calculator |
| Weather | Local weather and soil temperature guide |
| VRT Rx | Variable rate prescriptions |
| 4R Plan | Right Rate, Right Time, Right Place, Right Source planning |
| Grower Portal | Customer-facing view of nutrient plans |

## Tech Stack

- **Frontend** — Vanilla JavaScript (no framework), Vite, Tailwind CSS v4
- **Backend** — Supabase (Auth, Database, Row-Level Security)
- **Design System** — CSS custom properties, SVG icon sprite, dark/light mode
- **Deployment** — Vercel (auto-deploy from GitHub)

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with the required tables (profiles, companies, blends, etc.)

### Install

```bash
npm install
```

### Environment

Create a `.env` file with your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`.

### Build

```bash
npm run build
```

Output goes to `dist/`.

## Project Structure

```
src/
  main.js          # App entry, calculator logic, blend optimizer
  ui.js            # Toast, theme toggle, icon helper, error formatting
  router.js        # Hash-based SPA router
  supabase.js      # Supabase client and data operations
  style.css        # Design system (CSS custom properties + Tailwind)
  pages/
    login.js       # Auth (sign in, sign up, password reset)
    admin.js       # User and company management
    crops.js       # Crop nutrient library
    fields.js      # Field management
    soil-tests.js  # Soil test records
    planner.js     # Application planner
    inventory.js   # Product inventory
    spreader.js    # Spreader calibration
    weather.js     # Weather and soil temp
    nutrient-plan.js # 4R nutrient planning
    vrt.js         # Variable rate prescriptions
    grower-portal.js # Customer-facing portal
    features.js    # Feature flags (admin)
public/
  icons.svg        # SVG icon sprite (39 icons)
  logo.png         # App logo
```

## Design System

The UI uses a token-based design system with CSS custom properties:

- **Surfaces** — `--color-ground`, `--color-surface`, `--color-raised`, `--color-elevated`
- **Text** — `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`
- **Accent** — `--color-accent` (emerald)
- **Nutrients** — `--color-n` (blue), `--color-p` (orange), `--color-k` (violet), `--color-s` (green), `--color-b` (amber)

Dark mode is the default. Light mode activates via `html.light` class, swapping all tokens.

## Deployment

Connected to Vercel via GitHub. Pushes to `main` auto-deploy to [dryfertcalc.vercel.app](https://dryfertcalc.vercel.app).

## License

Proprietary. All rights reserved.
