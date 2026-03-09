"use client";

import Link from "next/link";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

const GenericPage = ({ title, desc }: { title: string, desc: string }) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
            <div className="bg-navy-950">
                <Header />
            </div>

            <main className="flex-1 flex flex-col items-center justify-center p-4 py-20">
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 max-w-3xl w-full text-center space-y-6">
                    <div className="inline-block px-4 py-1.5 bg-brand/10 text-brand rounded-full text-sm font-semibold">
                        בעבודה...
                    </div>
                    <h1 className="text-4xl font-bold text-navy-950">{title}</h1>
                    <p className="text-xl text-slate-500 max-w-xl mx-auto">
                        {desc}
                    </p>
                    <div className="pt-8">
                        <Link href="/" className="inline-flex items-center justify-center px-8 py-3 bg-navy-900 hover:bg-navy-800 text-white rounded-xl font-medium transition-colors">
                            חזרה לעמוד הבית
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default function FeaturesPage() {
    return <GenericPage title="הפיצ'רים שלנו" desc="עמוד המרכז את כל היכולות המתקדמות של הפלטפורמה, כולל מעקב בזמן אמת, אופטימיזציית מסלולים והוכחת מסירה אלקטרונית. בקרוב." />;
}
