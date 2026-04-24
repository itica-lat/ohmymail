import { Check, AlertCircle, Info } from 'lucide-react';
import type { Toast } from '../types';

export default function ToastList({ toasts, onDismiss }: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div style={{ position:'fixed', top:16, right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => onDismiss(t.id)} style={{
          display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
          borderRadius:8, pointerEvents:'auto', cursor:'pointer',
          background: t.type==='success' ? '#0f2d1e' : t.type==='error' ? '#2d0f0f' : '#0f1e2d',
          border: `1px solid ${t.type==='success' ? '#1f6b42' : t.type==='error' ? '#6b1f1f' : '#1f426b'}`,
          color:   t.type==='success' ? '#5de09a' : t.type==='error' ? '#e05d5d' : '#5db5e0',
          fontSize:13, fontWeight:500, boxShadow:'0 4px 16px rgba(0,0,0,0.5)',
          animation:'mfSlideIn 0.2s ease',
        }}>
          {t.type==='success' ? <Check size={14}/> : t.type==='error' ? <AlertCircle size={14}/> : <Info size={14}/>}
          {t.message}
        </div>
      ))}
    </div>
  );
}
