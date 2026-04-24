// ============================================================
// Types & Interfaces
// ============================================================

export interface Template {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface BrandingConfig {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  font: string;
  fontSize: 'small' | 'medium' | 'large';
  customFontUrl: string;
  customFontName: string;
  headerBg: string;
  headerText: string;
  /** Inner corner radius. Outer CSS = inner + padding (concentric corners rule). */
  headerRadius: number;
  footerBg: string;
  footerText: string;
  /** Inner corner radius. Outer CSS = inner + padding (concentric corners rule). */
  footerRadius: number;
  bodyBg: string;
  bodyText: string;
  linkColor: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface SlashCommandDef {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  special?: 'icon-picker';
  insert: (branding: BrandingConfig) => string;
}

export interface SlashCommandState {
  query: string;
  startIndex: number;
  x: number;
  y: number;
  selectedIndex: number;
}

/**
 * User-defined inline HTML tag slash command — configure in app.config.ts.
 * Each entry appears in the "/" palette and wraps placeholder text in a styled tag.
 */
export interface CustomTagCommand {
  id: string;
  label: string;
  description: string;
  /** HTML tag name, e.g. "span", "mark", "kbd" */
  tag: string;
  /** Inline CSS string applied to the element */
  style: string;
  /** Default inner text inserted with the command */
  placeholder: string;
}
