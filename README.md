# MailForge

A professional email template composer with live preview, Markdown editing, and full branding customization. All data stays local — no backend required.

## Features

- **Split-pane editor** — Markdown on the left, rendered email preview on the right, with a draggable divider
- **Slash commands** — Type `/` to insert headings, buttons, dividers, badges, links, images, headers, footers, and more with fuzzy search
- **Branding panel** — Set company name, logo, colors, fonts (Google Fonts supported), and corner radii for header/footer/body
- **Template management** — Save, load, duplicate, rename, and delete named templates (stored in localStorage)
- **Export** — Download as self-contained HTML, raw Markdown, or PDF (browser print)
- **Auto-save** — Drafts persist automatically to localStorage

## Tech Stack

- React 19 + TypeScript
- Vite 8 with React Compiler
- Tailwind CSS v4
- `marked` for Markdown-to-HTML conversion
- `lucide-react` for icons
- Oxc-based linting (ESLint + oxlint)

## Getting Started

```bash
# Install dependencies (uses Bun)
bun install

# Start dev server
bun dev

# Build for production
bun run build

# Preview production build
bun preview
```

Dev server runs at `http://localhost:5173` by default.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+S` | Save as template |
| `Ctrl+Shift+E` | Export HTML |
| `Ctrl+P` | Export PDF (print dialog) |
| `Tab` | Insert 2-space indent in editor |

## Slash Commands

Type `/` in the editor to open the command palette. Available commands:

| Command | Inserts |
|---|---|
| `/h1`, `/h2`, `/h3` | Headings |
| `/button` | Call-to-action button |
| `/divider` | Horizontal rule |
| `/badge` | Inline badge/label |
| `/link` | Hyperlink |
| `/image` | Image block |
| `/gif` | Animated GIF |
| `/icon` | Inline icon (with picker) |
| `/header` | Email header block |
| `/footer` | Email footer block |
| `/branding` | Company branding block |
| `/font` | Font override |

## Storage

All data is persisted to `localStorage` under these keys:

| Key | Contents |
|---|---|
| `mailforge_autosave` | Current editor content |
| `mailforge_title` | Current email title |
| `mailforge_templates` | Saved templates (JSON array) |
| `mailforge_branding` | Branding configuration (JSON) |
