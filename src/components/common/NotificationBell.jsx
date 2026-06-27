import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';

/* Reusable notification bell — fetches the current user's notifications,
   shows an unread badge, and a dropdown. Polls every 30s. Used across all
   dashboards. Theme via theme.css tokens. */
export default function NotificationBell() {
    const { user } = useAuth();
    const { t } = useLocale();
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const headers = { Authorization: `Bearer ${user?.token}` };

    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/notifications?limit=20', { headers });
            if (res.ok) {
                const d = await res.json();
                setItems(d.items);
                setUnread(d.unreadCount);
            }
        } catch { /* ignore transient errors */ }
    }, [user?.token]);

    useEffect(() => {
        if (!user?.token) return;
        load();
        const id = setInterval(load, 30000);
        return () => clearInterval(id);
    }, [user?.token, load]);

    // close on outside click
    useEffect(() => {
        const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const markOne = async (id) => {
        await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers });
        load();
    };
    const markAll = async () => {
        await fetch('/api/notifications/read-all', { method: 'PATCH', headers });
        load();
    };

    const timeAgo = (d) => {
        const s = Math.floor((Date.now() - new Date(d)) / 1000);
        if (s < 60) return t('notifications.justNow');
        if (s < 3600) return `${Math.floor(s / 60)}m`;
        if (s < 86400) return `${Math.floor(s / 3600)}h`;
        return `${Math.floor(s / 86400)}d`;
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button onClick={() => setOpen(o => !o)} title={t('notifications.title')} style={S.bellBtn}>
                <Bell size={19} />
                {unread > 0 && <span style={S.badge}>{unread > 9 ? '9+' : unread}</span>}
            </button>

            {open && (
                <div style={S.panel}>
                    <div style={S.head}>
                        <strong style={{ fontSize: 14, color: 'var(--nv-text)' }}>{t('notifications.title')}</strong>
                        {unread > 0 && (
                            <button onClick={markAll} style={S.markAll}><Check size={13} /> {t('notifications.markAll')}</button>
                        )}
                    </div>
                    <div style={S.list}>
                        {items.length === 0 && <div style={S.empty}>{t('notifications.empty')}</div>}
                        {items.map(n => (
                            <button key={n._id} onClick={() => markOne(n._id)} style={{ ...S.item, ...(n.readAt ? {} : S.itemUnread) }}>
                                {!n.readAt && <span style={S.dot} />}
                                <div style={{ flex: 1 }}>
                                    <div style={S.itemTitle}>{n.title}</div>
                                    {n.body && <div style={S.itemBody}>{n.body}</div>}
                                    <div style={S.itemTime}>{timeAgo(n.createdAt)}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

const S = {
    bellBtn: {
        position: 'relative', width: 40, height: 40, borderRadius: 11,
        background: 'var(--nv-surface-2)', border: '1px solid var(--nv-border-3)',
        color: 'var(--nv-text-muted)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer',
    },
    badge: {
        position: 'absolute', top: 4, insetInlineEnd: 4, minWidth: 16, height: 16,
        padding: '0 4px', borderRadius: 999, background: 'var(--nv-primary)', color: '#fff',
        fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px solid var(--nv-surface)',
    },
    panel: {
        position: 'absolute', top: 48, insetInlineEnd: 0, width: 340, maxHeight: 440,
        background: 'var(--nv-surface)', border: '1px solid var(--nv-border)',
        borderRadius: 14, boxShadow: '0 12px 28px -12px rgba(80,40,120,.35)', zIndex: 3000,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
    },
    head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--nv-border-2)' },
    markAll: { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', color: 'var(--nv-primary)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
    list: { overflowY: 'auto' },
    empty: { padding: '28px 14px', textAlign: 'center', color: 'var(--nv-text-soft)', fontSize: 13 },
    item: { display: 'flex', gap: 8, width: '100%', textAlign: 'start', padding: '11px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--nv-border-2)', cursor: 'pointer', fontFamily: 'inherit' },
    itemUnread: { background: 'var(--nv-surface-3)' },
    dot: { width: 7, height: 7, borderRadius: '50%', background: 'var(--nv-primary)', marginTop: 6, flex: 'none' },
    itemTitle: { fontSize: 13, fontWeight: 700, color: 'var(--nv-text)' },
    itemBody: { fontSize: 12, color: 'var(--nv-text-muted)', marginTop: 2 },
    itemTime: { fontSize: 11, color: 'var(--nv-text-faint)', marginTop: 3 },
};
