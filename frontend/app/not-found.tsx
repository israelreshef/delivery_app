import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, ArrowRight } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">
                <div className="space-y-4">
                    <h1 className="text-9xl font-black text-brand">404</h1>
                    <h2 className="text-2xl font-bold text-slate-800">העמוד לא נמצא</h2>
                    <p className="text-slate-500">
                        מצטערים, אבל העמוד שחיפשת לא קיים, הוסר או שהכתובת שגויה. בוא נחזור למסלול הנכון.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg" className="bg-brand hover:bg-brand/90 text-navy-950 font-bold">
                        <Link href="/">
                            <Home className="w-5 h-5 ml-2" />
                            חזרה לדף הבית
                        </Link>
                    </Button>

                    <Button asChild variant="outline" size="lg" className="font-bold">
                        <Link href="/contact">
                            צור קשר לתמיכה
                            <ArrowRight className="w-5 h-5 mr-2" />
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
