'use client';

import React, { useState, useRef } from 'react';

interface CustomerActivityTabsProps {
    customerId: number;
    activities: any[];
    orders: any[];
    notes: any[];
    files: any[];
    auditLogs: any[];
    onAddNote: (content: string) => void;
    onAddOrder: () => void;
    onUploadFile: (file: File) => void;
}

function formatDate(dateStr: string) {
    try {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = (now.getTime() - d.getTime()) / 1000;
        if (diff < 60) return 'עכשיו';
        if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק'`;
        if (diff < 86400) return `היום, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        if (diff < 172800) return `אתמול, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`;
    } catch { return dateStr; }
}

function formatDateShort(dateStr: string) {
    try {
        const d = new Date(dateStr);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`;
    } catch { return dateStr; }
}

const TABS = [
    { key: 'activity', label: 'פעילות' },
    { key: 'orders', label: 'הזמנות' },
    { key: 'notes', label: 'הערות' },
    { key: 'docs', label: 'מסמכים' },
    { key: 'archive', label: 'ארכיון' },
] as const;

type TabKey = typeof TABS[number]['key'];

export function CustomerActivityTabs({
    activities, orders, notes, files, auditLogs,
    onAddNote, onAddOrder, onUploadFile
}: CustomerActivityTabsProps) {

    const [activeTab, setActiveTab] = useState<TabKey>('activity');
    const [newNote, setNewNote] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const handleSaveNote = () => {
        if (!newNote.trim()) return;
        onAddNote(newNote);
        setNewNote('');
    };

    const StatusPill = ({ status }: { status: string }) => {
        if (status === 'paid' || status === 'completed') return <span className="pill pill-green">שולם</span>;
        if (status === 'pending' || status === 'partial') return <span className="pill pill-amber">ממתין לתשלום</span>;
        if (status === 'cancelled') return <span className="pill pill-red">בוטל</span>;
        return <span className="pill pill-blue">{status}</span>;
    };

    return (
        <div className="panel-center">

            <div className="tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── ACTIVITY TAB ── */}
            {activeTab === 'activity' && (
                <div className="tab-content active">
                    <div className="note-composer">
                        <textarea
                            value={newNote}
                            onChange={e => setNewNote(e.target.value)}
                            placeholder="הוסף הערה, תיעוד שיחה, או עדכון..."
                        />
                        <div className="note-footer">
                            <button className="btn btn-ghost" style={{ fontSize: 12 }}>📎 קובץ</button>
                            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleSaveNote}>שמור הערה</button>
                        </div>
                    </div>

                    <div className="timeline">
                        {activities.map((act, i) => (
                            <div key={i} className="timeline-item">
                                <div className={`tl-icon ${act.type}`}>
                                    {act.type === 'payment' && '💳'}
                                    {act.type === 'order' && '📦'}
                                    {act.type === 'note' && '📝'}
                                    {act.type === 'call' && '📞'}
                                    {act.type === 'email' && '✉'}
                                    {act.type === 'meeting' && '📅'}
                                </div>
                                <div className="tl-body">
                                    <div className="tl-header">
                                        <div className="tl-title">{act.title}</div>
                                        <div className="tl-date">{formatDate(act.date)}</div>
                                    </div>
                                    <div className="tl-desc">{act.description}</div>
                                    {act.amount && (
                                        <div className="tl-amount">₪ {act.amount.toLocaleString()}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── ORDERS TAB ── */}
            {activeTab === 'orders' && (
                <div className="tab-content active">
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">הזמנות ועסקאות</div>
                            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={onAddOrder}>+ הזמנה חדשה</button>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>תיאור</th>
                                    <th>תאריך</th>
                                    <th>סכום</th>
                                    <th>סטטוס</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>אין הזמנות ללקוח זה</td></tr>
                                ) : orders.map((order, i) => (
                                    <tr key={i}>
                                        <td style={{ color: 'var(--accent)', fontWeight: 600 }}>#{order.order_number || order.id}</td>
                                        <td>{order.package_description || order.description || '—'}</td>
                                        <td style={{ color: 'var(--muted)' }}>{formatDateShort(order.created_at)}</td>
                                        <td style={{ fontWeight: 700 }}>₪ {(order.delivery_fee || order.total_amount || 0).toLocaleString()}</td>
                                        <td><StatusPill status={order.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── NOTES TAB ── */}
            {activeTab === 'notes' && (
                <div className="tab-content active">
                    <div className="note-composer">
                        <textarea
                            value={newNote}
                            onChange={e => setNewNote(e.target.value)}
                            placeholder="כתוב הערה חופשית..."
                        />
                        <div className="note-footer">
                            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleSaveNote}>שמור הערה</button>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header"><div className="card-title">הערות שמורות</div></div>
                        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {notes.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--muted)', fontSize: 13 }}>אין הערות שמורות.</div>
                            ) : notes.map((note, i) => (
                                <div key={i} style={{ padding: 14, background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
                                        {formatDate(note.created_at)}{note.created_by_name ? ` · ${note.created_by_name}` : ''}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--soft)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                        {note.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── DOCS TAB ── */}
            {activeTab === 'docs' && (
                <div className="tab-content active">
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">מסמכים מצורפים</div>
                            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => fileRef.current?.click()}>+ העלה קובץ</button>
                            <input ref={fileRef} type="file" style={{ display: 'none' }}
                                onChange={e => e.target.files?.[0] && onUploadFile(e.target.files[0])} />
                        </div>
                        <div style={{ padding: 16 }}>
                            {files.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13, background: 'rgba(30,34,50,0.5)', border: '1px dashed var(--border)', borderRadius: 12 }}>
                                    <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
                                    לא נמצאו מסמכים ללקוח זה.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {files.map((file, i) => (
                                        <div key={i} className="file-row">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <span style={{ fontSize: 20 }}>📄</span>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{file.title || file.file_name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDateShort(file.created_at)}</div>
                                                </div>
                                            </div>
                                            <a href={file.url} download style={{ fontSize: 11, fontWeight: 500, color: 'var(--accent)', textDecoration: 'none' }}>הורד</a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* ── ARCHIVE TAB ── */}
            {activeTab === 'archive' && (
                <div className="tab-content active">
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">ארכיון פעולות מערכת</div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>תאריך שעה</th>
                                    <th>משתמש</th>
                                    <th>פעולה</th>
                                    <th>פרטים / סטטוס</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(!auditLogs || auditLogs.length === 0) ? (
                                    <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>אין תיעוד בארכיון</td></tr>
                                ) : auditLogs.map((log, i) => (
                                    <tr key={i}>
                                        <td style={{ color: 'var(--muted)', fontSize: 13 }}>
                                            {formatDate(log.timestamp)}
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{log.user_name}</td>
                                        <td>
                                            <span style={{
                                                background: 'var(--surface-color)',
                                                border: '1px solid var(--border-color)',
                                                padding: '2px 8px',
                                                borderRadius: 4,
                                                fontSize: 12
                                            }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 13 }}>
                                            {log.status === 'FAILURE' ? (
                                                <span style={{ color: 'var(--red)', fontWeight: 600 }}>שגיאה: </span>
                                            ) : ''}
                                            {log.details || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
