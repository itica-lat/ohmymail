import type { BrandingConfig } from './types';
import { FONT_LABELS, ICON_SVGS } from './constants';

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

export function concentricRadius(innerRadius: number, padding: number): number {
  return innerRadius + padding;
}

// ── HTML processing (lucide-icon replacement for inline markdown) ─

export function processPreviewHtml(html: string, branding: BrandingConfig): string {
  return html
    .replace(/<lucide-icon\s+name="([^"]+)"\s*\/?>/gi, (_, name: string) => {
      const svg = ICON_SVGS[name.toLowerCase()];
      return svg ?? `<span style="font-size:11px;opacity:0.5;">[icon:${name}]</span>`;
    })
    .replace(/LOGO_URL/g, branding.logoUrl || 'https://placehold.co/120x40/0F2854/BDE8F5?text=Logo')
    .replace(/COMPANY NAME/g, branding.companyName || 'Your Company');
}
