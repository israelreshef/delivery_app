"use client";

import { useEffect } from "react";

/**
 * Convert hex color to HSL string (space-separated, no commas)
 * for CSS variable format used by shadcn/ui:  "38 91% 55%"
 */
function hexToHSL(hex: string): string {
    hex = hex.replace("#", "");
    if (hex.length !== 6) return "0 0% 0%";
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
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

/**
 * Darken a hex color by a percentage (0-100)
 */
function darkenHex(hex: string, percent: number): string {
    hex = hex.replace("#", "");
    const r = Math.max(0, Math.round(parseInt(hex.substring(0, 2), 16) * (1 - percent / 100)));
    const g = Math.max(0, Math.round(parseInt(hex.substring(2, 4), 16) * (1 - percent / 100)));
    const b = Math.max(0, Math.round(parseInt(hex.substring(4, 6), 16) * (1 - percent / 100)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Lighten a hex color by adding white (0-100)
 */
function lightenHex(hex: string, percent: number): string {
    hex = hex.replace("#", "");
    const r = Math.min(255, Math.round(parseInt(hex.substring(0, 2), 16) + (255 - parseInt(hex.substring(0, 2), 16)) * percent / 100));
    const g = Math.min(255, Math.round(parseInt(hex.substring(2, 4), 16) + (255 - parseInt(hex.substring(2, 4), 16)) * percent / 100));
    const b = Math.min(255, Math.round(parseInt(hex.substring(4, 6), 16) + (255 - parseInt(hex.substring(4, 6), 16)) * percent / 100));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function BrandingProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Load saved branding and apply CSS variables globally
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/settings/branding/public`);
                if (!res.ok) return;
                const b = await res.json();

                const root = document.documentElement;

                // ── Primary / Accent / Ring (the main brand color) ──
                if (b.primaryColor) {
                    root.style.setProperty("--primary", hexToHSL(b.primaryColor));
                    root.style.setProperty("--accent", hexToHSL(b.accentColor || b.primaryColor));
                    root.style.setProperty("--ring", hexToHSL(b.primaryColor));

                    // Raw hex values used by custom Tailwind classes
                    root.style.setProperty("--amber", b.primaryColor);
                    root.style.setProperty("--amber-dark", b.primaryDark || darkenHex(b.primaryColor, 20));
                    root.style.setProperty("--amber-light", b.primaryLight || lightenHex(b.primaryColor, 85));
                    root.style.setProperty("--amber-dim", b.primaryColor + "1a"); // 10% opacity
                    root.style.setProperty("--amber-glow", b.primaryColor + "33"); // 20% opacity
                }

                // ── Navy scale (dark backgrounds / sidebar) ──
                if (b.navyDark) {
                    root.style.setProperty("--navy-950", b.navyDark);
                    root.style.setProperty("--navy-900", b.navyMid || lightenHex(b.navyDark, 5));
                    root.style.setProperty("--navy-800", lightenHex(b.navyDark, 10));
                    root.style.setProperty("--navy-700", b.navyLight || lightenHex(b.navyDark, 15));
                    root.style.setProperty("--navy-600", lightenHex(b.navyDark, 25));
                    root.style.setProperty("--navy-400", lightenHex(b.navyDark, 45));
                    root.style.setProperty("--navy-200", lightenHex(b.navyDark, 65));
                    root.style.setProperty("--navy-100", lightenHex(b.navyDark, 80));
                }

                // ── Status colors ──
                if (b.successColor) {
                    root.style.setProperty("--success", hexToHSL(b.successColor));
                }
                if (b.destructiveColor) {
                    root.style.setProperty("--destructive", hexToHSL(b.destructiveColor));
                }

                // ── Dark mode overrides (foreground uses navy) ──
                if (b.navyDark) {
                    root.style.setProperty("--foreground", hexToHSL(b.navyDark));
                    root.style.setProperty("--primary-foreground", hexToHSL(b.navyDark));
                    root.style.setProperty("--accent-foreground", hexToHSL(b.navyDark));
                }

                // ── Border radius ──
                if (b.borderRadius) {
                    root.style.setProperty("--radius", `${b.borderRadius}px`);
                }

                // ── Focus ring color (hardcoded in globals.css — override) ──
                if (b.primaryColor) {
                    // Update the focus outline & input border via a tiny <style> injection
                    const styleId = "branding-overrides";
                    let styleEl = document.getElementById(styleId);
                    if (!styleEl) {
                        styleEl = document.createElement("style");
                        styleEl.id = styleId;
                        document.head.appendChild(styleEl);
                    }
                    styleEl.textContent = `
                        *:focus-visible {
                            outline: 2px solid ${b.primaryColor} !important;
                        }
                        input:focus, textarea:focus, select:focus {
                            border-color: ${b.primaryColor} !important;
                            box-shadow: 0 0 0 3px ${b.primaryColor}1f !important;
                        }
                        ::-webkit-scrollbar-thumb {
                            background: ${b.navyDark ? lightenHex(b.navyDark, 45) : '#2E5480'};
                        }
                        ::-webkit-scrollbar-thumb:hover {
                            background: ${b.navyDark ? lightenHex(b.navyDark, 65) : '#5C8AB0'};
                        }
                    `;
                }

                console.log("✅ Branding loaded and applied globally");
            } catch (e) {
                // Silently fail — defaults from globals.css will be used
                console.log("ℹ️ Using default branding (API unavailable)");
            }
        })();
    }, []);

    return <>{children}</>;
}
