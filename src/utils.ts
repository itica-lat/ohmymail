import { marked } from 'marked';
import { APP_CONFIG } from './config/app.config';
import type { BrandingConfig } from './types';
import { FONT_LABELS, FONT_SIZE_MAP, ICON_SVGS } from './constants';

// ── Identity ─────────────────────────────────────────────────

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Storage ───────────────────────────────────────────────────

export function getFromStorage<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? (JSON.parse(val) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function setToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded or private browsing */ }
}

// ── File I/O ─────────────────────────────────────────────────

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

// ── Fuzzy matching ────────────────────────────────────────────

export function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase(), t = text.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) if (t[i] === q[qi]) qi++;
  return qi === q.length;
}

// ── Caret coordinates (for slash palette positioning) ─────────

export function getCaretCoordinates(el: HTMLTextAreaElement, pos: number) {
  const div      = document.createElement('div');
  const computed = window.getComputedStyle(el);
  const props    = [
    'direction','boxSizing','width','height','overflowX','overflowY',
    'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth',
    'paddingTop','paddingRight','paddingBottom','paddingLeft',
    'fontStyle','fontVariant','fontWeight','fontStretch','fontSize',
    'lineHeight','fontFamily','textAlign','textTransform','textIndent',
    'textDecoration','letterSpacing','wordSpacing','tabSize',
  ];
  Object.assign(div.style, { position:'absolute', visibility:'hidden', whiteSpace:'pre-wrap', wordWrap:'break-word', overflow:'hidden' });
  props.forEach(p => { (div.style as unknown as Record<string,string>)[p] = computed.getPropertyValue(p); });
  document.body.appendChild(div);
  div.textContent = el.value.substring(0, pos);
  const span = document.createElement('span');
  span.textContent = el.value.substring(pos) || '.';
  div.appendChild(span);
  const result = {
    top:    span.offsetTop  + parseInt(computed.borderTopWidth),
    left:   span.offsetLeft + parseInt(computed.borderLeftWidth),
    height: parseInt(computed.lineHeight) || 22,
  };
  document.body.removeChild(div);
  return result;
}

// ── Font helpers ──────────────────────────────────────────────

export function extractFontNameFromUrl(url: string): string {
  const m = url.match(/family=([^:&]+)/);
  return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
}

export function getActiveFontUrl(b: BrandingConfig): string {
  return b.customFontUrl.trim()
    || `https://fonts.googleapis.com/css2?family=${b.font}:wght@400;600;700&display=swap`;
}

export function getActiveFontFamily(b: BrandingConfig): string {
  return b.customFontName.trim() || FONT_LABELS[b.font] || b.font;
}

// ── Concentric corners ────────────────────────────────────────
//
// The config stores the *inner* corner radius the user wants to perceive
// inside an element. The actual CSS border-radius applied to the container
// element must be larger so that the inner content appears with that radius.
//
//   outer_radius = inner_radius + padding
//
// This follows the standard "concentric corners" design principle: when a
// rounded box is nested inside another rounded box, the outer box's radius
// must equal the inner box's radius plus the gap between them.

/**
 * Compute the CSS border-radius for a container that has the given padding,
 * so that the inner content corner *appears* to have `innerRadius` px rounding.
 */
export function concentricRadius(innerRadius: number, padding: number): number {
  return innerRadius + padding;
}

// ── HTML processing ───────────────────────────────────────────

export function processPreviewHtml(html: string, branding: BrandingConfig): string {
  return html
    .replace(/<lucide-icon\s+name="([^"]+)"\s*\/?>/gi, (_, name: string) => {
      const svg = ICON_SVGS[name.toLowerCase()];
      return svg ?? `<span style="font-size:11px;opacity:0.5;">[icon:${name}]</span>`;
    })
    .replace(/LOGO_URL/g, branding.logoUrl || 'https://placehold.co/120x40/0F2854/BDE8F5?text=Logo')
    .replace(/COMPANY NAME/g, branding.companyName || 'Your Company');
}

export function buildExportHtml(content: string, branding: BrandingConfig, title: string): string {
  const raw        = marked.parse(content);
  const body       = processPreviewHtml(typeof raw === 'string' ? raw : String(raw), branding);
  const fontFamily = getActiveFontFamily(branding);
  const fontUrl    = getActiveFontUrl(branding);
  const { attribution } = APP_CONFIG;

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
  .body  { padding:32px; line-height:1.7; background:${branding.bodyBg}; color:${branding.bodyText}; }
  h1 { font-size:26px; margin:0 0 16px; }
  h2 { font-size:20px; margin:24px 0 12px; }
  h3 { font-size:16px; margin:20px 0 8px; }
  p  { margin:0 0 16px; }
  a  { color:var(--link); }
  hr { border:none; border-top:1px solid rgba(0,0,0,0.1); margin:24px 0; }
  img { max-width:100%; height:auto; }
  blockquote { border-left:4px solid var(--brand-mid); margin:16px 0; padding:12px 16px; background:rgba(73,136,196,0.07); border-radius:0 6px 6px 0; }
  code { background:rgba(0,0,0,0.06); padding:2px 6px; border-radius:3px; font-size:13px; font-family:monospace; }
  pre  { background:#1a1a2e; color:#c8dff5; padding:16px; border-radius:8px; overflow-x:auto; }
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
  <div class="watermark">Built with ${attribution.label} · <a href="${attribution.url}" style="color:#aab8c8;">${attribution.url.replace('https://github.com/', '')}</a> · ${attribution.license}</div>
</div>
</body>
</html>`;
}
