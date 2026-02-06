import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";
import { API_URL, auth } from "@/lib/auth";

export default function ConsentModal() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            // Check if user has accepted terms (if field is missing/null)
            const needsConsent = !user.terms_accepted_at || !user.privacy_policy_accepted_at;
            setOpen(needsConsent);
        }
    }, [user]);

    const handleSubmit = async () => {
        if (!termsAccepted || !privacyAccepted) return;

        setLoading(true);
        try {
            const token = auth.getToken();
            const res = await fetch(`${API_URL}/api/auth/consent`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    terms_accepted: true,
                    privacy_policy_accepted: true
                })
            });

            if (res.ok) {
                // Close modal and update user state without reload
                setOpen(false);
                // The AuthContext will handle updating the user state
            } else {
                if (res.status === 401) {
                    auth.clearSession();
                    window.location.href = '/login';
                    return;
                }
                console.error("Failed to update consent", await res.text());
            }
        } catch (error) {
            console.error("Failed to update consent", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="text-right">עדכון תנאי שימוש ופרטיות</DialogTitle>
                    <DialogDescription className="text-right sr-only">
                        אנא אשר את תנאי השימוש ומדיניות הפרטיות כדי להמשיך להשתמש באפליקציה.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4 text-right" dir="rtl">
                    <p className="text-sm text-muted-foreground">
                        כדי להמשיך להשתמש באפליקציה, עליך לאשר את תנאי השימוש ומדיניות הפרטיות המעודכנים שלנו (בהתאם לתקנות הגנת הפרטיות 2017).
                    </p>

                    <ScrollArea className="h-[200px] w-full rounded-md border p-4 text-sm bg-slate-50">
                        <h4 className="font-bold mb-2">1. כללי</h4>
                        <p className="mb-2">השימוש באפליקציה מהווה הסכמה לתנאים אלו. אנו אוספים מידע כגון מיקום, פרטי קשר ונתוני שימוש לצורך אספקת השירות.</p>

                        <h4 className="font-bold mb-2">2. פרטיות (GDPR)</h4>
                        <p className="mb-2">יש לך זכות לעיין במידע, לתקנו או לבקש את מחיקתו ("הזכות להישכח"). המידע נשמר על שרתים מאובטחים.</p>

                        <h4 className="font-bold mb-2">3. איסוף מיקום</h4>
                        <p>אפליקציית השליחים אוספת נתוני מיקום ברקע כדי לאפשר הקצאת משלוחים קרובים ומעקב בזמן אמת עבור הלקוח.</p>
                    </ScrollArea>

                    <div className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(c) => setTermsAccepted(!!c)} />
                        <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            קראתי ואני מאשר את תנאי השימוש
                        </Label>
                    </div>

                    <div className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox id="privacy" checked={privacyAccepted} onCheckedChange={(c) => setPrivacyAccepted(!!c)} />
                        <Label htmlFor="privacy" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            אני מסכים <a href="/privacy" target="_blank" className="text-blue-600 underline hover:text-blue-800">למדיניות הפרטיות</a> ולאיסוף נתוני מיקום
                        </Label>
                    </div>
                </div>

                <DialogFooter className="flex flex-row gap-2 sm:justify-between">
                    <Button
                        variant="outline"
                        onClick={() => {
                            auth.clearSession();
                            window.location.href = '/login';
                        }}
                        className="text-red-500 hover:bg-red-50"
                    >
                        התנתק (ינקה את המטמון)
                    </Button>
                    <Button
                        type="button"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleSubmit}
                        disabled={!termsAccepted || !privacyAccepted || loading}
                    >
                        {loading ? "מעדכן..." : "אשר והמשך"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
