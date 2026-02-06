"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronLeft, Package, MapPin, CheckCircle, Truck, Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function NewOrderWizard() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [quoteLoading, setQuoteLoading] = useState(false);
    const [priceQuote, setPriceQuote] = useState<number | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        // Pickup Details
        pickup_city: "",
        pickup_street: "",
        pickup_number: "",
        pickup_floor: "",
        pickup_apartment: "",
        pickup_contact_name: "",
        pickup_contact_phone: "",
        pickup_notes: "",

        // Delivery Details
        delivery_city: "",
        delivery_street: "",
        delivery_number: "",
        delivery_floor: "",
        delivery_apartment: "",
        delivery_contact_name: "",
        delivery_contact_phone: "",
        delivery_notes: "",

        // Package Details
        package_description: "",
        package_weight: "",
        package_size: "medium",
        delivery_type: "standard",
        urgency: "standard",
        insurance_required: false,
        insurance_value: "",
    });

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Reset quote if critical fields change
        if (['package_size', 'urgency', 'delivery_type', 'insurance_required', 'insurance_value'].includes(field)) {
            setPriceQuote(null);
        }
    };

    const fetchQuote = async () => {
        setQuoteLoading(true);
        try {
            // Simulate API call for quote (or use real one if available)
            // In real world: api.post('/orders/calculate', { ... })

            // For now, mock calculation based on client side logical factors + API call if endpoint exists
            try {
                const res = await api.post('/orders/calculate', {
                    distance_km: 15, // Mock distance
                    package_size: formData.package_size,
                    urgency: formData.urgency,
                    delivery_type: formData.delivery_type,
                    insurance_value: formData.insurance_required ? formData.insurance_value : 0,
                    weight: formData.package_weight
                });
                setPriceQuote(res.data.price);
            } catch (e) {
                // Fallback if API fails
                setPriceQuote(150);
            }
        } catch (error) {
            console.error("Quote error", error);
        } finally {
            setQuoteLoading(false);
        }
    };

    const handleNext = async () => {
        // Validation for each step
        if (currentStep === 1) {
            if (!formData.pickup_city || !formData.pickup_street || !formData.pickup_contact_phone) {
                toast.error("אנא מלא את כל השדות החובה (עיר, רחוב, טלפון)");
                return;
            }
        } else if (currentStep === 2) {
            if (!formData.delivery_city || !formData.delivery_street || !formData.delivery_contact_phone) {
                toast.error("אנא מלא את כל השדות החובה (עיר, רחוב, טלפון)");
                return;
            }
        } else if (currentStep === 3) {
            if (!formData.package_description) {
                toast.error("אנא הזן תיאור חבילה");
                return;
            }
            // Trigger Quote on moving to step 4
            await fetchQuote();
        }

        setCurrentStep(prev => Math.min(prev + 1, 4));
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Prepare payload matching backend
            const payload = {
                sender: {
                    senderName: formData.pickup_contact_name,
                    senderPhone: formData.pickup_contact_phone,
                    senderAddress: {
                        city: formData.pickup_city,
                        street: formData.pickup_street,
                        number: formData.pickup_number,
                        floor: formData.pickup_floor,
                        apartment: formData.pickup_apartment,
                        notes: formData.pickup_notes
                    }
                },
                recipient: {
                    recipientName: formData.delivery_contact_name,
                    recipientPhone: formData.delivery_contact_phone,
                    recipientAddress: {
                        city: formData.delivery_city,
                        street: formData.delivery_street,
                        number: formData.delivery_number,
                        floor: formData.delivery_floor,
                        apartment: formData.delivery_apartment,
                        notes: formData.delivery_notes
                    }
                },
                package: {
                    packageContent: formData.package_description,
                    packageWeight: formData.package_weight,
                    packageSize: formData.package_size
                },
                service: {
                    deliveryType: formData.delivery_type,
                    urgency: formData.urgency,
                    insuranceRequired: formData.insurance_required,
                    insuranceValue: formData.insurance_value
                }
            };

            const res = await api.post('/orders', payload);

            toast.success("ההזמנה נוצרה בהצלחה!");
            // Redirect to the new tracking page
            if (res.data?.id) {
                router.push(`/customer/orders/${res.data.id}`);
            } else {
                router.push('/customer/dashboard');
            }

        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "שגיאה ביצירת הזמנה");
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { number: 1, title: "איסוף", icon: MapPin },
        { number: 2, title: "מסירה", icon: MapPin },
        { number: 3, title: "חבילה", icon: Package },
        { number: 4, title: "אישור", icon: CheckCircle }
    ];

    return (
        <div className="max-w-4xl mx-auto" dir="rtl">
            {/* Progress Steps */}
            <div className="mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center relative">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -z-10" />
                    {steps.map((step, index) => (
                        <div key={step.number} className="flex flex-col items-center bg-white px-2 cursor-default relative">
                            {/* Line Connector logic if needed more complex, but simple absolute line works behind */}
                            <div
                                className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 border-2",
                                    currentStep >= step.number
                                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                                        : "bg-white border-slate-200 text-slate-400"
                                )}
                            >
                                <step.icon className="w-5 h-5" />
                            </div>
                            <span className={cn(
                                "text-xs mt-2 font-bold transition-colors duration-300",
                                currentStep >= step.number ? "text-blue-700" : "text-slate-400"
                            )}>{step.title}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Form Content */}
            <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-xl text-slate-800 flex items-center gap-2">
                        {currentStep === 1 && <MapPin className="text-blue-500" />}
                        {currentStep === 2 && <MapPin className="text-green-500" />}
                        {currentStep === 3 && <Package className="text-purple-500" />}
                        {currentStep === 4 && <CheckCircle className="text-indigo-500" />}
                        {steps[currentStep - 1].title}
                    </CardTitle>
                    <CardDescription>
                        שלב {currentStep} מתוך 4: {
                            currentStep === 1 ? 'היכן לאסוף את המשלוח?' :
                                currentStep === 2 ? 'לאן המשלוח מגיע?' :
                                    currentStep === 3 ? 'מה אנחנו שולחים?' :
                                        'בדיקת פרטים ואישור'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6 md:p-8 space-y-6">
                    {/* Step 1: Pickup Details */}
                    {currentStep === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>עיר *</Label>
                                    <Input
                                        value={formData.pickup_city}
                                        onChange={(e) => updateField('pickup_city', e.target.value)}
                                        placeholder="תל אביב"
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>רחוב *</Label>
                                    <Input
                                        value={formData.pickup_street}
                                        onChange={(e) => updateField('pickup_street', e.target.value)}
                                        placeholder="דיזנגוף"
                                        className="h-11"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>מספר בית</Label>
                                    <Input
                                        value={formData.pickup_number}
                                        onChange={(e) => updateField('pickup_number', e.target.value)}
                                        placeholder="100"
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>קומה</Label>
                                    <Input
                                        value={formData.pickup_floor}
                                        onChange={(e) => updateField('pickup_floor', e.target.value)}
                                        placeholder="3"
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>דירה</Label>
                                    <Input
                                        value={formData.pickup_apartment}
                                        onChange={(e) => updateField('pickup_apartment', e.target.value)}
                                        placeholder="12"
                                        className="h-11"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>שם איש קשר</Label>
                                    <Input
                                        value={formData.pickup_contact_name}
                                        onChange={(e) => updateField('pickup_contact_name', e.target.value)}
                                        placeholder="ישראל ישראלי"
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>טלפון לאיסוף *</Label>
                                    <Input
                                        value={formData.pickup_contact_phone}
                                        onChange={(e) => updateField('pickup_contact_phone', e.target.value)}
                                        placeholder="050-1234567"
                                        className="h-11"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>הערות לשליח (קוד כניסה, הכוונה)</Label>
                                <Textarea
                                    value={formData.pickup_notes}
                                    onChange={(e) => updateField('pickup_notes', e.target.value)}
                                    placeholder="קוד כניסה 1234, להשאיר בלובי..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Delivery Details */}
                    {currentStep === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>השליח ינווט לכתובת זו לאחר האיסוף</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>עיר *</Label>
                                    <Input
                                        value={formData.delivery_city}
                                        onChange={(e) => updateField('delivery_city', e.target.value)}
                                        placeholder="ירושלים"
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>רחוב *</Label>
                                    <Input
                                        value={formData.delivery_street}
                                        onChange={(e) => updateField('delivery_street', e.target.value)}
                                        placeholder="יפו"
                                        className="h-11"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>מספר בית</Label>
                                    <Input
                                        value={formData.delivery_number}
                                        onChange={(e) => updateField('delivery_number', e.target.value)}
                                        placeholder="50"
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>קומה</Label>
                                    <Input
                                        value={formData.delivery_floor}
                                        onChange={(e) => updateField('delivery_floor', e.target.value)}
                                        placeholder="2"
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>דירה</Label>
                                    <Input
                                        value={formData.delivery_apartment}
                                        onChange={(e) => updateField('delivery_apartment', e.target.value)}
                                        placeholder="8"
                                        className="h-11"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>שם מקבל המשלוח *</Label>
                                    <Input
                                        value={formData.delivery_contact_name}
                                        onChange={(e) => updateField('delivery_contact_name', e.target.value)}
                                        placeholder="דוד כהן"
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>טלפון מקבל *</Label>
                                    <Input
                                        value={formData.delivery_contact_phone}
                                        onChange={(e) => updateField('delivery_contact_phone', e.target.value)}
                                        placeholder="052-9876543"
                                        className="h-11"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>הערות למסירה</Label>
                                <Textarea
                                    value={formData.delivery_notes}
                                    onChange={(e) => updateField('delivery_notes', e.target.value)}
                                    placeholder="נא למסור אישית, להתקשר לפני..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Package Details */}
                    {currentStep === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <Label>מה שולחים? (תיאור תכולה) *</Label>
                                <Input
                                    value={formData.package_description}
                                    onChange={(e) => updateField('package_description', e.target.value)}
                                    placeholder="מסמכים חשובים, מחשב נייד, מתנה..."
                                    className="h-11"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>גודל החבילה</Label>
                                    <Select value={formData.package_size} onValueChange={(val) => updateField('package_size', val)}>
                                        <SelectTrigger className="h-11">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="small">✉️ מעטפה / קטן (עד 1 ק"ג)</SelectItem>
                                            <SelectItem value="medium">📦 בינוני (עד 5 ק"ג)</SelectItem>
                                            <SelectItem value="large">🥡 גדול (עד 15 ק"ג)</SelectItem>
                                            <SelectItem value="huge">🚚 ענק (מעל 15 ק"ג)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>משקל מוערך (ק"ג)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={formData.package_weight}
                                        onChange={(e) => updateField('package_weight', e.target.value)}
                                        placeholder="1.5"
                                        className="h-11"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6"></div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-blue-600 font-bold">רמת דחיפות</Label>
                                    <Select value={formData.urgency} onValueChange={(val) => updateField('urgency', val)}>
                                        <SelectTrigger className="h-11 border-blue-200 bg-blue-50/50">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standard">רגיל - עד 4 שעות</SelectItem>
                                            <SelectItem value="urgent">דחוף - עד 90 דקות</SelectItem>
                                            <SelectItem value="same_day">מהיום להיום (עד 18:00)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>סוג שירות</Label>
                                    <Select value={formData.delivery_type} onValueChange={(val) => updateField('delivery_type', val)}>
                                        <SelectTrigger className="h-11">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standard">שליחות רגילה</SelectItem>
                                            <SelectItem value="legal_document">מסירה משפטית (עם אישור)</SelectItem>
                                            <SelectItem value="express">אקספרס (ישיר)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-lg flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="insurance"
                                    checked={formData.insurance_required}
                                    onChange={(e) => updateField('insurance_required', e.target.checked)}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                    <Label htmlFor="insurance" className="font-bold">ביטוח תכולה</Label>
                                    <p className="text-xs text-slate-500">מומלץ לחבילות יקרות ערך</p>
                                </div>
                            </div>

                            {formData.insurance_required && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label>שווי מוערך (₪)</Label>
                                    <Input
                                        type="number"
                                        value={formData.insurance_value}
                                        onChange={(e) => updateField('insurance_value', e.target.value)}
                                        placeholder="1000"
                                        className="h-11"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Confirmation & Quote */}
                    {currentStep === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Price Quote Banner */}
                            <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -mr-10 -mt-10"></div>
                                <div className="flex justify-between items-end relative z-10">
                                    <div>
                                        <p className="text-slate-400 text-sm font-medium mb-1">סה"כ לתשלום (מוערך)</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-black text-white">
                                                {quoteLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : `₪${priceQuote}`}
                                            </span>
                                            <span className="text-sm text-slate-400">כולל מע"מ</span>
                                        </div>
                                    </div>
                                    <Button variant="secondary" size="sm" onClick={fetchQuote}>
                                        <Calculator className="w-4 h-4 mr-1" /> חשב מחדש
                                    </Button>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-white border rounded-lg p-5 space-y-3">
                                    <div className="flex items-center gap-2 border-b pb-2 mb-2">
                                        <MapPin className="w-4 h-4 text-blue-500" />
                                        <h3 className="font-bold text-slate-800">איסוף</h3>
                                    </div>
                                    <p className="font-medium">{formData.pickup_city}, {formData.pickup_street} {formData.pickup_number}</p>
                                    <div className="text-sm text-slate-500 flex flex-col gap-1">
                                        <span>{formData.pickup_contact_name}</span>
                                        <span>{formData.pickup_contact_phone}</span>
                                    </div>
                                </div>

                                <div className="bg-white border rounded-lg p-5 space-y-3">
                                    <div className="flex items-center gap-2 border-b pb-2 mb-2">
                                        <MapPin className="w-4 h-4 text-green-500" />
                                        <h3 className="font-bold text-slate-800">מסירה</h3>
                                    </div>
                                    <p className="font-medium">{formData.delivery_city}, {formData.delivery_street} {formData.delivery_number}</p>
                                    <div className="text-sm text-slate-500 flex flex-col gap-1">
                                        <span>{formData.delivery_contact_name}</span>
                                        <span>{formData.delivery_contact_phone}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 border rounded-lg p-5">
                                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-2">
                                    <Package className="w-4 h-4 text-purple-500" />
                                    <h3 className="font-bold text-slate-800">פרטי משלוח</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-slate-500 block">תוכן:</span>
                                        <span className="font-medium">{formData.package_description}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block">סוג:</span>
                                        <span className="font-medium">
                                            {formData.delivery_type === 'standard' ? 'שליחות רגילה' : formData.delivery_type}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block">דחיפות:</span>
                                        <span className="font-medium">
                                            {formData.urgency === 'standard' ? 'רגיל' : formData.urgency === 'urgent' ? 'דחוף' : 'היום'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 block">ביטוח:</span>
                                        <span className="font-medium">
                                            {formData.insurance_required ? `כן (₪${formData.insurance_value})` : 'לא'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="bg-slate-50 border-t border-slate-100 p-6 flex justify-between">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={currentStep === 1}
                        className="text-slate-500 hover:text-slate-900"
                    >
                        <ChevronRight className="w-4 h-4 ml-2" />
                        חזור
                    </Button>

                    {currentStep < 4 ? (
                        <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 w-32">
                            המשך
                            <ChevronLeft className="w-4 h-4 mr-2" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-700 w-40 shadow-lg shadow-green-200">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "אשר ושלח הזמנה"}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
