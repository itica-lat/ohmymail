# OhMyMail — Claude Context

## What this project is

OhMyMail is a single-page email template composer. Users write Markdown in a split-pane editor and see a live HTML email preview. All state lives in the browser (localStorage) — there is no backend, no database, no authentication.

## Project structure

```
src/
  App.tsx       # Entire application — one large component (~1400 lines)
  main.tsx      # React entry point
  index.css     # Global styles (custom scrollbar, base resets)
  App.css       # Minimal / effectively unused
```

Everything is in `App.tsx`. There are no sub-components or separate modules yet.

## Tech decisions to be aware of

- **React 19 with Compiler** — the Babel React Compiler plugin is enabled. Avoid patterns that break the compiler (mutating state directly, non-pure render functions).
- **Inline styles everywhere** — the UI is styled via `React.CSSProperties` objects, not Tailwind classes or CSS files. Tailwind is installed but barely used.
- **Bun** is the package manager (`bun.lock` is present). Use `bun` commands, not `npm` or `yarn`.
- **marked** converts Markdown to HTML. The preview is rendered as a raw HTML string in an iframe or `dangerouslySetInnerHTML`.
- **No router** — single view, no pages.
- **TypeScript strict** — `noUnusedLocals` and `noUnusedParameters` are on. Don't leave dead code.

## Key types

```ts
interface Template { id: string; name: string; content: string; createdAt: number }
interface BrandingConfig { companyName, logoUrl, primaryColor, accentColor, fontFamily, fontSize, headerBg, headerText, headerRadius, footerBg, footerText, footerRadius, bodyBg, bodyText, linkColor }
interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }
interface SlashCommandDef { name: string; description: string; icon: ReactNode; insert: string | (() => void) }
```

## localStorage keys

| Key | Contents |
|---|---|
| `mailforge_autosave` | Current Markdown content |
| `mailforge_title` | Email title string |
| `mailforge_templates` | JSON array of `Template` |
| `mailforge_branding` | JSON object of `BrandingConfig` |

## Commands

```bash
bun dev          # dev server at localhost:5173
bun run build    # tsc -b && vite build
bun run lint     # eslint .
bun preview      # preview production build
```
