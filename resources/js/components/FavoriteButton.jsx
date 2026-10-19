import React from 'react';
import { Heart } from 'lucide-react';

export default function FavoriteButton({ saved = false, disabled = false, onClick }) {
    const label = saved ? 'Bỏ yêu thích' : 'Thêm vào yêu thích';
    return <button type="button" aria-label={label} title={label} aria-pressed={saved} disabled={disabled}
        onClick={event => { event.stopPropagation(); onClick?.(); }}
        style={{ padding: '9px 11px', display: 'inline-flex', alignItems: 'center', gap: 6,
            border: '1px solid #fecdd3', borderRadius: 8, background: saved ? '#fff1f2' : '#fff',
            color: '#be123c', cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
        <Heart size={19} fill={saved ? 'currentColor' : 'none'} />
    </button>;
}
