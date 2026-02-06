import type { Metadata } from 'next'
import { Assistant } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'
import { Toaster } from 'sonner'
import StructuredData from '@/components/seo/StructuredData'
import ChatWindow from '@/components/chat/ChatWindow';
import { PrivacyConsentModal } from '@/components/privacy/PrivacyConsentModal';

const assistant = Assistant({ subsets: ['hebrew', 'latin'] })

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
                url: '/og-image.jpg', // You should create this image later
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
        <html lang="he" dir="rtl">
            <body className={assistant.className}>
                <Providers>
                    <StructuredData />
                    <div className="min-h-screen bg-background font-sans antialiased">
                        <main className="container mx-auto max-w-7xl px-4 py-6">
                            {children}
                        </main>
                    </div>
                    <ChatWindow />
                    <PrivacyConsentModal />
                </Providers>
                <Toaster />
            </body>
        </html>
    )
}
