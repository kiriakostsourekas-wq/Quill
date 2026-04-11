# Quill

Quill is a Vite + React landing page for a social publishing product focused on "Voice DNA": helping creators write once, keep their voice consistent, and publish to multiple platforms.

## Stack

- React 18
- Vite
- Tailwind CSS
- shadcn/ui primitives

## Local Development

```bash
npm install --ignore-scripts
npm run dev
```

The app runs locally at the URL printed by Vite, usually `http://localhost:5173`.

If a plain `npm install` triggers an `esbuild` postinstall error on your local Node/npm setup, use the command above. The project builds correctly without running package install scripts.

## Build

```bash
npm run build
```

## Project Structure

- `src/pages/Landing.jsx`: page composition for the marketing site
- `src/components/landing/*`: custom landing page sections
- `src/components/ui/*`: reusable UI primitives
- `src/lib/*`: shared helpers and app-level utilities

## Notes

This repository was normalized from a Base44 export into a standard standalone Vite project so it can be developed and hosted like a normal GitHub repo.
