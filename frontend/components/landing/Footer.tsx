import Link from "next/link";
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";

export function Footer() {
    return (
        <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-white tracking-tight">TZIR</h3>
                        <p className="text-sm text-slate-400">
                            הפלטפורמה המובילה בישראל לניהול משלוחים חכם.
                            מחברים בין עסקים לשליחים, בקלות ובמהירות.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-bold text-white mb-4">מוצר</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/features" className="hover:text-blue-400">פיצ'רים</Link></li>
                            <li><Link href="/pricing" className="hover:text-blue-400">מחירון</Link></li>
                            <li><Link href="/api" className="hover:text-blue-400">API</Link></li>
                            <li><Link href="/integrations" className="hover:text-blue-400">אינטגרציות</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-white mb-4">חברה</h4>
                        <ul className="space-y-2 text-sm">
                            <li><Link href="/about" className="hover:text-blue-400">אודות</Link></li>
                            <li><Link href="/careers" className="hover:text-blue-400">דרושים</Link></li>
                            <li><Link href="/blog" className="hover:text-blue-400">בלוג</Link></li>
                            <li><Link href="/contact" className="hover:text-blue-400">צור קשר</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-white mb-4">עקבו אחרינו</h4>
                        <div className="flex gap-4">
                            <Link href="#" className="hover:text-blue-400 transition-colors"><Facebook className="w-5 h-5" /></Link>
                            <Link href="#" className="hover:text-pink-400 transition-colors"><Instagram className="w-5 h-5" /></Link>
                            <Link href="#" className="hover:text-blue-500 transition-colors"><Twitter className="w-5 h-5" /></Link>
                            <Link href="#" className="hover:text-blue-600 transition-colors"><Linkedin className="w-5 h-5" /></Link>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
                    © {new Date().getFullYear()} TZIR Delivery Systems. כל הזכויות שמורות.
                </div>
            </div>
        </footer>
    );
}
