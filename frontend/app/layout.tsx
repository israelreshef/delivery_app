import type { Metadata } from 'next'
import { Heebo } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'
import { Toaster } from 'sonner'
import StructuredData from '@/components/seo/StructuredData'
import ChatWindow from '@/components/chat/ChatWindow';
import { CookieBanner } from '@/components/CookieBanner';

const heebo = Heebo({
    subsets: ['latin', 'hebrew'],
    weight: ['300', '400', '500', '600', '700', '800', '900'],
    variable: '--font-heebo',
    display: 'swap',
})

export const metadata: Metadata = {
    title: {
        default: 'TZIR Delivery - מערכת משלוחים מתקדמת',
        template: '%s | TZIR'
    },
    description: 'מערכת ניהול משלוחים חכמה לעסקים, שליחים ולקוחות פרטיים. הכי מהיר, הכי בטוח.',
    keywords: ['משלוחים', 'שליחויות', 'ניהול צי רכב', 'TZIR', 'Delivery', 'Logistics', 'תל אביב'],
    authors: [{ name: 'TZIR Team' }],
    openGraph: {
        type: 'website',
        locale: 'he_IL',
        url: 'https://app.tzir.com',
        title: 'TZIR Delivery - המשלוח שלך בידיים טובות',
        description: 'הצטרפו למהפכת השליחויות של ישראל. מעקב בזמן אמת, הזמנה בקליק וניהול צי חכם.',
        siteName: 'TZIR Delivery',
        images: [
            {
                url: '/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'TZIR Delivery Platform',
            },
        ],
    },
    robots: {
        index: true,
        follow: true,
    }
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="he" dir="rtl" className={heebo.variable}>
            <head>
                <link rel="icon" href="/favicon.ico" sizes="any" />
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <link rel="apple-touch-icon" href="/apple-touch-icon-180.png" />
            </head>
            <body className={`${heebo.className} font-sans`}>
                <Providers>
                    <StructuredData />
                    <div className="flex h-screen w-full bg-background text-right font-sans">
                        <div className="flex-1 w-full min-w-0">
                            {children}
                        </div>
                    </div>
                    <ChatWindow />
                    <CookieBanner />
                </Providers>
                <Toaster />
            </body>
        </html>
    )
}
