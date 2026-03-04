'use client';

import React from 'react';

interface CustomerInfoPanelProps {
    customer: any;
}

export function CustomerInfoPanel({ customer }: CustomerInfoPanelProps) {
    const initials = customer.full_name
        ? customer.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)
        : '?';

    const isActive = customer.is_active !== false;

    // Determine status with full 4-state support per spec
    const statusValue = customer.status || (isActive ? 'active' : 'inactive');
    const statusMap: Record<string, { label: string; className: string }> = {
        active: { label: 'לקוח פעיל', className: 'status-active' },
        inactive: { label: 'לא פעיל', className: 'status-inactive' },
        candidate: { label: 'מועמד', className: 'status-candidate' },
        blocked: { label: 'חסום', className: 'status-blocked' },
    };
    const statusInfo = statusMap[statusValue] || statusMap.active;

    // Calculate tenure
    const tenure = customer.created_at
        ? ((Date.now() - new Date(customer.created_at).getTime()) / (365.25 * 24 * 3600 * 1000)).toFixed(1)
        : null;

    const InfoRow = ({ label, value, href }: { label: string; value?: string | null; href?: string }) => {
        if (!value) return null;
        return (
            <div className="info-row">
                <div className="info-label">{label}</div>
                <div className="info-value">
                    {href ? <a href={href}>{value}</a> : value}
                </div>
            </div>
        );
    };

    return (
        <div className="panel-left">

            {/* Avatar + Name + Status */}
            <div className="avatar-section">
                <div className="avatar">
                    {initials}
                    <div className="avatar-badge" style={{ background: isActive ? 'var(--green)' : 'var(--muted)' }}></div>
                </div>
                <div className="customer-name">{customer.full_name}</div>
                <div className="customer-title">{customer.company_name || 'לקוח פרטי'}</div>
                <div className={`status-badge ${statusInfo.className}`}>
                    <span className="status-dot"></span> {statusInfo.label}
                </div>
            </div>

            {/* KPIs */}
            <div>
                <div className="section-title">סיכום כספי</div>
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-value green">₪{(customer.total_spent || 0).toLocaleString()}</div>
                        <div className="kpi-label">סה"כ מכירות</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-value amber">₪{(customer.balance || 0).toLocaleString()}</div>
                        <div className="kpi-label">פתוח לגביה</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-value">{customer.total_orders || 0}</div>
                        <div className="kpi-label">הזמנות</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-value" style={{ color: 'var(--accent)' }}>{tenure ? `${tenure} שנ'` : '—'}</div>
                        <div className="kpi-label">ותק לקוח</div>
                    </div>
                </div>
            </div>

            {/* Contact Info */}
            <div>
                <div className="section-title">פרטי קשר</div>
                <div className="info-rows">
                    <InfoRow label="📱 טלפון" value={customer.phone} href={`tel:${customer.phone}`} />
                    <InfoRow label="✉ אימייל" value={customer.email} href={`mailto:${customer.email}`} />
                    <InfoRow label="🏢 כתובת" value={customer.default_address} />
                    <InfoRow label="🌐 אתר" value={customer.website} href={customer.website} />
                </div>
            </div>

            {/* Business Info */}
            <div>
                <div className="section-title">פרטי עסק</div>
                <div className="info-rows">
                    <InfoRow label="ח״פ / ע״מ" value={customer.business_id || customer.tax_id} />
                    <InfoRow label="תנאי תשלום" value={customer.payment_terms || 'שוטף + 30'} />
                    <InfoRow label="סוג לקוח" value={customer.customer_type} />
                    <InfoRow label="מקור הגעה" value={customer.lead_source} />
                    <InfoRow label="מנהל תיק" value={customer.account_manager_name} />
                    <InfoRow label="איש קשר" value={customer.contact_person} />
                </div>
            </div>

            {/* Tags */}
            {(() => {
                let tagsArr: string[] = [];
                if (typeof customer.tags === 'string') {
                    tagsArr = customer.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
                } else if (Array.isArray(customer.tags)) {
                    tagsArr = customer.tags;
                }

                if (tagsArr.length === 0) return null;

                return (
                    <div>
                        <div className="section-title">תגיות</div>
                        <div className="tags">
                            {tagsArr.map((tag: string, i: number) => {
                                const isVip = tag.toLowerCase().includes('vip');
                                return (
                                    <span key={i} className={`tag ${isVip ? 'vip' : ''}`}>
                                        {isVip ? '⭐ ' : ''}{tag}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
