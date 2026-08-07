import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: 'var(--brand)',
                    dark: 'var(--brand-dark)',
                    light: 'var(--brand-light)',
                    dim: 'var(--brand-dim)',
                    glow: 'var(--brand-glow)',
                },
                navy: {
                    950: 'var(--navy-950)',
                    900: 'var(--navy-900)',
                    800: 'var(--navy-800)',
                    700: 'var(--navy-700)',
                    600: 'var(--navy-600)',
                    400: 'var(--navy-400)',
                    500: 'var(--navy-500)',
                    300: 'var(--navy-300)',
                    200: 'var(--navy-200)',
                    100: 'var(--navy-100)',
                },
                success: 'hsl(var(--success))',
                warning: '#D97706',
                error: 'hsl(var(--destructive))',
                info: '#145DDB',
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            borderRadius: {
                DEFAULT: 'var(--radius)',
                sm: '7px',
                md: 'var(--radius)',
                lg: '14px',
                xl: '18px',
            },
            boxShadow: {
                'brand': '0 4px 14px color-mix(in srgb, var(--brand) 30%, transparent)',
                'brand-lg': '0 8px 28px color-mix(in srgb, var(--brand) 25%, transparent)',
                'navy': '0 4px 20px rgba(7,22,44,0.12)',
            },
            fontFamily: {
                sans: ['var(--font-heebo)', 'Heebo', 'system-ui', 'sans-serif'],
                mono: ['var(--font-mono)', 'monospace'],
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
        },
    },
    plugins: [],
};
export default config;
