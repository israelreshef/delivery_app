"use client";

import { Settings, DollarSign, MapPin, Bell, Shield, Users, Palette, Database } from "lucide-react";
import Link from "next/link";
import styles from './settings.module.css';

export default function SettingsPage() {
    const settingsCategories = [
        {
            title: "תמחור ותעריפים",
            description: "ניהול מחירים, תעריפים והנחות",
            icon: DollarSign,
            href: "/admin/settings/pricing",
            gradient: "linear-gradient(135deg, #10B981 0%, #047857 100%)",
            shadow: "rgba(16, 185, 129, 0.4)"
        },
        {
            title: "אזורי חלוקה",
            description: "הגדרת אזורים גיאוגרפיים ומחירים",
            icon: MapPin,
            href: "/admin/settings/zones",
            gradient: "linear-gradient(135deg, #3B82F6 0%, #0284C7 100%)",
            shadow: "rgba(59, 130, 246, 0.4)"
        },
        {
            title: "התראות ועדכונים",
            description: "הגדרות SMS, מייל ו-Push notifications",
            icon: Bell,
            href: "/admin/settings/notifications",
            gradient: "linear-gradient(135deg, #A855F7 0%, #DB2777 100%)",
            shadow: "rgba(168, 85, 247, 0.4)"
        },
        {
            title: "אבטחה והרשאות",
            description: "ניהול משתמשים, תפקידים והרשאות",
            icon: Shield,
            href: "/admin/users",
            gradient: "linear-gradient(135deg, #EF4444 0%, #EA580C 100%)",
            shadow: "rgba(239, 68, 68, 0.4)"
        },
        {
            title: "ניהול צוות",
            description: "שליחים, לקוחות ומשתמשי מערכת",
            icon: Users,
            href: "/admin/users",
            gradient: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
            shadow: "rgba(99, 102, 241, 0.4)"
        },
        {
            title: "עיצוב ומיתוג",
            description: "לוגו, צבעים ועיצוב הממשק",
            icon: Palette,
            href: "/admin/settings/branding",
            gradient: "linear-gradient(135deg, #EC4899 0%, #E11D48 100%)",
            shadow: "rgba(236, 72, 153, 0.4)"
        },
        {
            title: "גיבויים ונתונים",
            description: "ייצוא, ייבוא וגיבוי מידע",
            icon: Database,
            href: "/admin/settings/data",
            gradient: "linear-gradient(135deg, #64748B 0%, #475569 100%)",
            shadow: "rgba(100, 116, 139, 0.4)"
        }
    ];

    return (
        <div className={styles.settingsContainer}>
            {/* Header */}
            <div className={styles.headerArea}>
                <div className={styles.headerIconWrapper}>
                    <Settings style={{ width: '24px', height: '24px', color: '#ffffff' }} />
                </div>
                <div>
                    <h1 className={styles.title}>הגדרות מערכת</h1>
                    <p className={styles.subtitle}>ניהול והגדרות כלליות של המערכת</p>
                </div>
            </div>

            {/* Settings Grid */}
            <div className={styles.cardGrid}>
                {settingsCategories.map((category, index) => {
                    const Icon = category.icon;
                    return (
                        <Link key={index} href={category.href} className={styles.settingsCard}>
                            <div className={styles.cardHeader}>
                                <div
                                    className={styles.iconContainer}
                                    style={{
                                        background: category.gradient,
                                        boxShadow: `0 4px 12px ${category.shadow}`
                                    }}
                                >
                                    <Icon style={{ width: '24px', height: '24px', color: '#ffffff' }} />
                                </div>
                                <div className={styles.cardTitle}>
                                    {category.title}
                                </div>
                                <div className={styles.cardDescription}>
                                    {category.description}
                                </div>
                            </div>
                            <div className={styles.cardAction}>
                                פתח הגדרות
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className={styles.quickActionsCard}>
                <div className={styles.quickActionsTitle}>פעולות מהירות</div>
                <div className={styles.quickActionsGrid}>
                    <button className={styles.actionBtn}>ייצוא נתונים</button>
                    <button className={styles.actionBtn}>גיבוי מערכת</button>
                    <button className={styles.actionBtn}>צפייה בלוגים</button>
                    <button className={styles.actionBtn}>בדיקת מערכת</button>
                </div>
            </div>
        </div>
    );
}
