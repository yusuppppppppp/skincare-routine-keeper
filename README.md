# Skincare Routine Keeper

A single-page tracker that keeps your skincare shelf tidy — catalog what you own, sort products into **Morning** and **Evening** routines, and pause anything you're resting without losing it.

Built with [Vite](https://vitejs.dev) + vanilla TypeScript. No backend, no login — everything persists in `localStorage`.

## Features

- Add products with name, brand, skin concern (with suggestions), and routine slot (Morning / Evening / Both)
- **Edit** any product — the form prefills, the card highlights, Escape or Cancel to back out
- **Search** across name, brand, and concern (press `/` to jump to the search field)
- **Sample shelf** loader so the empty state never feels dead on first visit
- Shelf grouped by Morning and Evening routines — a product used twice appears on both shelves
- Pause / resume any product with one tap; paused items move to their own section
- Two-step delete confirmation (tap again, or press Escape to cancel) — no accidental losses
- Toast feedback for every action, live-region announcements for screen readers
- Survives refresh: validated persistence in `localStorage`
- Soft neobrutalist design with light/dark theme, fully responsive

## Getting started

```bash
npm install
npm run dev      # start dev server
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## Structure

```
index.html          semantic page skeleton
src/
  main.ts           state + rendering + events
  types.ts          domain model & runtime guards
  utils/storage.ts  localStorage load/save with validation
  styles.css        design tokens, layout, components
```
