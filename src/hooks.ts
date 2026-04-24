import { useCallback, useEffect, useRef, useState } from 'react';
import type { Template, Toast } from './types';
import { AUTOSAVE_KEY, TEMPLATES_KEY, TITLE_KEY } from './constants';
import { generateId, getFromStorage, setToStorage } from './utils';

// ── Autosave ──────────────────────────────────────────────────

export type SaveStatus = 'saved' | 'unsaved';

export function useAutosave(content: string, title: string) {
  const [status, setStatus]     = useState<SaveStatus>('saved');
  const [savedAgo, setSavedAgo] = useState(0);
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedAt = useRef(Date.now());

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    setStatus('unsaved');
    timer.current = setTimeout(() => {
      setToStorage(AUTOSAVE_KEY, content);
      setToStorage(TITLE_KEY, title);
      savedAt.current = Date.now();
      setStatus('saved');
      setSavedAgo(0);
    }, 1000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [content, title]);

  useEffect(() => {
    if (status !== 'saved') return;
    const iv = setInterval(() => setSavedAgo(Math.floor((Date.now() - savedAt.current) / 1000)), 5000);
    return () => clearInterval(iv);
  }, [status]);

  return { status, savedAgo };
}

// ── Mobile detection ──────────────────────────────────────────

export function useMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < breakpoint);
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [breakpoint]);
  return isMobile;
}

// ── Pane drag-resize ──────────────────────────────────────────

export function useDragResize(initial = 50) {
  const [paneWidth, setPaneWidth] = useState(initial);
  const isDragging = useRef(false);
  const origin     = useRef({ x: 0, width: initial });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const el = document.getElementById('mf-panes');
      if (!el) return;
      const delta = (e.clientX - origin.current.x) / el.getBoundingClientRect().width;
      setPaneWidth(Math.min(75, Math.max(25, origin.current.width + delta * 100)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    origin.current = { x: e.clientX, width: paneWidth };
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return { paneWidth, onDragStart };
}

// ── Toasts ────────────────────────────────────────────────────

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = generateId();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}

// ── Template CRUD ─────────────────────────────────────────────

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>(() =>
    getFromStorage<Template[]>(TEMPLATES_KEY, [])
  );

  const persist = useCallback((next: Template[]) => {
    setTemplates(next);
    setToStorage(TEMPLATES_KEY, next);
  }, []);

  const saveTemplate = useCallback((name: string, content: string) => {
    const t: Template = { id: generateId(), name, content, createdAt: Date.now(), updatedAt: Date.now() };
    persist([...templates, t]);
  }, [templates, persist]);

  const deleteTemplate = useCallback((id: string) => {
    persist(templates.filter(t => t.id !== id));
  }, [templates, persist]);

  const duplicateTemplate = useCallback((t: Template) => {
    const dup: Template = { ...t, id: generateId(), name: `${t.name} (copy)`, createdAt: Date.now(), updatedAt: Date.now() };
    persist([...templates, dup]);
  }, [templates, persist]);

  const renameTemplate = useCallback((id: string, name: string) => {
    persist(templates.map(t => t.id === id ? { ...t, name, updatedAt: Date.now() } : t));
  }, [templates, persist]);

  return { templates, saveTemplate, deleteTemplate, duplicateTemplate, renameTemplate };
}
