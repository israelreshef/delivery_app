"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Package, CheckCircle, ChevronLeft, ChevronRight, Loader2, Mail, Bike, Car } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

const packageSizes = [
    { value: "small", label: "קטן", desc: "מעטפה / עד 2 ק\"ג", icon: Mail, color: "border-blue-200 bg-blue-50 text-blue-700", active: "border-blue-500 bg-blue-100 ring-2 ring-blue-500/30" },
    { value: "medium", label: "בינוני", desc: "קופסה / עד 10 ק\"ג", icon: Bike, color: "border-amber-200 bg-amber-50 text-amber-700", active: "border-amber-500 bg-amber-100 ring-2 ring-amber-500/30" },
    { value: "large", label: "גדול", desc: "ארגז / מעל 10 ק\"ג", icon: Car, color: "border-purple-200 bg-purple-50 text-purple-700", active: "border-purple-500 bg-purple-100 ring-2 ring-purple-500/30" },
];

export default function NewOrderWizard() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [priceQuote, setPriceQuote] = useState<number | null>(null);

    const [form, setForm] = useState({
        // Pickup
        pickup_display: "",    // what the user sees in the input
        pickup_city: "",
        pickup_street: "",
        pickup_number: "",
        pickup_phone: "",
        pickup_lat: 0,
        pickup_lng: 0,
        // Delivery
        delivery_display: "",
        delivery_city: "",
        delivery_street: "",
        delivery_number: "",
        delivery_name: "",
        delivery_phone: "",
        delivery_lat: 0,
        delivery_lng: 0,
        // Package
        package_description: "",
        package_size: "medium",
        notes: "",
    });

    const set = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (field === "package_size") setPriceQuote(null);
    };

    const onPickupChange = useCallback((val: string) => {
        setForm(prev => ({ ...prev, pickup_display: val }));
    }, []);

    const onPickupSelect = useCallback((addr: any) => {
        setForm(prev => ({
            ...prev,
            pickup_display: addr.full_address,
            pickup_city: addr.city || "",
            pickup_street: addr.street || "",
            pickup_number: addr.number || "",
            pickup_lat: addr.lat || 0,
            pickup_lng: addr.lng || 0,
        }));
    }, []);

    const onDeliveryChange = useCallback((val: string) => {
        setForm(prev => ({ ...prev, delivery_display: val }));
    }, []);

    const onDeliverySelect = useCallback((addr: any) => {
        setForm(prev => ({
            ...prev,
            delivery_display: addr.full_address,
            delivery_city: addr.city || "",
            delivery_street: addr.street || "",
            delivery_number: addr.number || "",
            delivery_lat: addr.lat || 0,
            delivery_lng: addr.lng || 0,
        }));
    }, []);

    const goToStep2 = () => {
        if (!form.pickup_display) {
            toast.error("נא להזין כתובת איסוף"); return;
        }
        if (!form.pickup_phone) {
            toast.error("נא להזין טלפון לאיסוף"); return;
        }
        setStep(2);
    };

    const goToStep3 = () => {
        if (!form.delivery_display) {
            toast.error("נא להזין כתובת מסירה"); return;
        }
        if (!form.delivery_phone) {
            toast.error("נא להזין טלפון מקבל"); return;
        }
        setStep(3);
        fetchQuote();
    };

    const fetchQuote = async () => {
        setQuoteLoading(true);

        let distance = 15; // default fallback
        if (form.pickup_lat && form.delivery_lat) {
            const R = 6371;
            const dLat = (form.delivery_lat - form.pickup_lat) * (Math.PI / 180);
            const dLon = (form.delivery_lng - form.pickup_lng) * (Math.PI / 180);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(form.pickup_lat * (Math.PI / 180)) * Math.cos(form.delivery_lat * (Math.PI / 180)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            distance = R * c;
        }

        try {
            const res = await api.post("/orders/calculate", {
                distance_km: Math.max(1, Math.round(distance)),
                package_size: form.package_size,
                urgency: "standard",
                delivery_type: "standard",
                insurance_value: 0,
                weight: form.package_size === "small" ? 1 : form.package_size === "medium" ? 5 : 15,
            });
            setPriceQuote(res.data.price);
        } catch {
            setPriceQuote(49);
        } finally {
            setQuoteLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!form.package_description) {
            toast.error("נא לתאר את תוכן החבילה"); return;
        }
        setLoading(true);
        try {
            // SmartBee Placeholder
            toast.loading("מעביר לתשלום דרך SmartBee...", { id: "payment" });
            await new Promise(r => setTimeout(r, 1500));
            toast.success("התשלום בוצע בהצלחה", { id: "payment" });

            const payload = {
                sender: {
                    senderName: "",
                    senderPhone: form.pickup_phone,
                    senderAddress: {
                        city: form.pickup_city || form.pickup_display,
                        street: form.pickup_street || form.pickup_display,
                        number: form.pickup_number,
                    },
                },
                recipient: {
                    recipientName: form.delivery_name,
                    recipientPhone: form.delivery_phone,
                    recipientAddress: {
                        city: form.delivery_city || form.delivery_display,
                        street: form.delivery_street || form.delivery_display,
                        number: form.delivery_number,
                    },
                },
                package: {
                    packageContent: form.package_description,
                    packageSize: form.package_size,
                    packageWeight: form.package_size === "small" ? 1 : form.package_size === "medium" ? 5 : 15,
                },
                service: {
                    deliveryType: "standard",
                    urgency: "standard",
                },
                notes: form.notes,
            };

            const res = await api.post("/orders/create", payload);
            toast.success("ההזמנה נוצרה בהצלחה!");
            if (res.data?.id) {
                router.push(`/customer/orders/${res.data.id}`);
            } else {
                router.push("/customer/orders");
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "שגיאה ביצירת הזמנה");
        } finally {
            setLoading(false);
        }
    };

    // Summary helpers
    const pickupSummary = form.pickup_city
        ? `${form.pickup_street} ${form.pickup_number}, ${form.pickup_city}`
        : form.pickup_display;
    const deliverySummary = form.delivery_city
        ? `${form.delivery_street} ${form.delivery_number}, ${form.delivery_city}`
        : form.delivery_display;

    return (
        <div className="max-w-2xl mx-auto" dir="rtl">

            {/* Minimal Step Indicator */}
            <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
                {[
                    { n: 1, label: "איסוף", icon: MapPin },
                    { n: 2, label: "יעד", icon: MapPin },
                    { n: 3, label: "חבילה", icon: Package },
                ].map((s) => (
                    <button
                        key={s.n}
                        onClick={() => s.n < step && setStep(s.n)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-200 whitespace-nowrap",
                            step === s.n
                                ? "bg-brand text-navy-950 shadow-lg shadow-brand/25 ring-2 ring-brand ring-offset-2"
                                : step > s.n
                                    ? "bg-green-100 text-green-700 cursor-pointer hover:bg-green-200"
                                    : "bg-slate-100 text-slate-400 cursor-default"
                        )}
                    >
                        {step > s.n ? <CheckCircle className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                        {s.label}
                    </button>
                ))}
            </div>

            {/* ═════════════ STEP 1: Addresses ═════════════ */}
            {step === 1 && (
                <Card className="border-none shadow-xl shadow-slate-200/50 animate-in fade-in slide-in-from-right-4 duration-300">
                    <CardContent className="p-6 md:p-8 space-y-8">

                        {/* Pickup */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-brand/15 flex items-center justify-center">
                                    <MapPin className="w-4 h-4 text-brand" />
                                </div>
                                <h2 className="text-lg font-black text-slate-900">מאיפה לאסוף?</h2>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-500">כתובת איסוף *</Label>
                                <AddressAutocomplete
                                    value={form.pickup_display}
                                    onChange={onPickupChange}
                                    onSelectAddress={onPickupSelect}
                                    placeholder="הקלד כתובת... (דיזנגוף 100, תל אביב)"
                                    className="mt-1"
                                />
                            </div>

                            {form.pickup_city && (
                                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 animate-in fade-in duration-200 flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    {form.pickup_street} {form.pickup_number}, {form.pickup_city}
                                </div>
                            )}

                            <div>
                                <Label className="text-xs text-slate-500">טלפון לאיסוף *</Label>
                                <Input
                                    value={form.pickup_phone}
                                    onChange={(e) => set("pickup_phone", e.target.value)}
                                    placeholder="050-1234567"
                                    className="h-11 mt-1"
                                    type="tel"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">המספר משמש רק לעדכוני סטטוס של השליח.</p>
                            </div>
                        </section>
                    </CardContent>

                    <CardFooter className="bg-slate-50 border-t border-slate-100 p-5 flex justify-end">
                        <Button onClick={goToStep2} className="bg-brand hover:bg-amber-600 text-navy-950 font-bold w-36 h-11 gap-2">
                            המשך ליעד
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* ═════════════ STEP 2: Delivery ═════════════ */}
            {step === 2 && (
                <Card className="border-none shadow-xl shadow-slate-200/50 animate-in fade-in slide-in-from-right-4 duration-300">
                    <CardContent className="p-6 md:p-8 space-y-8">
                        <section className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                    <MapPin className="w-4 h-4 text-green-600" />
                                </div>
                                <h2 className="text-lg font-black text-slate-900">לאן למסור?</h2>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-500">כתובת מסירה *</Label>
                                <AddressAutocomplete
                                    value={form.delivery_display}
                                    onChange={onDeliveryChange}
                                    onSelectAddress={onDeliverySelect}
                                    placeholder="הקלד כתובת... (יפו 50, ירושלים)"
                                    className="mt-1"
                                />
                            </div>

                            {form.delivery_city && (
                                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 animate-in fade-in duration-200 flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    {form.delivery_street} {form.delivery_number}, {form.delivery_city}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs text-slate-500">שם מקבל</Label>
                                    <Input
                                        value={form.delivery_name}
                                        onChange={(e) => set("delivery_name", e.target.value)}
                                        placeholder="ישראל ישראלי"
                                        className="h-11 mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">טלפון מקבל *</Label>
                                    <Input
                                        value={form.delivery_phone}
                                        onChange={(e) => set("delivery_phone", e.target.value)}
                                        placeholder="052-9876543"
                                        className="h-11 mt-1"
                                        type="tel"
                                    />
                                </div>
                            </div>
                        </section>
                    </CardContent>

                    <CardFooter className="bg-slate-50 border-t border-slate-100 p-5 flex justify-between">
                        <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-900 gap-2">
                            <ChevronRight className="w-4 h-4" /> חזור
                        </Button>
                        <Button onClick={goToStep3} className="bg-brand hover:bg-amber-600 text-navy-950 font-bold w-36 h-11 gap-2">
                            המשך לחבילה
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                    </CardFooter>
                </Card>
            )}


            {/* ═════════════ STEP 3: Package + Confirm ═════════════ */}
            {
                step === 3 && (
                    <Card className="border-none shadow-xl shadow-slate-200/50 animate-in fade-in slide-in-from-right-4 duration-300">
                        <CardContent className="p-6 md:p-8 space-y-6">

                            {/* Package Size Visual Cards */}
                            <div>
                                <Label className="text-sm font-bold text-slate-700 mb-3 block">גודל החבילה</Label>
                                <div className="grid grid-cols-3 gap-3">
                                    {packageSizes.map((pkg) => {
                                        const isActive = form.package_size === pkg.value;
                                        const Icon = pkg.icon;
                                        return (
                                            <button
                                                key={pkg.value}
                                                onClick={() => { set("package_size", pkg.value); fetchQuote(); }}
                                                className={cn(
                                                    "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer",
                                                    isActive ? pkg.active : pkg.color + " hover:scale-[1.02]"
                                                )}
                                            >
                                                <Icon className="w-7 h-7" />
                                                <span className="font-black text-sm">{pkg.label}</span>
                                                <span className="text-[11px] opacity-70 leading-tight text-center">{pkg.desc}</span>
                                                {isActive && (
                                                    <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Package Description */}
                            <div>
                                <Label className="text-xs text-slate-500">מה שולחים? *</Label>
                                <Input
                                    value={form.package_description}
                                    onChange={(e) => set("package_description", e.target.value)}
                                    placeholder="מסמכים, מתנה, מחשב נייד..."
                                    className="h-11 mt-1"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <Label className="text-xs text-slate-500">הערות לשליח (אופציונלי)</Label>
                                <Textarea
                                    value={form.notes}
                                    onChange={(e) => set("notes", e.target.value)}
                                    placeholder="קוד כניסה, קומה, כל מה שחשוב..."
                                    rows={2}
                                    className="mt-1 resize-none"
                                />
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-200" />

                            {/* Summary + Price */}
                            <div className="bg-slate-900 text-white rounded-xl p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-400">סיכום הזמנה</span>
                                    <div className="flex items-baseline gap-1">
                                        {quoteLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-brand" />
                                        ) : (
                                            <>
                                                <span className="text-3xl font-black text-white">₪{priceQuote || "—"}</span>
                                                <span className="text-xs text-slate-400">כולל מע&quot;מ</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="bg-white/10 rounded-lg p-3">
                                        <div className="text-slate-400 text-xs mb-1">איסוף</div>
                                        <div className="font-medium truncate">{pickupSummary}</div>
                                    </div>
                                    <div className="bg-white/10 rounded-lg p-3">
                                        <div className="text-slate-400 text-xs mb-1">מסירה</div>
                                        <div className="font-medium truncate">{deliverySummary}</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="bg-slate-50 border-t border-slate-100 p-5 flex justify-between">
                            <Button variant="ghost" onClick={() => setStep(2)} className="text-slate-500 hover:text-slate-900 gap-2">
                                <ChevronRight className="w-4 h-4" />
                                חזור
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold w-44 h-11 shadow-lg shadow-green-200 gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                    <>
                                        <CheckCircle className="w-4 h-4" />
                                        אשר ושלח הזמנה
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                )
            }

            {/* Trust Indicators */}
            <div className="mt-8 flex justify-center gap-6 opacity-60 text-xs text-slate-500 pb-12">
                <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> תשלום מאובטח</span>
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> מעקב בזמן אמת</span>
                <span className="flex items-center gap-1"><Bike className="w-3.5 h-3.5" /> שליחים מאומתים</span>
            </div>
        </div >
    );
}
