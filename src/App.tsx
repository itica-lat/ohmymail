import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { marked } from 'marked';
import {
  Mail, Check, ExternalLink, Code, Eye, GripVertical,
  Plus, FolderOpen, Save, Layers, Download, ChevronDown, Settings2,
} from 'lucide-react';

import { APP_CONFIG, DEFAULT_BRANDING } from './config/app.config';
import type { BrandingConfig, SlashCommandDef, SlashCommandState, Template } from './types';
import { AUTOSAVE_KEY, BRANDING_KEY, DEFAULT_CONTENT, FONT_SIZE_MAP, TITLE_KEY } from './constants';
import {
  getFromStorage, setToStorage, getActiveFontFamily, getActiveFontUrl,
  getCaretCoordinates, processPreviewHtml, downloadFile, buildExportHtml, fuzzyMatch,
} from './utils';
import { useAutosave, useMobile, useDragResize, useToasts, useTemplates } from './hooks';
import { buildSlashCommands } from './commands';

import ToastList       from './components/ToastList';
import SlashPalette    from './components/SlashPalette';
import IconPickerModal from './components/IconPickerModal';
import TemplatesModal  from './components/TemplatesModal';
import SettingsPanel   from './components/SettingsPanel';
import ExportMenu      from './components/ExportMenu';

// ── Shared button styles ──────────────────────────────────────
const IBTN: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center',
  width:34, height:34, borderRadius:7, border:'none', cursor:'pointer',
  background:'rgba(73,136,196,0.08)', color:'#90b8d8', transition:'background 0.15s', flexShrink:0,
};
const tbtn = (active = false): React.CSSProperties => ({
  display:'flex', alignItems:'center', gap:5,
  height:34, padding:'0 10px', borderRadius:7, border:'none', cursor:'pointer',
  fontSize:13, fontWeight:500, flexShrink:0, transition:'background 0.15s',
  background: active ? 'rgba(73,136,196,0.28)' : 'rgba(73,136,196,0.08)',
  color:      active ? '#BDE8F5'               : '#90b8d8',
});

// ============================================================
// Main component
// ============================================================

export default function MailForge() {
  // ── State ─────────────────────────────────────────────────
  const [content,            setContent]            = useState('');
  const [title,              setTitle]              = useState('Untitled Email');
  const [editingTitle,       setEditingTitle]       = useState(false);
  const [branding,           setBranding]           = useState<BrandingConfig>(() => ({
    ...DEFAULT_BRANDING,
    ...getFromStorage<Partial<BrandingConfig>>(BRANDING_KEY, {}),
  }));
  const [activeTab,          setActiveTab]          = useState<'editor' | 'preview'>('editor');
  const [showSettings,       setShowSettings]       = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showExportMenu,     setShowExportMenu]     = useState(false);
  const [showIconPicker,     setShowIconPicker]     = useState(false);
  const [templateDropdown,   setTemplateDropdown]   = useState(false);
  const [slashState,         setSlashState]         = useState<SlashCommandState | null>(null);

  // ── Hooks ─────────────────────────────────────────────────
  const { toasts, addToast, dismissToast }                                               = useToasts();
  const { templates, saveTemplate, deleteTemplate, duplicateTemplate, renameTemplate }   = useTemplates();
  const { status: saveStatus, savedAgo }                                                 = useAutosave(content, title);
  const isMobile                                                                         = useMobile();
  const { paneWidth, onDragStart }                                                       = useDragResize();

  // ── Refs ──────────────────────────────────────────────────
  const textareaRef       = useRef<HTMLTextAreaElement>(null);
  const lineNumRef        = useRef<HTMLDivElement>(null);
  const pendingIconInsert = useRef<{ startIndex: number } | null>(null);
  const manualTitle       = useRef(false);

  // ── Derived values ────────────────────────────────────────
  const slashCommands = useMemo(() => buildSlashCommands(branding), [branding]);

  const previewHtml = useMemo(() => {
    const raw = marked.parse(content);
    return processPreviewHtml(typeof raw === 'string' ? raw : String(raw), branding);
  }, [content, branding]);

  const wordCount = useMemo(() => (content.trim() ? content.trim().split(/\s+/).length : 0), [content]);

  const saveLabel = saveStatus === 'unsaved'
    ? 'Unsaved changes'
    : savedAgo < 5 ? 'Saved just now' : `Saved ${savedAgo}s ago`;

  // ── Initialisation ────────────────────────────────────────
  useEffect(() => {
    const saved = getFromStorage<string | null>(AUTOSAVE_KEY, null);
    setContent(saved ?? DEFAULT_CONTENT);
    setTitle(getFromStorage(TITLE_KEY, 'Untitled Email'));
    if (saved) addToast('Draft restored', 'info');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-title from first # heading
  useEffect(() => {
    if (manualTitle.current) return;
    const match = content.match(/^#\s+(.+)$/m);
    if (match) setTitle(match[1].trim());
  }, [content]);

  // ── Font injection ────────────────────────────────────────
  useEffect(() => {
    [
      { id:'mf-ui-font',     href:'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap' },
      { id:'mf-editor-font', href:'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap' },
    ].forEach(({ id, href }) => {
      if (!document.getElementById(id)) {
        document.head.appendChild(Object.assign(document.createElement('link'), { id, rel:'stylesheet', href }));
      }
    });
  }, []);

  useEffect(() => {
    const id = 'mf-preview-font';
    document.getElementById(id)?.remove();
    document.head.appendChild(Object.assign(document.createElement('link'), { id, rel:'stylesheet', href:getActiveFontUrl(branding) }));
  }, [branding.font, branding.customFontUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist branding ──────────────────────────────────────
  useEffect(() => { setToStorage(BRANDING_KEY, branding); }, [branding]);

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 's')                                         { e.preventDefault(); handleSaveAsTemplate(); }
      if (e.shiftKey && (e.key === 'E' || e.key === 'e'))       { e.preventDefault(); handleExportHtml(); }
      if (e.key === 'p')                                         { e.preventDefault(); handleExportPdf(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }); // no deps — captures latest closures

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

  // ── Editor helpers ────────────────────────────────────────
  const syncLineScroll = useCallback(() => {
    if (textareaRef.current && lineNumRef.current)
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
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
    const next = `${content.slice(0, state.startIndex)}${text}\n${content.slice(ta.selectionStart)}`;
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
    setContent(`${content.slice(0, startIndex)}${text}${content.slice(ta.selectionStart)}`);
    pendingIconInsert.current = null;
    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = startIndex + text.length; ta.focus(); });
  }, [content]);

  // ── Editor change / key handlers ──────────────────────────
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setContent(val);

    const before     = val.slice(0, pos);
    const lastSlash  = before.lastIndexOf('/');
    if (lastSlash !== -1) {
      const prev        = lastSlash > 0 ? before[lastSlash - 1] : '\n';
      const atWordStart = ['\n', ' ', '\t'].includes(prev) || lastSlash === 0;
      const query       = before.slice(lastSlash + 1);
      if (atWordStart && !query.includes('\n') && query.length <= 20) {
        const taRect = e.target.getBoundingClientRect();
        const caret  = getCaretCoordinates(e.target, lastSlash);
        setSlashState({ query, startIndex:lastSlash, x:taRect.left + caret.left, y:taRect.top + caret.top - e.target.scrollTop + caret.height, selectedIndex:0 });
        return;
      }
    }
    setSlashState(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashState) {
      const filtered = slashCommands.filter(c => fuzzyMatch(slashState.query, `${c.label} ${c.description}`)).slice(0, 8);
      const total    = Math.max(filtered.length, 1);
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashState(s => s ? { ...s, selectedIndex:(s.selectedIndex + 1) % total }             : null); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSlashState(s => s ? { ...s, selectedIndex:(s.selectedIndex - 1 + total) % total }      : null); return; }
      if (e.key === 'Enter')     { e.preventDefault(); const cmd = filtered[slashState.selectedIndex]; if (cmd) insertCommand(cmd, slashState); return; }
      if (e.key === 'Escape')    { e.preventDefault(); setSlashState(null); return; }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const s = ta.selectionStart;
      setContent(content.slice(0, s) + '  ' + content.slice(ta.selectionEnd));
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
    }
  }, [slashState, slashCommands, content, insertCommand]);

  // ── Template handlers ─────────────────────────────────────
  const handleSaveAsTemplate = useCallback(() => {
    const name = window.prompt('Template name:', title);
    if (!name?.trim()) return;
    saveTemplate(name.trim(), content);
    addToast(`Template "${name.trim()}" saved`, 'success');
  }, [title, content, saveTemplate, addToast]);

  const loadTemplate = useCallback((t: Template) => {
    manualTitle.current = false;
    setContent(t.content);
    setTitle(t.name);
    setShowTemplatesModal(false);
    setTemplateDropdown(false);
    addToast(`"${t.name}" loaded`, 'info');
  }, [addToast]);

  // ── Export handlers ───────────────────────────────────────
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
    window.addEventListener('afterprint', () => { if (el) el.textContent = ''; }, { once:true });
  }, []);

  const handleLoadFile = useCallback(() => {
    const input = Object.assign(document.createElement('input'), { type:'file', accept:'.md,.txt' });
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

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'#0F2854', color:'#F8FBFF', fontFamily:'"IBM Plex Sans",system-ui,sans-serif', WebkitFontSmoothing:'antialiased', MozOsxFontSmoothing:'grayscale', overflow:'hidden', position:'relative' }}>
      <style>{`
        * { -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }
        .mf-ibtn:hover { background:rgba(73,136,196,0.22) !important; color:#BDE8F5 !important; }
        .mf-tbtn:hover { background:rgba(73,136,196,0.18) !important; color:#BDE8F5 !important; }
        @keyframes mfSlideIn { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
      `}</style>

      {/* ═══ TOOLBAR ══════════════════════════════════════════ */}
      <header id="mf-toolbar" style={{ height:52, display:'flex', alignItems:'center', gap:4, padding:'0 10px', background:'#09193b', borderBottom:'1px solid rgba(73,136,196,0.22)', flexShrink:0, zIndex:200 }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:2, flexShrink:0 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#1C4D8D,#4988C4)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Mail size={15} style={{ color:'#fff' }}/>
          </div>
          <span style={{ fontSize:14, fontWeight:700, color:'#F8FBFF', letterSpacing:'-0.2px', whiteSpace:'nowrap' }}>
            {APP_CONFIG.name}
          </span>
        </div>

        {/* Title */}
        <div style={{ flex:1, display:'flex', justifyContent:'center', padding:'0 8px', minWidth:0 }}>
          {editingTitle
            ? <input value={title}
                onChange={e => { manualTitle.current = true; setTitle(e.target.value); }}
                autoFocus onBlur={() => setEditingTitle(false)}
                onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
                style={{ background:'rgba(73,136,196,0.14)', border:'1px solid rgba(73,136,196,0.4)', borderRadius:6, padding:'4px 10px', color:'#F8FBFF', fontSize:14, fontWeight:600, outline:'none', textAlign:'center', minWidth:160, maxWidth:320, fontFamily:'inherit' }}
              />
            : <button onClick={() => setEditingTitle(true)}
                style={{ background:'none', border:'none', color:'#F8FBFF', cursor:'pointer', fontSize:14, fontWeight:600, padding:'4px 8px', borderRadius:6, maxWidth:320, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                title="Click to rename"
              >
                {title} <span style={{ opacity:0.3, fontSize:11 }}>✎</span>
              </button>
          }
        </div>

        {/* Actions */}
        <div style={{ display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
          <button className="mf-ibtn" onClick={handleNewDoc}          style={IBTN} title="New document"><Plus       size={15}/></button>
          <button className="mf-ibtn" onClick={handleLoadFile}        style={IBTN} title="Load .md file"><FolderOpen size={15}/></button>
          <button className="mf-ibtn" onClick={handleSaveAsTemplate}  style={IBTN} title="Save as template (Ctrl+S)"><Save size={15}/></button>

          {/* Templates dropdown */}
          <div style={{ position:'relative', flexShrink:0 }} data-tpl-dropdown>
            <button className="mf-ibtn" onClick={() => setTemplateDropdown(o => !o)}
              style={{ ...IBTN, background:templateDropdown ? 'rgba(73,136,196,0.28)' : IBTN.background }}
              title="Templates">
              <Layers size={15}/>
            </button>
            {templateDropdown && (
              <div style={{ position:'absolute', top:'100%', right:0, marginTop:4, background:'#122040', border:'1px solid #2a4a6a', borderRadius:9, width:210, boxShadow:'0 8px 28px rgba(0,0,0,0.5)', zIndex:4000, overflow:'hidden' }}>
                {templates.length === 0
                  ? <div style={{ padding:'12px 14px', color:'#6a99bb', fontSize:12 }}>No templates yet</div>
                  : templates.map(t => (
                    <button key={t.id} onClick={() => loadTemplate(t)}
                      style={{ display:'block', width:'100%', padding:'9px 14px', background:'transparent', border:'none', color:'#ddeeff', cursor:'pointer', textAlign:'left', fontSize:13, fontFamily:'inherit' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.14)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >{t.name}</button>
                  ))
                }
                <div style={{ borderTop:'1px solid #1e3a5a', padding:'7px 14px' }}>
                  <button onClick={() => { setTemplateDropdown(false); setShowTemplatesModal(true); }}
                    style={{ background:'none', border:'none', color:'#4988C4', cursor:'pointer', fontSize:12, fontWeight:600, padding:0, fontFamily:'inherit' }}>
                    Manage all →
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ width:1, height:22, background:'rgba(73,136,196,0.22)', margin:'0 2px' }}/>

          {/* Export */}
          <div style={{ position:'relative' }} data-export-menu>
            <button className="mf-tbtn" onClick={() => setShowExportMenu(o => !o)} style={tbtn(showExportMenu)} title="Export options">
              <Download size={14}/><span>Export</span><ChevronDown size={10}/>
            </button>
            {showExportMenu && <ExportMenu onHtml={handleExportHtml} onMd={handleExportMd} onPdf={handleExportPdf} onClose={() => setShowExportMenu(false)}/>}
          </div>

          <button className="mf-ibtn" onClick={() => setShowSettings(s => !s)}
            style={{ ...IBTN, background:showSettings ? 'rgba(73,136,196,0.3)' : IBTN.background }}
            title="Branding & settings">
            <Settings2 size={15}/>
          </button>

          {isMobile && (
            <div style={{ display:'flex', gap:2, background:'rgba(73,136,196,0.1)', borderRadius:7, padding:2, marginLeft:2 }}>
              <button className="mf-tbtn" onClick={() => setActiveTab('editor')}  style={tbtn(activeTab==='editor')} ><Code size={13}/></button>
              <button className="mf-tbtn" onClick={() => setActiveTab('preview')} style={tbtn(activeTab==='preview')}><Eye  size={13}/></button>
            </div>
          )}
        </div>
      </header>

      {/* ═══ PANES ════════════════════════════════════════════ */}
      <div id="mf-panes" style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>

        {/* Editor */}
        {(!isMobile || activeTab === 'editor') && (
          <div id="mf-editor-pane" style={{ width:isMobile ? '100%' : `${paneWidth}%`, display:'flex', flexDirection:'column', overflow:'hidden', borderRight:isMobile ? 'none' : '1px solid rgba(73,136,196,0.18)', minWidth:0 }}>
            <div style={{ padding:'5px 12px', background:'#0a1e3d', borderBottom:'1px solid rgba(73,136,196,0.12)', display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
              <Code size={12} style={{ color:'#4988C4' }}/>
              <span style={{ fontSize:11, color:'#6a99bb', fontWeight:700, letterSpacing:'0.5px' }}>EDITOR</span>
              <span style={{ fontSize:11, color:'#2a4a6a', marginLeft:'auto' }}>/ commands · Tab indent</span>
            </div>
            <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0, position:'relative' }}>
              {/* Line numbers */}
              <div ref={lineNumRef} style={{ width:42, flexShrink:0, overflowY:'hidden', background:'#091830', borderRight:'1px solid rgba(73,136,196,0.1)', color:'#2a4a6a', fontFamily:'"IBM Plex Mono",monospace', fontSize:12, lineHeight:'22px', paddingTop:16, userSelect:'none', textAlign:'right' }}>
                {content.split('\n').map((_, i) => <div key={i} style={{ paddingRight:8 }}>{i + 1}</div>)}
              </div>
              {/* Textarea */}
              <textarea ref={textareaRef} value={content} onChange={handleChange} onKeyDown={handleKeyDown} onScroll={syncLineScroll}
                spellCheck={false} aria-label="Markdown editor"
                style={{ flex:1, resize:'none', border:'none', outline:'none', background:'#0c1d38', color:'#b8d4ee', fontFamily:'"IBM Plex Mono",monospace', fontSize:13, lineHeight:'22px', padding:16, overflowY:'auto', whiteSpace:'pre-wrap', wordWrap:'break-word', tabSize:2 }}
              />
            </div>
          </div>
        )}

        {/* Divider */}
        {!isMobile && (
          <div id="mf-divider" onMouseDown={onDragStart}
            style={{ width:5, flexShrink:0, cursor:'col-resize', background:'rgba(73,136,196,0.06)', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s', zIndex:10 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.28)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.06)')}
          >
            <GripVertical size={11} style={{ color:'#2a4a6a', pointerEvents:'none' }}/>
          </div>
        )}

        {/* Preview */}
        {(!isMobile || activeTab === 'preview') && (
          <div id="mf-preview-pane" style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
            <div style={{ padding:'5px 12px', background:'#0a1e3d', borderBottom:'1px solid rgba(73,136,196,0.12)', display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
              <Eye size={12} style={{ color:'#4988C4' }}/>
              <span style={{ fontSize:11, color:'#6a99bb', fontWeight:700, letterSpacing:'0.5px' }}>PREVIEW</span>
              <span style={{ fontSize:11, color:'#2a4a6a', marginLeft:'auto' }}>600px email frame</span>
            </div>
            <div style={{ flex:1, overflowY:'auto', background:'#091428', padding:'24px 16px' }}>
              <div className="mf-email-frame" style={{ maxWidth:600, margin:'0 auto', background:branding.bodyBg, borderRadius:10, boxShadow:'0 8px 40px rgba(0,0,0,0.45)', overflow:'hidden', minHeight:200 }}>
                <div
                  style={{ padding:'28px 36px', fontFamily:`'${getActiveFontFamily(branding)}','Inter',sans-serif`, fontSize:FONT_SIZE_MAP[branding.fontSize], color:branding.bodyText, lineHeight:1.7, background:branding.bodyBg }}
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
                <div id="mf-print-wm" style={{ display:'none', padding:'10px 20px', borderTop:'1px solid #e8edf5', textAlign:'center', fontSize:11, color:'#aab8c8', background:'#f8fafc' }}>
                  Built with MailForge by Eternum · itica-lat · Apache 2.0
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ STATUS BAR ═══════════════════════════════════════ */}
      <footer id="mf-statusbar" style={{ height:26, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 14px', background:'#06122a', borderTop:'1px solid rgba(73,136,196,0.18)', flexShrink:0, fontSize:11 }}>
        <span style={{ color:'#3a5a7a' }}>{wordCount} words · {content.length} chars</span>
        <span style={{ color:saveStatus==='unsaved' ? '#d4904a' : '#3d9a6a', display:'flex', alignItems:'center', gap:4 }}>
          {saveStatus==='saved' && <Check size={10}/>}{saveLabel}
        </span>
        <a href={APP_CONFIG.github} target="_blank" rel="noopener noreferrer" style={{ color:'#4988C4', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
          <ExternalLink size={10}/> {APP_CONFIG.name}
        </a>
      </footer>

      {/* ═══ OVERLAYS ══════════════════════════════════════════ */}
      {slashState && (
        <SlashPalette commands={slashCommands} state={slashState} onSelect={cmd => insertCommand(cmd, slashState)}/>
      )}
      {showIconPicker && (
        <IconPickerModal onSelect={handleIconPicked} onClose={() => setShowIconPicker(false)}/>
      )}
      {showTemplatesModal && (
        <TemplatesModal
          templates={templates}
          onLoad={loadTemplate}
          onSave={() => { const n = window.prompt('Template name:', title); if (n?.trim()) { saveTemplate(n.trim(), content); addToast(`Template "${n.trim()}" saved`, 'success'); } }}
          onDelete={deleteTemplate}
          onDuplicate={duplicateTemplate}
          onRename={renameTemplate}
          onClose={() => setShowTemplatesModal(false)}
        />
      )}
      <SettingsPanel branding={branding} onChange={setBranding} onClose={() => setShowSettings(false)} visible={showSettings}/>
      <ToastList toasts={toasts} onDismiss={dismissToast}/>
    </div>
  );
}
