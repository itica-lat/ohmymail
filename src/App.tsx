import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { marked } from 'marked';
import {
  FolderOpen, Save, Download, Settings2, Plus, Trash2,
  Copy, ChevronDown, X, Check, AlertCircle, Printer, Eye, Code,
  GripVertical, Layers, Mail, Star,
  ExternalLink, Hash, Zap, Tag,
  Info, Pencil, FileCode, FileDown,
  Palette, Type, Minus, Image as ImageIcon, Link as LinkIcon,
  CornerDownLeft, AlignLeft
} from 'lucide-react';

// ============================================================
// Types & Interfaces
// ============================================================

interface Template {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface BrandingConfig {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  font: string;
  fontSize: 'small' | 'medium' | 'large';
  // custom font
  customFontUrl: string;
  customFontName: string;
  // header
  headerBg: string;
  headerText: string;
  headerRadius: number;
  // footer
  footerBg: string;
  footerText: string;
  footerRadius: number;
  // body
  bodyBg: string;
  bodyText: string;
  linkColor: string;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface SlashCommandDef {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  special?: 'icon-picker';
  insert: (branding: BrandingConfig) => string;
}

interface SlashCommandState {
  query: string;
  startIndex: number;
  x: number;
  y: number;
  selectedIndex: number;
}

// ============================================================
// Constants
// ============================================================

const AUTOSAVE_KEY = 'mailforge_autosave';
const TEMPLATES_KEY = 'mailforge_templates';
const BRANDING_KEY = 'mailforge_branding';
const TITLE_KEY = 'mailforge_title';

const DEFAULT_BRANDING: BrandingConfig = {
  companyName: 'Your Company',
  logoUrl: '',
  primaryColor: '#4988C4',
  font: 'Inter',
  fontSize: 'medium',
  customFontUrl: '',
  customFontName: '',
  headerBg: '#0F2854',
  headerText: '#BDE8F5',
  headerRadius: 8,
  footerBg: '#0F2854',
  footerText: '#BDE8F5',
  footerRadius: 8,
  bodyBg: '#ffffff',
  bodyText: '#1a1a2e',
  linkColor: '#4988C4',
};

const GOOGLE_FONTS = [
  'Inter', 'Lato', 'Poppins', 'Raleway', 'Merriweather',
  'Playfair+Display', 'Source+Sans+3',
];

const FONT_LABELS: Record<string, string> = {
  'Inter': 'Inter',
  'Lato': 'Lato',
  'Poppins': 'Poppins',
  'Raleway': 'Raleway',
  'Merriweather': 'Merriweather',
  'Playfair+Display': 'Playfair Display',
  'Source+Sans+3': 'Source Sans Pro',
};

const FONT_SIZE_MAP: Record<string, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
};

// SVG strings for <lucide-icon> replacement in preview HTML
const ICON_SVGS: Record<string, string> = {
  mail: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  heart: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  home: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  user: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  bell: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  search: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  'arrow-right': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  link: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  hash: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>`,
  zap: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  globe: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  phone: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3-8.63A2 2 0 0 1 3.92 3h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`,
  clock: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><path d="M20 6 9 17l-5-5"/></svg>`,
  tag: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.578a2.426 2.426 0 0 0 0-3.42z"/></svg>`,
  image: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin:0 2px"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
};

const ICON_PICKER_ITEMS = [
  { name: 'mail', label: 'Mail' }, { name: 'star', label: 'Star' },
  { name: 'heart', label: 'Heart' }, { name: 'home', label: 'Home' },
  { name: 'user', label: 'User' }, { name: 'bell', label: 'Bell' },
  { name: 'search', label: 'Search' }, { name: 'arrow-right', label: 'Arrow' },
  { name: 'link', label: 'Link' }, { name: 'hash', label: 'Hash' },
  { name: 'zap', label: 'Zap' }, { name: 'tag', label: 'Tag' },
  { name: 'globe', label: 'Globe' }, { name: 'phone', label: 'Phone' },
  { name: 'calendar', label: 'Calendar' }, { name: 'clock', label: 'Clock' },
  { name: 'check', label: 'Check' }, { name: 'image', label: 'Image' },
  { name: 'info', label: 'Info' }, { name: 'zap', label: 'Flash' },
];

const DEFAULT_CONTENT = `# Welcome to MailForge ✉️

> **Professional email composer** by Eternum — an Itica Team

---

Write your email content here using **Markdown**.

## Key Features

- Split-pane editor with **live preview**
- Type \`/\` for slash commands (headings, buttons, badges…)
- Export to **HTML**, **Markdown**, or **PDF**
- Template library saved in your browser
- Fully customizable branding & fonts

## Getting Started

Type \`/header\` to insert a branded header, or \`/button\` to add a CTA.

[Visit itica-lat on GitHub](https://github.com/itica-lat)
`;

// ============================================================
// Utilities
// ============================================================

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getFromStorage<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? (JSON.parse(val) as T) : fallback;
  } catch {
    return fallback;
  }
}

function setToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or private browsing
  }
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getCaretCoordinates(el: HTMLTextAreaElement, pos: number): { top: number; left: number; height: number } {
  const div = document.createElement('div');
  const computed = window.getComputedStyle(el);
  const styleProps = [
    'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
    'lineHeight', 'fontFamily', 'textAlign', 'textTransform', 'textIndent',
    'textDecoration', 'letterSpacing', 'wordSpacing', 'tabSize',
  ];
  Object.assign(div.style, {
    position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap',
    wordWrap: 'break-word', overflow: 'hidden',
  });
  styleProps.forEach(p => {
    (div.style as unknown as Record<string, string>)[p] = computed.getPropertyValue(p);
  });
  document.body.appendChild(div);
  div.textContent = el.value.substring(0, pos);
  const span = document.createElement('span');
  span.textContent = el.value.substring(pos) || '.';
  div.appendChild(span);
  const result = {
    top: span.offsetTop + parseInt(computed.borderTopWidth),
    left: span.offsetLeft + parseInt(computed.borderLeftWidth),
    height: parseInt(computed.lineHeight) || 22,
  };
  document.body.removeChild(div);
  return result;
}

function processPreviewHtml(html: string, branding: BrandingConfig): string {
  return html
    .replace(/<lucide-icon\s+name="([^"]+)"\s*\/?>/gi, (_, name: string) => {
      const svg = ICON_SVGS[name.toLowerCase()];
      return svg ?? `<span style="font-size:11px;opacity:0.5;">[icon:${name}]</span>`;
    })
    .replace(/LOGO_URL/g, branding.logoUrl || 'https://placehold.co/120x40/0F2854/BDE8F5?text=Logo')
    .replace(/COMPANY NAME/g, branding.companyName || 'Your Company');
}

function extractFontNameFromUrl(url: string): string {
  const m = url.match(/family=([^:&]+)/);
  if (!m) return '';
  return decodeURIComponent(m[1].replace(/\+/g, ' '));
}

function getActiveFontUrl(b: BrandingConfig): string {
  return b.customFontUrl.trim() || `https://fonts.googleapis.com/css2?family=${b.font}:wght@400;600;700&display=swap`;
}

function getActiveFontFamily(b: BrandingConfig): string {
  return b.customFontName.trim() || FONT_LABELS[b.font] || b.font;
}

function buildExportHtml(content: string, branding: BrandingConfig, title: string): string {
  const raw = marked.parse(content);
  const body = processPreviewHtml(typeof raw === 'string' ? raw : String(raw), branding);
  const fontFamily = getActiveFontFamily(branding);
  const fontUrl = getActiveFontUrl(branding);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<link href="${fontUrl}" rel="stylesheet">
<style>
  :root { --brand-mid:${branding.primaryColor}; --link:${branding.linkColor}; }
  body { margin:0; padding:24px 16px; background:#f0f4f8; font-family:'${fontFamily}',sans-serif; font-size:${FONT_SIZE_MAP[branding.fontSize]}; color:${branding.bodyText}; }
  .frame { max-width:600px; margin:0 auto; background:${branding.bodyBg}; border-radius:10px; box-shadow:0 4px 24px rgba(0,0,0,.12); overflow:hidden; }
  .body { padding:32px; line-height:1.7; background:${branding.bodyBg}; color:${branding.bodyText}; }
  h1 { font-size:26px; margin:0 0 16px; }
  h2 { font-size:20px; margin:24px 0 12px; }
  h3 { font-size:16px; margin:20px 0 8px; }
  p { margin:0 0 16px; }
  a { color:var(--link); }
  hr { border:none; border-top:1px solid rgba(0,0,0,0.1); margin:24px 0; }
  img { max-width:100%; height:auto; }
  blockquote { border-left:4px solid var(--brand-mid); margin:16px 0; padding:12px 16px; background:rgba(73,136,196,0.07); border-radius:0 6px 6px 0; }
  code { background:rgba(0,0,0,0.06); padding:2px 6px; border-radius:3px; font-size:13px; font-family:monospace; }
  pre { background:#1a1a2e; color:#c8dff5; padding:16px; border-radius:8px; overflow-x:auto; }
  pre code { background:none; color:inherit; padding:0; }
  ul,ol { margin:0 0 16px; padding-left:24px; }
  li { margin-bottom:6px; }
  table { border-collapse:collapse; width:100%; margin-bottom:16px; }
  th,td { border:1px solid rgba(0,0,0,0.1); padding:8px 12px; }
  th { background:rgba(0,0,0,0.04); font-weight:600; }
  .watermark { padding:12px; text-align:center; font-size:11px; color:#aab8c8; border-top:1px solid rgba(0,0,0,0.08); background:rgba(0,0,0,0.02); }
</style>
</head>
<body>
<div class="frame">
  <div class="body">${body}</div>
  <div class="watermark">Built with MailForge by Eternum · <a href="https://github.com/itica-lat" style="color:#aab8c8;">itica-lat</a> · Apache 2.0</div>
</div>
</body>
</html>`;
}

// ============================================================
// Slash commands factory
// ============================================================

function buildSlashCommands(b: BrandingConfig): SlashCommandDef[] {
  const logo = b.logoUrl || 'https://placehold.co/120x40/0F2854/BDE8F5?text=Logo';
  const co = b.companyName || 'Your Company';
  const year = new Date().getFullYear();
  return [
    { id: 'h1', label: 'Heading 1', description: 'Large section heading', icon: <Hash size={14} />, insert: () => '# Heading 1' },
    { id: 'h2', label: 'Heading 2', description: 'Medium section heading', icon: <Hash size={14} />, insert: () => '## Heading 2' },
    { id: 'h3', label: 'Heading 3', description: 'Small section heading', icon: <Hash size={14} />, insert: () => '### Heading 3' },
    { id: 'divider', label: 'Divider', description: 'Horizontal rule', icon: <Minus size={14} />, insert: () => '---' },
    { id: 'badge', label: 'Badge', description: 'Colored label badge', icon: <Tag size={14} />, insert: () => `<span class="badge" style="background:${b.primaryColor};color:#fff;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;display:inline-block;">Label</span>` },
    { id: 'link', label: 'Link', description: 'Hyperlink', icon: <LinkIcon size={14} />, insert: () => '[Link Text](https://url.com)' },
    { id: 'gif', label: 'GIF', description: 'Animated GIF image', icon: <ImageIcon size={14} />, insert: () => '![alt text](https://media.giphy.com/media/REPLACE_ID/giphy.gif)' },
    { id: 'icon', label: 'Icon', description: 'Insert inline icon', icon: <Star size={14} />, special: 'icon-picker', insert: () => '<lucide-icon name="star" />' },
    {
      id: 'header', label: 'Email Header', description: 'Branded header block', icon: <AlignLeft size={14} />,
      insert: () => {
        const r = b.headerRadius;
        const radii = `${r}px ${r}px 0 0`;
        return `<div class="email-header" style="background:${b.headerBg};padding:24px;text-align:center;border-radius:${radii};">\n  <img src="${logo}" alt="Logo" style="height:40px;margin-bottom:8px;" />\n  <h1 style="color:${b.headerText};font-size:22px;margin:0;">${co}</h1>\n</div>`;
      },
    },
    {
      id: 'footer', label: 'Email Footer', description: 'Branded footer block', icon: <AlignLeft size={14} />,
      insert: () => {
        const r = b.footerRadius;
        const radii = `0 0 ${r}px ${r}px`;
        return `<div class="email-footer" style="background:${b.footerBg};padding:16px;text-align:center;font-size:12px;color:${b.footerText};border-radius:${radii};margin-top:24px;">\n  © ${year} ${co} · Unsubscribe · Privacy Policy\n  <br/><span style="opacity:0.5;">Built with MailForge by Eternum · Apache 2.0</span>\n</div>`;
      },
    },
    { id: 'button', label: 'CTA Button', description: 'Call-to-action button', icon: <Zap size={14} />, insert: () => `<a href="#" style="display:inline-block;background:${b.primaryColor};color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;margin:16px 0;">Click Here</a>` },
    { id: 'font', label: 'Font Import', description: 'Google Font style block', icon: <Type size={14} />, insert: () => `<style>@import url('https://fonts.googleapis.com/css2?family=${b.font}:wght@400;600;700&display=swap');</style>` },
    {
      id: 'branding', label: 'Branding Block', description: 'Logo + company name', icon: <Palette size={14} />,
      insert: () => `<div style="display:flex;align-items:center;gap:12px;padding:16px 0;">\n  <img src="${logo}" alt="Logo" style="height:40px;border-radius:4px;" />\n  <span style="font-size:20px;font-weight:700;color:#0F2854;">${co}</span>\n</div>`,
    },
  ];
}

function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

// ============================================================
// Sub-components
// ============================================================

function ToastList({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => onDismiss(t.id)} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          borderRadius: 8, pointerEvents: 'auto', cursor: 'pointer',
          background: t.type === 'success' ? '#0f2d1e' : t.type === 'error' ? '#2d0f0f' : '#0f1e2d',
          border: `1px solid ${t.type === 'success' ? '#1f6b42' : t.type === 'error' ? '#6b1f1f' : '#1f426b'}`,
          color: t.type === 'success' ? '#5de09a' : t.type === 'error' ? '#e05d5d' : '#5db5e0',
          fontSize: 13, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          animation: 'mfSlideIn 0.2s ease',
        }}>
          {t.type === 'success' ? <Check size={14} /> : t.type === 'error' ? <AlertCircle size={14} /> : <Info size={14} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

function SlashPalette({ commands, state, onSelect, onClose }: {
  commands: SlashCommandDef[];
  state: SlashCommandState;
  onSelect: (cmd: SlashCommandDef) => void;
  onClose: () => void;
}) {
  void onClose;
  const filtered = commands.filter(c => fuzzyMatch(state.query, `${c.label} ${c.description}`)).slice(0, 8);

  return (
    <div style={{
      position: 'fixed', left: Math.min(state.x, window.innerWidth - 296), top: Math.min(state.y + 6, window.innerHeight - 360),
      zIndex: 8800, background: '#14294a', border: '1px solid #2a4a6a', borderRadius: 10,
      boxShadow: '0 12px 36px rgba(0,0,0,0.6)', width: 288, overflow: 'hidden',
    }}>
      <div style={{ padding: '5px 12px', borderBottom: '1px solid #1e3a5a', fontSize: 11, color: '#5a88aa', fontFamily: 'monospace', display: 'flex', justifyContent: 'space-between' }}>
        <span>/{state.query || '…'}</span>
        <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {filtered.length === 0
          ? <div style={{ padding: '14px', color: '#5a88aa', fontSize: 13 }}>No commands match "{state.query}"</div>
          : filtered.map((cmd, i) => (
            <div key={cmd.id} onClick={() => onSelect(cmd)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer',
                background: i === state.selectedIndex ? 'rgba(73,136,196,0.18)' : 'transparent',
                borderLeft: `2px solid ${i === state.selectedIndex ? '#4988C4' : 'transparent'}`,
              }}
              onMouseEnter={e => { if (i !== state.selectedIndex) e.currentTarget.style.background = 'rgba(73,136,196,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = i === state.selectedIndex ? 'rgba(73,136,196,0.18)' : 'transparent'; }}
            >
              <span style={{ color: '#4988C4', flexShrink: 0 }}>{cmd.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#ddeeff' }}>{cmd.label}</div>
                <div style={{ fontSize: 11, color: '#6a99bb', marginTop: 1 }}>{cmd.description}</div>
              </div>
              {i === state.selectedIndex && <CornerDownLeft size={11} style={{ color: '#4988C4', flexShrink: 0 }} />}
            </div>
          ))
        }
      </div>
      <div style={{ padding: '4px 12px', borderTop: '1px solid #1e3a5a', fontSize: 10, color: '#3a5a7a', display: 'flex', gap: 10 }}>
        <span>↑↓ nav</span><span>↵ select</span><span>Esc close</span>
      </div>
    </div>
  );
}

function IconPickerModal({ onSelect, onClose }: { onSelect: (name: string) => void; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#12253e', border: '1px solid #2a4a6a', borderRadius: 12, padding: 22, width: 320 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ color: '#BDE8F5', fontWeight: 700, fontSize: 15 }}>Choose Icon</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6a99bb', cursor: 'pointer', padding: 4, borderRadius: 4 }}><X size={16} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
          {ICON_PICKER_ITEMS.map((item, idx) => (
            <button key={`${item.name}-${idx}`} onClick={() => onSelect(item.name)} style={{
              background: 'rgba(73,136,196,0.08)', border: '1px solid rgba(73,136,196,0.18)',
              borderRadius: 8, padding: '10px 4px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              transition: 'background 0.1s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.08)')}
              title={item.label}
            >
              <span style={{ color: '#BDE8F5' }} dangerouslySetInnerHTML={{ __html: ICON_SVGS[item.name] ?? '' }} />
              <span style={{ fontSize: 9, color: '#6a99bb', textAlign: 'center', lineHeight: 1.2 }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplatesModal({ templates, onLoad, onSave, onDelete, onDuplicate, onRename, onClose }: {
  templates: Template[];
  onLoad: (t: Template) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (t: Template) => void;
  onRename: (id: string, name: string) => void;
  onClose: () => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0e1f3a', border: '1px solid #2a4a6a', borderRadius: 12, width: 500, maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #1e3a5a' }}>
          <div>
            <div style={{ color: '#BDE8F5', fontWeight: 700, fontSize: 16 }}>Templates</div>
            <div style={{ color: '#6a99bb', fontSize: 12, marginTop: 2 }}>{templates.length} saved</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#1C4D8D', border: 'none', borderRadius: 7, color: '#BDE8F5', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={13} /> Save Current
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6a99bb', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {templates.length === 0 ? (
            <div style={{ color: '#6a99bb', textAlign: 'center', padding: '48px 24px' }}>
              <Layers size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.35 }} />
              <div style={{ fontWeight: 600, fontSize: 14 }}>No templates yet</div>
              <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>Save your first one using the button above.</div>
            </div>
          ) : templates.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(73,136,196,0.18)', marginBottom: 8, background: 'rgba(73,136,196,0.04)' }}>
              {renamingId === t.id ? (
                <input value={renameVal} onChange={e => setRenameVal(e.target.value)} autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') { onRename(t.id, renameVal); setRenamingId(null); }
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  style={{ flex: 1, background: 'rgba(73,136,196,0.12)', border: '1px solid #4988C4', borderRadius: 5, padding: '4px 8px', color: '#ddeeff', fontSize: 13, outline: 'none' }}
                />
              ) : (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#ddeeff', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                  <div style={{ color: '#6a99bb', fontSize: 11, marginTop: 2 }}>{new Date(t.updatedAt).toLocaleDateString()}</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <button onClick={() => onLoad(t)} style={{ padding: '4px 10px', background: '#1C4D8D', border: 'none', borderRadius: 5, color: '#BDE8F5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Load</button>
                <button onClick={() => { setRenamingId(t.id); setRenameVal(t.name); }} title="Rename" style={{ background: 'none', border: 'none', color: '#6a99bb', cursor: 'pointer', padding: '4px 6px', borderRadius: 4 }}><Pencil size={13} /></button>
                <button onClick={() => onDuplicate(t)} title="Duplicate" style={{ background: 'none', border: 'none', color: '#6a99bb', cursor: 'pointer', padding: '4px 6px', borderRadius: 4 }}><Copy size={13} /></button>
                <button onClick={() => onDelete(t.id)} title="Delete" style={{ background: 'none', border: 'none', color: '#c46a6a', cursor: 'pointer', padding: '4px 6px', borderRadius: 4 }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ branding, onChange, onClose, visible }: {
  branding: BrandingConfig;
  onChange: (b: BrandingConfig) => void;
  onClose: () => void;
  visible: boolean;
}) {
  const [activeSection, setActiveSection] = useState<'identity' | 'header' | 'footer' | 'body'>('identity');

  const inputS: React.CSSProperties = {
    width: '100%', background: 'rgba(73,136,196,0.1)', border: '1px solid rgba(73,136,196,0.22)',
    borderRadius: 7, padding: '7px 10px', color: '#ddeeff', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  };

  const field = (text: string, node: React.ReactNode) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ color: '#5a88aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 5 }}>{text}</div>
      {node}
    </div>
  );

  const colorRow = (label: string, key: keyof BrandingConfig) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: '#5a88aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 5 }}>{label}</div>
      <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
        <input type="color" value={branding[key] as string}
          onChange={e => onChange({ ...branding, [key]: e.target.value })}
          style={{ width: 36, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 2, background: 'transparent', flexShrink: 0 }} />
        <input value={branding[key] as string}
          onChange={e => onChange({ ...branding, [key]: e.target.value })}
          style={{ ...inputS, fontFamily: 'monospace', flex: 1 }} placeholder="#000000" />
      </div>
    </div>
  );

  const radiusRow = (label: string, key: 'headerRadius' | 'footerRadius', previewBg: string) => {
    const val = branding[key];
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#5a88aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>{label}</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {[0, 4, 12, 24].map(r => (
            <button key={r} onClick={() => onChange({ ...branding, [key]: r })} style={{
              flex: 1, padding: '5px 0', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: val === r ? '#1C4D8D' : 'rgba(73,136,196,0.08)',
              color: val === r ? '#BDE8F5' : '#6a99bb',
            }}>{r === 0 ? 'None' : r === 4 ? 'Slight' : r === 12 ? 'Mod' : 'Round'}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="range" min={0} max={32} value={val}
            onChange={e => onChange({ ...branding, [key]: Number(e.target.value) })}
            style={{ flex: 1, accentColor: '#4988C4' }} />
          <span style={{ color: '#ddeeff', fontSize: 12, fontFamily: 'monospace', minWidth: 30, textAlign: 'right' }}>{val}px</span>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
          <div style={{ flex: 1, height: 20, background: previewBg, borderRadius: `${val}px ${val}px 0 0`, transition: 'border-radius 0.15s' }} />
          <div style={{ flex: 1, height: 20, background: previewBg, borderRadius: `0 0 ${val}px ${val}px`, transition: 'border-radius 0.15s' }} />
        </div>
      </div>
    );
  };

  const tabs: { id: typeof activeSection; label: string }[] = [
    { id: 'identity', label: 'Identity' },
    { id: 'header', label: 'Header' },
    { id: 'footer', label: 'Footer' },
    { id: 'body', label: 'Body' },
  ];

  return (
    <div style={{
      position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 6000, width: 340,
      background: '#0d1f3a', borderLeft: '1px solid #2a4a6a',
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #1e3a5a', flexShrink: 0 }}>
        <span style={{ color: '#BDE8F5', fontWeight: 700, fontSize: 14 }}>Branding & Settings</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6a99bb', cursor: 'pointer', borderRadius: 5, padding: 4 }}><X size={16} /></button>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e3a5a', flexShrink: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveSection(t.id)} style={{
            flex: 1, padding: '9px 4px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: 'transparent',
            color: activeSection === t.id ? '#BDE8F5' : '#4a7a9a',
            borderBottom: `2px solid ${activeSection === t.id ? '#4988C4' : 'transparent'}`,
            transition: 'color 0.15s, border-color 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>

        {/* ── IDENTITY ── */}
        {activeSection === 'identity' && <>
          {field('Company Name', <input value={branding.companyName} onChange={e => onChange({ ...branding, companyName: e.target.value })} style={inputS} placeholder="Acme Corp" />)}
          {field('Logo URL', <input value={branding.logoUrl} onChange={e => onChange({ ...branding, logoUrl: e.target.value })} style={inputS} placeholder="https://example.com/logo.png" />)}
          {colorRow('Accent / Primary Color', 'primaryColor')}

          <div style={{ height: 1, background: '#1e3a5a', margin: '16px 0' }} />

          {field('Preset Font',
            <select value={branding.font} onChange={e => onChange({ ...branding, font: e.target.value })}
              style={{ ...inputS, cursor: 'pointer' }}>
              {GOOGLE_FONTS.map(f => <option key={f} value={f}>{FONT_LABELS[f]}</option>)}
            </select>
          )}
          {field('Custom Google Font URL',
            <>
              <input value={branding.customFontUrl}
                onChange={e => {
                  const url = e.target.value;
                  const name = extractFontNameFromUrl(url);
                  onChange({ ...branding, customFontUrl: url, customFontName: name });
                }}
                style={inputS} placeholder="https://fonts.googleapis.com/css2?family=..." />
              {branding.customFontName && (
                <div style={{ marginTop: 5, fontSize: 11, color: '#4d9a6e' }}>
                  ✓ Detected: {branding.customFontName}
                </div>
              )}
              {branding.customFontUrl && !branding.customFontName && (
                <div style={{ marginTop: 5, fontSize: 11, color: '#d4904a' }}>
                  Could not detect font name — enter it below
                </div>
              )}
            </>
          )}
          {field('Custom Font Name (override)',
            <input value={branding.customFontName}
              onChange={e => onChange({ ...branding, customFontName: e.target.value })}
              style={inputS} placeholder="e.g. Roboto Condensed" />
          )}

          <div style={{ height: 1, background: '#1e3a5a', margin: '16px 0' }} />

          {field('Font Size',
            <div style={{ display: 'flex', gap: 6 }}>
              {(['small', 'medium', 'large'] as const).map(s => (
                <button key={s} onClick={() => onChange({ ...branding, fontSize: s })} style={{
                  flex: 1, padding: '7px 0', border: 'none', borderRadius: 6, cursor: 'pointer',
                  background: branding.fontSize === s ? '#1C4D8D' : 'rgba(73,136,196,0.08)',
                  color: branding.fontSize === s ? '#BDE8F5' : '#6a99bb',
                  fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                }}>{s}</button>
              ))}
            </div>
          )}

          {/* Preview swatch */}
          <div style={{ marginTop: 16, padding: 12, background: 'rgba(73,136,196,0.07)', borderRadius: 8, border: '1px solid rgba(73,136,196,0.18)' }}>
            <div style={{ color: '#5a88aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Preview</div>
            <div style={{ background: branding.primaryColor, color: '#fff', padding: '7px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textAlign: 'center', marginBottom: 6 }}>
              {branding.companyName || 'Your Company'}
            </div>
            <div style={{ fontSize: 11, color: '#4a7890' }}>
              {getActiveFontFamily(branding)} · {branding.fontSize} · {FONT_SIZE_MAP[branding.fontSize]}
            </div>
          </div>
        </>}

        {/* ── HEADER ── */}
        {activeSection === 'header' && <>
          {colorRow('Background Color', 'headerBg')}
          {colorRow('Text Color', 'headerText')}
          {radiusRow('Corner Radius', 'headerRadius', branding.headerBg)}
          <div style={{ marginTop: 12, borderRadius: `${branding.headerRadius}px ${branding.headerRadius}px 0 0`, background: branding.headerBg, padding: '16px', textAlign: 'center', transition: 'all 0.15s' }}>
            <div style={{ color: branding.headerText, fontSize: 14, fontWeight: 700 }}>{branding.companyName || 'Your Company'}</div>
            <div style={{ color: branding.headerText, fontSize: 11, opacity: 0.6, marginTop: 2 }}>Header preview</div>
          </div>
        </>}

        {/* ── FOOTER ── */}
        {activeSection === 'footer' && <>
          {colorRow('Background Color', 'footerBg')}
          {colorRow('Text Color', 'footerText')}
          {radiusRow('Corner Radius', 'footerRadius', branding.footerBg)}
          <div style={{ marginTop: 12, borderRadius: `0 0 ${branding.footerRadius}px ${branding.footerRadius}px`, background: branding.footerBg, padding: '12px 16px', textAlign: 'center', transition: 'all 0.15s' }}>
            <div style={{ color: branding.footerText, fontSize: 12 }}>© {new Date().getFullYear()} {branding.companyName || 'Your Company'}</div>
            <div style={{ color: branding.footerText, fontSize: 10, opacity: 0.5, marginTop: 3 }}>Built with MailForge by Eternum</div>
          </div>
        </>}

        {/* ── BODY ── */}
        {activeSection === 'body' && <>
          {colorRow('Background Color', 'bodyBg')}
          {colorRow('Text Color', 'bodyText')}
          {colorRow('Link Color', 'linkColor')}
          <div style={{ marginTop: 12, background: branding.bodyBg, borderRadius: 8, padding: '16px', border: '1px solid rgba(73,136,196,0.18)', transition: 'all 0.15s' }}>
            <div style={{ color: branding.bodyText, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Email body preview</div>
            <div style={{ color: branding.bodyText, fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>
              This is a paragraph of body text. It shows your <a href="#" style={{ color: branding.linkColor, textDecoration: 'underline' }} onClick={e => e.preventDefault()}>link color</a> inline.
            </div>
            <div style={{ fontSize: 12, color: branding.bodyText, opacity: 0.6 }}>
              Font size: {FONT_SIZE_MAP[branding.fontSize]}
            </div>
          </div>
        </>}

      </div>
    </div>
  );
}

function ExportMenu({ onHtml, onMd, onPdf, onClose }: { onHtml: () => void; onMd: () => void; onPdf: () => void; onClose: () => void }) {
  const row = (icon: React.ReactNode, label: string, hint: string, fn: () => void) => (
    <button onClick={() => { fn(); onClose(); }} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px',
      background: 'transparent', border: 'none', color: '#ddeeff', cursor: 'pointer', textAlign: 'left',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.14)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ color: '#4988C4' }}>{icon}</span>
      <div><div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div><div style={{ fontSize: 11, color: '#6a99bb' }}>{hint}</div></div>
    </button>
  );
  return (
    <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#14294a', border: '1px solid #2a4a6a', borderRadius: 9, boxShadow: '0 8px 28px rgba(0,0,0,0.5)', width: 220, zIndex: 5000, overflow: 'hidden' }}>
      {row(<FileCode size={14} />, 'Export HTML', 'Ctrl+Shift+E', onHtml)}
      {row(<FileDown size={14} />, 'Export Markdown', 'Raw .md file', onMd)}
      {row(<Printer size={14} />, 'Export PDF', 'Ctrl+P', onPdf)}
    </div>
  );
}

// ============================================================
// Main MailForge component
// ============================================================

export default function MailForge() {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Untitled Email');
  const [editingTitle, setEditingTitle] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [paneWidth, setPaneWidth] = useState(50);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [templateDropdown, setTemplateDropdown] = useState(false);
  const [slashState, setSlashState] = useState<SlashCommandState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [savedAgo, setSavedAgo] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedAt = useRef(Date.now());
  const isDragging = useRef(false);
  const dragOrigin = useRef({ x: 0, width: 50 });
  const pendingIconInsert = useRef<{ startIndex: number } | null>(null);
  const manualTitle = useRef(false);

  const slashCommands = useMemo(() => buildSlashCommands(branding), [branding]);

  const previewHtml = useMemo(() => {
    const raw = marked.parse(content);
    const html = typeof raw === 'string' ? raw : String(raw);
    return processPreviewHtml(html, branding);
  }, [content, branding]);

  const wordCount = useMemo(() => content.trim() ? content.trim().split(/\s+/).length : 0, [content]);

  // ── Auto-title from first # heading ───────────────────────
  useEffect(() => {
    if (manualTitle.current) return;
    const match = content.match(/^#\s+(.+)$/m);
    if (match) setTitle(match[1].trim());
  }, [content]);

  // ── Init from localStorage ────────────────────────────────
  useEffect(() => {
    const saved = getFromStorage<string | null>(AUTOSAVE_KEY, null);
    setContent(saved ?? DEFAULT_CONTENT);
    setTitle(getFromStorage(TITLE_KEY, 'Untitled Email'));
    setTemplates(getFromStorage<Template[]>(TEMPLATES_KEY, []));
    setBranding({ ...DEFAULT_BRANDING, ...getFromStorage<Partial<BrandingConfig>>(BRANDING_KEY, {}) });
    if (saved) addToast('Draft restored', 'info');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Google Fonts injection ─────────────────────────────────
  useEffect(() => {
    const fonts = [
      { id: 'mf-ui-font', href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap' },
      { id: 'mf-editor-font', href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap' },
    ];
    fonts.forEach(({ id, href }) => {
      if (!document.getElementById(id)) {
        const l = document.createElement('link');
        l.id = id; l.rel = 'stylesheet'; l.href = href;
        document.head.appendChild(l);
      }
    });
  }, []);

  useEffect(() => {
    const id = 'mf-preview-font';
    document.getElementById(id)?.remove();
    const l = document.createElement('link');
    l.id = id; l.rel = 'stylesheet';
    l.href = getActiveFontUrl(branding);
    document.head.appendChild(l);
  }, [branding.font, branding.customFontUrl]);

  // ── Autosave ──────────────────────────────────────────────
  useEffect(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setSaveStatus('unsaved');
    autosaveTimer.current = setTimeout(() => {
      setToStorage(AUTOSAVE_KEY, content);
      setToStorage(TITLE_KEY, title);
      savedAt.current = Date.now();
      setSaveStatus('saved');
      setSavedAgo(0);
    }, 1000);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [content, title]);

  // ── Saved-ago ticker ──────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      if (saveStatus === 'saved') setSavedAgo(Math.floor((Date.now() - savedAt.current) / 1000));
    }, 5000);
    return () => clearInterval(iv);
  }, [saveStatus]);

  // ── Persist branding ──────────────────────────────────────
  useEffect(() => { setToStorage(BRANDING_KEY, branding); }, [branding]);

  // ── Mobile check ──────────────────────────────────────────
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    fn(); window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 's') { e.preventDefault(); handleSaveAsTemplate(); }
      if (e.shiftKey && (e.key === 'E' || e.key === 'e')) { e.preventDefault(); handleExportHtml(); }
      if (e.key === 'p') { e.preventDefault(); handleExportPdf(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }); // intentionally no deps — captures latest closures

  // ── Drag resize ───────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const container = document.getElementById('mf-panes');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const deltaFrac = (e.clientX - dragOrigin.current.x) / rect.width;
      setPaneWidth(Math.min(75, Math.max(25, dragOrigin.current.width + deltaFrac * 100)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // ── Sync line numbers scroll ──────────────────────────────
  const syncLineScroll = useCallback(() => {
    if (textareaRef.current && lineNumRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // ── Close dropdowns on outside click ─────────────────────
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-export-menu]')) setShowExportMenu(false);
      if (!t.closest('[data-tpl-dropdown]')) setTemplateDropdown(false);
    };
    window.addEventListener('mousedown', fn);
    return () => window.removeEventListener('mousedown', fn);
  }, []);

  // ── Helpers ───────────────────────────────────────────────
  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
  }, []);

  // ── Slash command insertion ───────────────────────────────
  const insertCommand = useCallback((cmd: SlashCommandDef, state: SlashCommandState) => {
    if (cmd.special === 'icon-picker') {
      pendingIconInsert.current = { startIndex: state.startIndex };
      setSlashState(null);
      setShowIconPicker(true);
      return;
    }
    const ta = textareaRef.current;
    if (!ta) return;
    const text = cmd.insert(branding);
    const before = content.slice(0, state.startIndex);
    const after = content.slice(ta.selectionStart);
    const next = `${before}${text}\n${after}`;
    setContent(next);
    setSlashState(null);
    requestAnimationFrame(() => {
      const pos = state.startIndex + text.length + 1;
      ta.selectionStart = ta.selectionEnd = pos;
      ta.focus();
    });
  }, [branding, content]);

  const handleIconPicked = useCallback((iconName: string) => {
    setShowIconPicker(false);
    const ta = textareaRef.current;
    if (!ta || !pendingIconInsert.current) return;
    const { startIndex } = pendingIconInsert.current;
    const text = `<lucide-icon name="${iconName}" />`;
    const before = content.slice(0, startIndex);
    const after = content.slice(ta.selectionStart);
    setContent(`${before}${text}${after}`);
    pendingIconInsert.current = null;
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = startIndex + text.length;
      ta.focus();
    });
  }, [content]);

  // ── Editor change handler ─────────────────────────────────
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setContent(val);

    const before = val.slice(0, pos);
    const lastSlash = before.lastIndexOf('/');
    if (lastSlash !== -1) {
      const charBefore = lastSlash > 0 ? before[lastSlash - 1] : '\n';
      const atWordStart = charBefore === '\n' || charBefore === ' ' || charBefore === '\t' || lastSlash === 0;
      const query = before.slice(lastSlash + 1);
      if (atWordStart && !query.includes('\n') && query.length <= 20) {
        const ta = e.target;
        const taRect = ta.getBoundingClientRect();
        const caret = getCaretCoordinates(ta, lastSlash);
        setSlashState({
          query,
          startIndex: lastSlash,
          x: taRect.left + caret.left,
          y: taRect.top + caret.top - ta.scrollTop + caret.height,
          selectedIndex: 0,
        });
        return;
      }
    }
    setSlashState(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashState) {
      const filtered = slashCommands.filter(c => fuzzyMatch(slashState.query, `${c.label} ${c.description}`)).slice(0, 8);
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashState(s => s ? { ...s, selectedIndex: (s.selectedIndex + 1) % Math.max(filtered.length, 1) } : null); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlashState(s => s ? { ...s, selectedIndex: (s.selectedIndex - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1) } : null); return; }
      if (e.key === 'Enter') { e.preventDefault(); const cmd = filtered[slashState.selectedIndex]; if (cmd) insertCommand(cmd, slashState); return; }
      if (e.key === 'Escape') { e.preventDefault(); setSlashState(null); return; }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const s = ta.selectionStart;
      const newVal = content.slice(0, s) + '  ' + content.slice(ta.selectionEnd);
      setContent(newVal);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
    }
  }, [slashState, slashCommands, content, insertCommand]);

  // ── Template operations ───────────────────────────────────
  const saveTemplate = useCallback((name: string) => {
    const t: Template = { id: generateId(), name, content, createdAt: Date.now(), updatedAt: Date.now() };
    const next = [...templates, t];
    setTemplates(next);
    setToStorage(TEMPLATES_KEY, next);
    addToast(`Template "${name}" saved`, 'success');
  }, [content, templates, addToast]);

  const handleSaveAsTemplate = useCallback(() => {
    const name = window.prompt('Template name:', title);
    if (name?.trim()) saveTemplate(name.trim());
  }, [title, saveTemplate]);

  const loadTemplate = useCallback((t: Template) => {
    manualTitle.current = false;
    setContent(t.content);
    setTitle(t.name);
    setShowTemplatesModal(false);
    setTemplateDropdown(false);
    addToast(`"${t.name}" loaded`, 'info');
  }, [addToast]);

  const deleteTemplate = useCallback((id: string) => {
    const next = templates.filter(t => t.id !== id);
    setTemplates(next); setToStorage(TEMPLATES_KEY, next);
  }, [templates]);

  const duplicateTemplate = useCallback((t: Template) => {
    const dup: Template = { ...t, id: generateId(), name: `${t.name} (copy)`, createdAt: Date.now(), updatedAt: Date.now() };
    const next = [...templates, dup];
    setTemplates(next); setToStorage(TEMPLATES_KEY, next);
  }, [templates]);

  const renameTemplate = useCallback((id: string, name: string) => {
    const next = templates.map(t => t.id === id ? { ...t, name, updatedAt: Date.now() } : t);
    setTemplates(next); setToStorage(TEMPLATES_KEY, next);
  }, [templates]);

  // ── Export operations ─────────────────────────────────────
  const handleExportHtml = useCallback(() => {
    downloadFile(buildExportHtml(content, branding, title), 'mailforge-export.html', 'text/html');
    addToast('HTML exported', 'success');
  }, [content, branding, title, addToast]);

  const handleExportMd = useCallback(() => {
    downloadFile(`${content}\n\n<!-- Built with MailForge by Eternum · Apache 2.0 -->\n`, 'mailforge-export.md', 'text/markdown');
    addToast('Markdown exported', 'success');
  }, [content, addToast]);

  const handleExportPdf = useCallback(() => {
    const sid = 'mf-print-css';
    let el = document.getElementById(sid) as HTMLStyleElement | null;
    if (!el) { el = document.createElement('style'); el.id = sid; document.head.appendChild(el); }
    el.textContent = `@media print {
      #mf-toolbar,#mf-editor-pane,#mf-divider,#mf-statusbar { display:none !important; }
      #mf-preview-pane { width:100% !important; }
      body { background:#fff !important; }
      .mf-email-frame { box-shadow:none !important; border-radius:0 !important; }
      #mf-print-wm { display:block !important; }
    }`;
    window.print();
    window.addEventListener('afterprint', () => { if (el) el.textContent = ''; }, { once: true });
  }, []);

  const handleLoadFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.md,.txt';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target?.result;
        if (typeof text === 'string') {
          setContent(text);
          setTitle(file.name.replace(/\.(md|txt)$/, ''));
          addToast(`Loaded: ${file.name}`, 'info');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [addToast]);

  const handleNewDoc = useCallback(() => {
    if (content !== DEFAULT_CONTENT && !window.confirm('Start fresh? Unsaved changes will be lost.')) return;
    manualTitle.current = false;
    setContent(DEFAULT_CONTENT);
    addToast('New document', 'info');
  }, [content, addToast]);

  // ── UI ────────────────────────────────────────────────────
  const saveLabel = saveStatus === 'unsaved' ? 'Unsaved changes'
    : saveStatus === 'saving' ? 'Saving…'
    : savedAgo < 5 ? 'Saved just now'
    : `Saved ${savedAgo}s ago`;

  // shared button styles — all 34 px tall, same border-radius
  const ibtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, borderRadius: 7, border: 'none', cursor: 'pointer',
    background: 'rgba(73,136,196,0.08)', color: '#90b8d8', transition: 'background 0.15s',
    flexShrink: 0,
  };
  // text buttons keep the same 34 px height, auto width
  const tbtn = (active = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 5,
    height: 34, padding: '0 10px',
    borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
    background: active ? 'rgba(73,136,196,0.28)' : 'rgba(73,136,196,0.08)',
    color: active ? '#BDE8F5' : '#90b8d8', transition: 'background 0.15s',
    flexShrink: 0,
  });

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#0F2854', color: '#F8FBFF',
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale',
      overflow: 'hidden', position: 'relative',
    }}>
      <style>{`
        * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        .mf-ibtn:hover { background: rgba(73,136,196,0.22) !important; color: #BDE8F5 !important; }
        .mf-tbtn:hover { background: rgba(73,136,196,0.18) !important; color: #BDE8F5 !important; }
        @keyframes mfSlideIn { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
      `}</style>

      {/* ═══ TOOLBAR ═══════════════════════════════════════════ */}
      <header id="mf-toolbar" style={{
        height: 52, display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px',
        background: '#09193b', borderBottom: '1px solid rgba(73,136,196,0.22)',
        flexShrink: 0, zIndex: 200,
      }}>
        {/* Logo — no sub-label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 2, flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#1C4D8D,#4988C4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mail size={15} style={{ color: '#fff' }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#F8FBFF', letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>
            Eternum Mails
          </span>
        </div>

        {/* Document title (center) */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 8px', minWidth: 0 }}>
          {editingTitle
            ? <input value={title}
                onChange={e => { manualTitle.current = true; setTitle(e.target.value); }}
                autoFocus
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
                style={{ background: 'rgba(73,136,196,0.14)', border: '1px solid rgba(73,136,196,0.4)', borderRadius: 6, padding: '4px 10px', color: '#F8FBFF', fontSize: 14, fontWeight: 600, outline: 'none', textAlign: 'center', minWidth: 160, maxWidth: 320, fontFamily: 'inherit' }}
              />
            : <button onClick={() => setEditingTitle(true)}
                style={{ background: 'none', border: 'none', color: '#F8FBFF', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: '4px 8px', borderRadius: 6, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                title="Click to rename"
              >
                {title} <span style={{ opacity: 0.3, fontSize: 11 }}>✎</span>
              </button>
          }
        </div>

        {/* Right-side actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          <button className="mf-ibtn" onClick={handleNewDoc} style={ibtn} title="New document"><Plus size={15} /></button>
          <button className="mf-ibtn" onClick={handleLoadFile} style={ibtn} title="Load .md file"><FolderOpen size={15} /></button>
          <button className="mf-ibtn" onClick={handleSaveAsTemplate} style={ibtn} title="Save as template (Ctrl+S)"><Save size={15} /></button>

          {/* Templates — now on the right */}
          <div style={{ position: 'relative', flexShrink: 0 }} data-tpl-dropdown>
            <button className="mf-ibtn" onClick={() => setTemplateDropdown(o => !o)}
              style={{ ...ibtn, background: templateDropdown ? 'rgba(73,136,196,0.28)' : ibtn.background }}
              title="Templates">
              <Layers size={15} />
            </button>
            {templateDropdown && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#122040', border: '1px solid #2a4a6a', borderRadius: 9, width: 210, boxShadow: '0 8px 28px rgba(0,0,0,0.5)', zIndex: 4000, overflow: 'hidden' }}>
                {templates.length === 0
                  ? <div style={{ padding: '12px 14px', color: '#6a99bb', fontSize: 12 }}>No templates yet</div>
                  : templates.map(t => (
                    <button key={t.id} onClick={() => loadTemplate(t)}
                      style={{ display: 'block', width: '100%', padding: '9px 14px', background: 'transparent', border: 'none', color: '#ddeeff', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontFamily: 'inherit' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.14)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >{t.name}</button>
                  ))
                }
                <div style={{ borderTop: '1px solid #1e3a5a', padding: '7px 14px' }}>
                  <button onClick={() => { setTemplateDropdown(false); setShowTemplatesModal(true); }}
                    style={{ background: 'none', border: 'none', color: '#4988C4', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
                    Manage all →
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ width: 1, height: 22, background: 'rgba(73,136,196,0.22)', margin: '0 2px' }} />

          {/* Export — same 34 px height as icon buttons */}
          <div style={{ position: 'relative' }} data-export-menu>
            <button className="mf-tbtn" onClick={() => setShowExportMenu(o => !o)}
              style={tbtn(showExportMenu)} title="Export options">
              <Download size={14} /><span>Export</span><ChevronDown size={10} />
            </button>
            {showExportMenu && <ExportMenu onHtml={handleExportHtml} onMd={handleExportMd} onPdf={handleExportPdf} onClose={() => setShowExportMenu(false)} />}
          </div>

          <button className="mf-ibtn" onClick={() => setShowSettings(s => !s)}
            style={{ ...ibtn, background: showSettings ? 'rgba(73,136,196,0.3)' : ibtn.background }}
            title="Branding & settings"><Settings2 size={15} /></button>

          {isMobile && (
            <div style={{ display: 'flex', gap: 2, background: 'rgba(73,136,196,0.1)', borderRadius: 7, padding: 2, marginLeft: 2 }}>
              <button className="mf-tbtn" onClick={() => setActiveTab('editor')} style={tbtn(activeTab === 'editor')}><Code size={13} /></button>
              <button className="mf-tbtn" onClick={() => setActiveTab('preview')} style={tbtn(activeTab === 'preview')}><Eye size={13} /></button>
            </div>
          )}
        </div>
      </header>

      {/* ═══ PANES ═══════════════════════════════════════════ */}
      <div id="mf-panes" style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Editor pane */}
        {(!isMobile || activeTab === 'editor') && (
          <div id="mf-editor-pane" style={{ width: isMobile ? '100%' : `${paneWidth}%`, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: isMobile ? 'none' : '1px solid rgba(73,136,196,0.18)', minWidth: 0 }}>
            <div style={{ padding: '5px 12px', background: '#0a1e3d', borderBottom: '1px solid rgba(73,136,196,0.12)', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
              <Code size={12} style={{ color: '#4988C4' }} />
              <span style={{ fontSize: 11, color: '#6a99bb', fontWeight: 700, letterSpacing: '0.5px' }}>EDITOR</span>
              <span style={{ fontSize: 11, color: '#2a4a6a', marginLeft: 'auto' }}>/ commands · Tab indent</span>
            </div>
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
              <div ref={lineNumRef} style={{ width: 42, flexShrink: 0, overflowY: 'hidden', background: '#091830', borderRight: '1px solid rgba(73,136,196,0.1)', color: '#2a4a6a', fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, lineHeight: '22px', paddingTop: 16, userSelect: 'none', textAlign: 'right' }}>
                {content.split('\n').map((_, i) => <div key={i} style={{ paddingRight: 8 }}>{i + 1}</div>)}
              </div>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onScroll={syncLineScroll}
                spellCheck={false}
                aria-label="Markdown editor"
                style={{
                  flex: 1, resize: 'none', border: 'none', outline: 'none',
                  background: '#0c1d38', color: '#b8d4ee',
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 13, lineHeight: '22px', padding: '16px', overflowY: 'auto',
                  whiteSpace: 'pre-wrap', wordWrap: 'break-word', tabSize: 2,
                }}
              />
            </div>
          </div>
        )}

        {/* Drag divider */}
        {!isMobile && (
          <div id="mf-divider"
            onMouseDown={e => { e.preventDefault(); isDragging.current = true; dragOrigin.current = { x: e.clientX, width: paneWidth }; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
            style={{ width: 5, flexShrink: 0, cursor: 'col-resize', background: 'rgba(73,136,196,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', zIndex: 10 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.28)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.06)')}
          >
            <GripVertical size={11} style={{ color: '#2a4a6a', pointerEvents: 'none' }} />
          </div>
        )}

        {/* Preview pane */}
        {(!isMobile || activeTab === 'preview') && (
          <div id="mf-preview-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <div style={{ padding: '5px 12px', background: '#0a1e3d', borderBottom: '1px solid rgba(73,136,196,0.12)', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
              <Eye size={12} style={{ color: '#4988C4' }} />
              <span style={{ fontSize: 11, color: '#6a99bb', fontWeight: 700, letterSpacing: '0.5px' }}>PREVIEW</span>
              <span style={{ fontSize: 11, color: '#2a4a6a', marginLeft: 'auto' }}>600px email frame</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', background: '#091428', padding: '24px 16px' }}>
              <div className="mf-email-frame" style={{ maxWidth: 600, margin: '0 auto', background: branding.bodyBg, borderRadius: 10, boxShadow: '0 8px 40px rgba(0,0,0,0.45)', overflow: 'hidden', minHeight: 200 }}>
                <div
                  style={{
                    padding: '28px 36px',
                    fontFamily: `'${getActiveFontFamily(branding)}', 'Inter', sans-serif`,
                    fontSize: FONT_SIZE_MAP[branding.fontSize],
                    color: branding.bodyText, lineHeight: 1.7,
                    background: branding.bodyBg,
                  }}
                  dangerouslySetInnerHTML={{ __html: `
                    <style>
                      .mf-b h1{color:${branding.bodyText};font-size:26px;margin:0 0 16px;font-family:inherit}
                      .mf-b h2{color:${branding.bodyText};font-size:20px;margin:24px 0 12px;font-family:inherit;opacity:0.85}
                      .mf-b h3{color:${branding.bodyText};font-size:16px;margin:18px 0 8px;font-family:inherit;opacity:0.75}
                      .mf-b p{margin:0 0 14px;color:${branding.bodyText}}
                      .mf-b a{color:${branding.linkColor};text-decoration:underline}
                      .mf-b hr{border:none;border-top:1px solid rgba(0,0,0,0.1);margin:22px 0}
                      .mf-b img{max-width:100%;height:auto}
                      .mf-b blockquote{border-left:4px solid ${branding.linkColor};margin:16px 0;padding:10px 16px;background:rgba(73,136,196,0.07);border-radius:0 6px 6px 0}
                      .mf-b code{background:rgba(0,0,0,0.06);padding:2px 6px;border-radius:3px;font-size:12px;font-family:monospace}
                      .mf-b pre{background:#1a1a2e;color:#c8dff5;padding:16px;border-radius:8px;overflow-x:auto;margin:0 0 16px}
                      .mf-b pre code{background:none;color:inherit;padding:0;font-size:13px}
                      .mf-b ul,.mf-b ol{margin:0 0 14px;padding-left:22px}.mf-b li{margin-bottom:5px;color:${branding.bodyText}}
                      .mf-b table{border-collapse:collapse;width:100%;margin-bottom:14px}
                      .mf-b th,.mf-b td{border:1px solid rgba(0,0,0,0.1);padding:7px 11px;text-align:left;color:${branding.bodyText}}
                      .mf-b th{background:rgba(0,0,0,0.04);font-weight:600}
                      .mf-b strong{font-weight:700}.mf-b em{font-style:italic}
                    </style>
                    <div class="mf-b">${previewHtml}</div>
                  ` }}
                />
                {/* Print-only watermark */}
                <div id="mf-print-wm" style={{ display: 'none', padding: '10px 20px', borderTop: '1px solid #e8edf5', textAlign: 'center', fontSize: 11, color: '#aab8c8', background: '#f8fafc' }}>
                  Built with MailForge by Eternum · itica-lat · Apache 2.0
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ STATUS BAR ══════════════════════════════════════ */}
      <footer id="mf-statusbar" style={{
        height: 26, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px', background: '#06122a', borderTop: '1px solid rgba(73,136,196,0.18)',
        flexShrink: 0, fontSize: 11,
      }}>
        <span style={{ color: '#3a5a7a' }}>{wordCount} words · {content.length} chars</span>
        <span style={{ color: saveStatus === 'unsaved' ? '#d4904a' : '#3d9a6a', display: 'flex', alignItems: 'center', gap: 4 }}>
          {saveStatus === 'saved' && <Check size={10} />}{saveLabel}
        </span>
        <a href="https://github.com/itica-lat" target="_blank" rel="noopener noreferrer" style={{ color: '#4988C4', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ExternalLink size={10} /> Eternum Mails
        </a>
      </footer>

      {/* ═══ OVERLAYS ════════════════════════════════════════ */}
      {slashState && (
        <SlashPalette commands={slashCommands} state={slashState} onSelect={cmd => insertCommand(cmd, slashState)} onClose={() => setSlashState(null)} />
      )}

      {showIconPicker && (
        <IconPickerModal onSelect={handleIconPicked} onClose={() => setShowIconPicker(false)} />
      )}

      {showTemplatesModal && (
        <TemplatesModal
          templates={templates}
          onLoad={loadTemplate}
          onSave={() => { const n = window.prompt('Template name:', title); if (n?.trim()) saveTemplate(n.trim()); }}
          onDelete={deleteTemplate}
          onDuplicate={duplicateTemplate}
          onRename={renameTemplate}
          onClose={() => setShowTemplatesModal(false)}
        />
      )}

      <SettingsPanel branding={branding} onChange={setBranding} onClose={() => setShowSettings(false)} visible={showSettings} />

      <ToastList toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
}
