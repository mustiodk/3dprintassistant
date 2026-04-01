# 3D Print Assistant

## Architecture

- **engine.js** = ALL business logic, data loading, profile resolution, warnings, export
- **app.js** = UI only — renders filters, results, tabs. NO business logic here.
- **data/** = JSON files for printers, materials, nozzles, rules
- **index.html** = HTML shell — interactive elements are JS-generated
- **style.css** = Dark/light theme, responsive layout

## Critical Rules

1. **Never merge engine.js and app.js.** engine.js is designed to become a standalone API. app.js only calls engine.js functions.
2. **Always stage ALL modified files before committing.** If a feature touches HTML structure or adds CSS classes, index.html and style.css MUST be staged too.
3. **PARAM_LABELS stay in English** — they match Bambu Studio / slicer UI, never translated.
4. **localStorage access must be wrapped in try-catch** — private browsing mode throws.

## Deployment

- Hosted on **Cloudflare Pages** — auto-deploys from `main` branch on GitHub
- No build step needed — pure static files
- Domain: **3dprintassistant.com**

## Local Development

```bash
npx serve -l 4200 .
```
