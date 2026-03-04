"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Save, RotateCcw, Eye, CheckCircle2, Loader2, Type, Radius } from "lucide-react";
import { toast } from "sonner";
import { API_URL, getHeaders } from "@/lib/auth";

interface BrandingConfig {
    primaryColor: string;
    primaryDark: string;
    primaryLight: string;
    navyDark: string;
    navyMid: string;
    navyLight: string;
    accentColor: string;
    successColor: string;
    destructiveColor: string;
    borderRadius: string;
    fontFamily: string;
    logoUrl: string;
    faviconUrl: string;
    companyName: string;
    companyTagline: string;
}

const DEFAULTS: BrandingConfig = {
    primaryColor: "#F5A623",
    primaryDark: "#C8821A",
    primaryLight: "#FEF3DC",
    navyDark: "#05101F",
    navyMid: "#0A1929",
    navyLight: "#122845",
    accentColor: "#F5A623",
    successColor: "#16A34A",
    destructiveColor: "#EF4444",
    borderRadius: "10",
    fontFamily: "Inter",
    logoUrl: "",
    faviconUrl: "",
    companyName: "TZIR",
    companyTagline: "שליחויות חכמות",
};

function hexToHSL(hex: string): string {
    hex = hex.replace("#", "");
    if (hex.length !== 6) return "0 0% 100%"; // Fallback to white instead of crashing or returning NaN

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    if (isNaN(r) || isNaN(g) || isNaN(b)) return "0 0% 100%";

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function lightenHex(hex: string, percent: number): string {
    hex = hex.replace("#", "");
    const r = Math.min(255, Math.round(parseInt(hex.substring(0, 2), 16) + (255 - parseInt(hex.substring(0, 2), 16)) * percent / 100));
    const g = Math.min(255, Math.round(parseInt(hex.substring(2, 4), 16) + (255 - parseInt(hex.substring(2, 4), 16)) * percent / 100));
    const b = Math.min(255, Math.round(parseInt(hex.substring(4, 6), 16) + (255 - parseInt(hex.substring(4, 6), 16)) * percent / 100));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function ColorSwatch({ color, label, name, value, onChange }: {
    color: string; label: string; name: string; value: string;
    onChange: (name: string, value: string) => void;
}) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-all group">
            <div className="relative">
                <div
                    className="w-12 h-12 rounded-xl shadow-md border-2 border-white cursor-pointer transition-transform group-hover:scale-110"
                    style={{ backgroundColor: value }}
                />
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(name, e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground font-mono">{value.toUpperCase()}</p>
            </div>
        </div>
    );
}

export default function BrandingPage() {
    const [config, setConfig] = useState<BrandingConfig>(DEFAULTS);
    const [original, setOriginal] = useState<BrandingConfig>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // ── Load from API ──
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_URL}/api/settings/branding`, { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    setConfig(data);
                    setOriginal(data);
                }
            } catch { /* fallback to defaults */ }
            setLoading(false);
        })();
    }, []);

    // ── Track changes ──
    useEffect(() => {
        setHasChanges(JSON.stringify(config) !== JSON.stringify(original));
    }, [config, original]);

    // ── Live preview — apply CSS vars in real-time ──
    const applyPreview = useCallback((c: BrandingConfig) => {
        const root = document.documentElement;
        root.style.setProperty("--amber", c.primaryColor);
        root.style.setProperty("--amber-dark", c.primaryDark);
        root.style.setProperty("--amber-light", c.primaryLight);
        root.style.setProperty("--amber-dim", c.primaryColor + "1a");
        root.style.setProperty("--amber-glow", c.primaryColor + "33");
        root.style.setProperty("--primary", hexToHSL(c.primaryColor));
        root.style.setProperty("--accent", hexToHSL(c.accentColor));
        root.style.setProperty("--ring", hexToHSL(c.primaryColor));
        if (c.navyDark) {
            root.style.setProperty("--navy-950", c.navyDark);
            root.style.setProperty("--navy-900", c.navyMid || lightenHex(c.navyDark, 5));
            root.style.setProperty("--navy-800", lightenHex(c.navyDark, 10));
            root.style.setProperty("--navy-700", c.navyLight || lightenHex(c.navyDark, 15));
            root.style.setProperty("--navy-600", lightenHex(c.navyDark, 25));
            root.style.setProperty("--navy-400", lightenHex(c.navyDark, 45));
            root.style.setProperty("--navy-200", lightenHex(c.navyDark, 65));
            root.style.setProperty("--navy-100", lightenHex(c.navyDark, 80));
            root.style.setProperty("--foreground", hexToHSL(c.navyDark));
            root.style.setProperty("--primary-foreground", hexToHSL(c.navyDark));
            root.style.setProperty("--accent-foreground", hexToHSL(c.navyDark));
        }
        root.style.setProperty("--success", hexToHSL(c.successColor));
        root.style.setProperty("--destructive", hexToHSL(c.destructiveColor));
        root.style.setProperty("--radius", `${c.borderRadius}px`);
    }, []);

    const handleChange = (name: string, value: string) => {
        const updated = { ...config, [name]: value };
        setConfig(updated);
        applyPreview(updated);
    };

    // ── Save to API ──
    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/settings/branding`, {
                method: "PUT",
                headers: { ...getHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            if (res.ok) {
                const data = await res.json();
                setOriginal(data.branding || config);
                toast.success("הגדרות המותג נשמרו בהצלחה! 🎨");
            } else {
                toast.error("שגיאה בשמירה");
            }
        } catch {
            toast.error("שגיאת רשת");
        }
        setSaving(false);
    };

    // ── Reset to saved ──
    const handleReset = () => {
        setConfig(original);
        applyPreview(original);
        toast.info("הוחזר למצב השמור");
    };

    // ── Restore factory defaults ──
    const handleDefaults = () => {
        setConfig(DEFAULTS);
        applyPreview(DEFAULTS);
        toast.info("הוחזר לברירת המחדל");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto" dir="rtl">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-3 rounded-xl shadow-lg">
                        <Palette className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">עיצוב ומיתוג</h1>
                        <p className="text-muted-foreground">שנה את צבעי המותג, לוגו ועיצוב הממשק בזמן אמת</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleDefaults} className="gap-2">
                        <RotateCcw className="w-4 h-4" />
                        ברירת מחדל
                    </Button>
                    {hasChanges && (
                        <Button variant="outline" onClick={handleReset} className="gap-2">
                            <RotateCcw className="w-4 h-4" />
                            בטל שינויים
                        </Button>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className="gap-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-lg"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? "שומר..." : "שמור שינויים"}
                    </Button>
                </div>
            </div>

            {/* ── Live Preview Banner ── */}
            {hasChanges && (
                <div className="bg-gradient-to-r from-brand-light to-brand-dim border border-brand-dim rounded-xl p-4 flex items-center gap-3">
                    <Eye className="w-5 h-5 text-brand" />
                    <p className="text-sm text-brand-dark font-medium">
                        מצב תצוגה מקדימה פעיל — השינויים מוצגים בזמן אמת.  שמור כדי להחיל לצמיתות.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Brand Colors ── */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="w-5 h-5 text-primary" />
                            צבעי מותג
                        </CardTitle>
                        <CardDescription>לחץ על כל ריבוע צבע כדי לשנות אותו</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Primary Brand Colors */}
                        <div>
                            <h3 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wider">🎨 צבע ראשי (Primary)</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <ColorSwatch color={config.primaryColor} label="צבע ראשי" name="primaryColor" value={config.primaryColor} onChange={handleChange} />
                                <ColorSwatch color={config.primaryDark} label="ראשי כהה" name="primaryDark" value={config.primaryDark} onChange={handleChange} />
                                <ColorSwatch color={config.primaryLight} label="ראשי בהיר" name="primaryLight" value={config.primaryLight} onChange={handleChange} />
                            </div>
                        </div>

                        {/* Navy / Dark Colors */}
                        <div>
                            <h3 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wider">🌙 צבעי רקע כהים (Navy)</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <ColorSwatch color={config.navyDark} label="כהה עמוק" name="navyDark" value={config.navyDark} onChange={handleChange} />
                                <ColorSwatch color={config.navyMid} label="כהה בינוני" name="navyMid" value={config.navyMid} onChange={handleChange} />
                                <ColorSwatch color={config.navyLight} label="כהה בהיר" name="navyLight" value={config.navyLight} onChange={handleChange} />
                            </div>
                        </div>

                        {/* Status Colors */}
                        <div>
                            <h3 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wider">🚦 צבעי סטטוס</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <ColorSwatch color={config.accentColor} label="Accent / Ring" name="accentColor" value={config.accentColor} onChange={handleChange} />
                                <ColorSwatch color={config.successColor} label="הצלחה (ירוק)" name="successColor" value={config.successColor} onChange={handleChange} />
                                <ColorSwatch color={config.destructiveColor} label="שגיאה (אדום)" name="destructiveColor" value={config.destructiveColor} onChange={handleChange} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Side Panel: Text, Radius, Preview ── */}
                <div className="space-y-6">
                    {/* Company Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Type className="w-5 h-5 text-primary" />
                                פרטי חברה
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="companyName">שם החברה</Label>
                                <Input
                                    id="companyName"
                                    value={config.companyName}
                                    onChange={(e) => handleChange("companyName", e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="companyTagline">סלוגן</Label>
                                <Input
                                    id="companyTagline"
                                    value={config.companyTagline}
                                    onChange={(e) => handleChange("companyTagline", e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="fontFamily">פונט</Label>
                                <select
                                    id="fontFamily"
                                    value={config.fontFamily}
                                    onChange={(e) => handleChange("fontFamily", e.target.value)}
                                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="Inter">Inter</option>
                                    <option value="Roboto">Roboto</option>
                                    <option value="Outfit">Outfit</option>
                                    <option value="Poppins">Poppins</option>
                                    <option value="Rubik">Rubik (עברית)</option>
                                    <option value="Heebo">Heebo (עברית)</option>
                                    <option value="Assistant">Assistant (עברית)</option>
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Border Radius */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Radius className="w-5 h-5 text-primary" />
                                עיגול פינות
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min="0"
                                    max="24"
                                    step="1"
                                    value={config.borderRadius}
                                    onChange={(e) => handleChange("borderRadius", e.target.value)}
                                    className="flex-1 accent-primary"
                                />
                                <span className="text-sm font-mono font-bold w-12 text-center">{config.borderRadius}px</span>
                            </div>
                            <div className="flex gap-3 justify-center">
                                {[0, 6, 10, 16, 24].map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => handleChange("borderRadius", r.toString())}
                                        className={`w-10 h-10 border-2 transition-all ${config.borderRadius === r.toString() ? "border-primary shadow-md scale-110" : "border-border"}`}
                                        style={{
                                            borderRadius: `${r}px`,
                                            backgroundColor: config.primaryColor
                                        }}
                                        title={`${r}px`}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Live Preview Card */}
                    <Card className="overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Eye className="w-5 h-5 text-primary" />
                                תצוגה מקדימה
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Mini Mock UI */}
                            <div
                                className="rounded-xl overflow-hidden border"
                                style={{ borderRadius: `${config.borderRadius}px` }}
                            >
                                <div
                                    className="p-4 text-white text-center"
                                    style={{ background: `linear-gradient(135deg, ${config.navyDark}, ${config.navyMid})` }}
                                >
                                    <p className="text-lg font-bold">{config.companyName}</p>
                                    <p className="text-xs opacity-80">{config.companyTagline}</p>
                                </div>
                                <div className="p-3 bg-white space-y-2">
                                    <button
                                        className="w-full py-2 text-sm font-bold text-white"
                                        style={{
                                            backgroundColor: config.primaryColor,
                                            borderRadius: `${config.borderRadius}px`
                                        }}
                                    >
                                        כפתור ראשי
                                    </button>
                                    <div className="flex gap-2">
                                        <span
                                            className="px-3 py-1 text-xs text-white font-bold"
                                            style={{ backgroundColor: config.successColor, borderRadius: `${config.borderRadius}px` }}
                                        >
                                            הצלחה
                                        </span>
                                        <span
                                            className="px-3 py-1 text-xs text-white font-bold"
                                            style={{ backgroundColor: config.destructiveColor, borderRadius: `${config.borderRadius}px` }}
                                        >
                                            שגיאה
                                        </span>
                                        <span
                                            className="px-3 py-1 text-xs text-white font-bold"
                                            style={{ backgroundColor: config.accentColor, borderRadius: `${config.borderRadius}px` }}
                                        >
                                            Accent
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
