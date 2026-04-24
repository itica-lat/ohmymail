<<<<<<< HEAD
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
=======
# CLAUDE.md

## Project

OhMyMail — a markdown-to-email editor. React 19 + TypeScript + Vite + Tailwind CSS 4.

Package manager: **Bun** (`bun.lock` is present; use `bun` for all install/run commands).
>>>>>>> 71e0477 (chore: add README, CLAUDE.md, and Husky conventional commits setup)

## Commands

```bash
<<<<<<< HEAD
bun dev          # dev server at localhost:5173
bun run build    # tsc -b && vite build
bun run lint     # eslint .
bun preview      # preview production build
=======
bun dev           # start dev server
bun run build     # tsc -b && vite build
bun run lint      # eslint
bun run preview   # preview production build
```

## Architecture

```
src/
├── App.tsx              # root component — layout, editor, preview, state
├── commands.tsx         # slash command definitions (built-in + custom tag commands)
├── types.ts             # shared TypeScript interfaces
├── constants.ts         # storage keys, font list, icon list, defaults
├── utils.ts             # storage helpers, download, HTML export, font loading
├── hooks.ts             # autosave, mobile detection, drag-resize, toasts, templates
├── config/
│   └── app.config.ts   # app name, github, DEFAULT_BRANDING, CUSTOM_TAG_COMMANDS
└── components/
    ├── ExportMenu.tsx
    ├── IconPickerModal.tsx
    ├── SettingsPanel.tsx
    ├── SlashPalette.tsx
    ├── TemplatesModal.tsx
    └── ToastList.tsx
```

## Key Conventions

- **All customization** (branding defaults, custom slash commands) lives in `src/config/app.config.ts` — keep business logic out of config.
- **localStorage keys** are defined in `constants.ts` (`STORAGE_KEYS`). Never hardcode keys elsewhere.
- **Email HTML export** is built in `utils.ts` (`buildEmailHtml`). The output must be self-contained (no external CSS links except Google Fonts).
- **`<lucide-icon name="..."/>`** is a custom tag replaced at render time; see `utils.ts` `replaceLucideIcons`.
- Tailwind 4 — use `@tailwindcss/vite` plugin; no `tailwind.config.js` required.
- No test suite currently. Prefer manual verification in the live preview.

## Commits

This project uses **Conventional Commits** enforced by Husky + commitlint.

Format: `type(scope): description`

Common types: `feat`, `fix`, `chore`, `refactor`, `style`, `docs`, `test`, `perf`

Examples:
```
feat(commands): add table slash command
fix(export): correct font-face injection for custom fonts
chore: upgrade marked to v19
docs: update README keyboard shortcuts
>>>>>>> 71e0477 (chore: add README, CLAUDE.md, and Husky conventional commits setup)
```
