import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 pt-20">
                {children}
            </main>
            <Footer />
        </div>
    );
}
