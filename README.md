# Hennobobstuto

A starter website built with React and Vite. It includes a responsive homepage, an interactive counter, and links to the React and Vite documentation.

## Requirements

Node.js 22.12+ or 24 LTS and npm.

## Run locally

```sh
npm ci
npm run dev
```

## Check and build

```sh
npm run lint
npm run build
npm run preview
```

The production output is in `dist/`. Edit `src/App.jsx` to change the homepage, `src/App.css` for its styles, and `src/index.css` for global styles. This starter does not need a database or API keys.

## Codex cloud workspace

Use the existing checkout at `/workspace/hennobobstuto`.

```sh
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

The workspace npm cache avoids writing to the restricted home directory.
