"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronLeft, Package, MapPin, CheckCircle, AlertCircle, Loader2, ShoppingCart, CreditCard } from "lucide-react";
import MockPaymentForm from "@/components/orders/MockPaymentForm";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import { api } from "@/lib/api";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { ValidatedInput } from "@/components/ui/validated-input";
import {
    validatePhone,
    validateName,
    validateCity,
    validateStreet,
    validateBuildingNumber,
    validateFloor,
    validateApartment,
    formatPhone
} from "@/lib/validation";

interface OrderWizardProps {
    userType?: 'customer' | 'admin';
}

export default function OrderWizard({ userType = 'customer' }: OrderWizardProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

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
        pickup_lat: null as number | null,
        pickup_lng: null as number | null,

        // Delivery Details
        delivery_city: "",
        delivery_street: "",
        delivery_number: "",
        delivery_floor: "",
        delivery_apartment: "",
        delivery_contact_name: "",
        delivery_contact_phone: "",
        delivery_notes: "",
        delivery_lat: null as number | null,
        delivery_lng: null as number | null,

        // Package Details
        package_description: "",
        package_weight: "",
        package_size: "medium",
        delivery_type: "standard",
        urgency: "standard",
        insurance_required: false,
        insurance_value: "",
    });

    // Price quote state
    const [priceQuote, setPriceQuote] = useState<{
        price: number;
        distance_km: number;
        duration_mins: number;
    } | null>(null);
    const [quoteFetching, setQuoteFetching] = useState(false);
    const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
    const [createdOrderPrice, setCreatedOrderPrice] = useState<number>(0);

    // Validation errors state
    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateField = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // Validate field on blur
    const validateField = (field: string, value: string) => {
        let validation: { valid: boolean; message?: string } = { valid: true };

        switch (field) {
            case 'pickup_city':
            case 'delivery_city':
                validation = validateCity(value);
                break;
            case 'pickup_street':
            case 'delivery_street':
                validation = validateStreet(value);
                break;
            case 'pickup_number':
            case 'delivery_number':
                validation = validateBuildingNumber(value);
                break;
            case 'pickup_floor':
            case 'delivery_floor':
                validation = validateFloor(value);
                break;
            case 'pickup_apartment':
            case 'delivery_apartment':
                validation = validateApartment(value);
                break;
            case 'pickup_contact_name':
            case 'delivery_contact_name':
                validation = validateName(value);
                break;
            case 'pickup_contact_phone':
            case 'delivery_contact_phone':
                validation = validatePhone(value);
                break;
        }

        if (!validation.valid && validation.message) {
            setErrors(prev => ({ ...prev, [field]: validation.message! }));
        }
    };

    const handleNext = () => {
        const newErrors: Record<string, string> = {};

        // Validation for each step
        if (currentStep === 1) {
            // Validate pickup details
            const cityValidation = validateCity(formData.pickup_city);
            if (!cityValidation.valid) newErrors.pickup_city = cityValidation.message!;

            const streetValidation = validateStreet(formData.pickup_street);
            if (!streetValidation.valid) newErrors.pickup_street = streetValidation.message!;

            const phoneValidation = validatePhone(formData.pickup_contact_phone);
            if (!phoneValidation.valid) newErrors.pickup_contact_phone = phoneValidation.message!;

            if (formData.pickup_contact_name) {
                const nameValidation = validateName(formData.pickup_contact_name);
                if (!nameValidation.valid) newErrors.pickup_contact_name = nameValidation.message!;
            }

            if (formData.pickup_number) {
                const numberValidation = validateBuildingNumber(formData.pickup_number);
                if (!numberValidation.valid) newErrors.pickup_number = numberValidation.message!;
            }

        } else if (currentStep === 2) {
            // Validate delivery details
            const cityValidation = validateCity(formData.delivery_city);
            if (!cityValidation.valid) newErrors.delivery_city = cityValidation.message!;

            const streetValidation = validateStreet(formData.delivery_street);
            if (!streetValidation.valid) newErrors.delivery_street = streetValidation.message!;

            const phoneValidation = validatePhone(formData.delivery_contact_phone);
            if (!phoneValidation.valid) newErrors.delivery_contact_phone = phoneValidation.message!;

            const nameValidation = validateName(formData.delivery_contact_name);
            if (!nameValidation.valid) newErrors.delivery_contact_name = nameValidation.message!;

            if (formData.delivery_number) {
                const numberValidation = validateBuildingNumber(formData.delivery_number);
                if (!numberValidation.valid) newErrors.delivery_number = numberValidation.message!;
            }

        } else if (currentStep === 3) {
            if (!formData.package_description || formData.package_description.trim() === '') {
                newErrors.package_description = 'תיאור חבילה הוא שדה חובה';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error("אנא תקן את השגיאות בטופס");
            return;
        }

        const nextStep = Math.min(currentStep + 1, 5);
        setCurrentStep(nextStep);

        // Fetch price quote when reaching confirmation step
        if (nextStep === 4) {
            setQuoteFetching(true);
            setPriceQuote(null);

            // Client-side Haversine fallback
            const haversineFallback = () => {
                if (formData.pickup_lat && formData.pickup_lng && formData.delivery_lat && formData.delivery_lng) {
                    const R = 6371;
                    const dLat = (formData.delivery_lat - formData.pickup_lat) * Math.PI / 180;
                    const dLon = (formData.delivery_lng - formData.pickup_lng) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) ** 2 +
                        Math.cos(formData.pickup_lat * Math.PI / 180) * Math.cos(formData.delivery_lat * Math.PI / 180) *
                        Math.sin(dLon / 2) ** 2;
                    const c = 2 * Math.asin(Math.sqrt(a));
                    const dist = Math.round(R * c * 1.3 * 10) / 10; // ~road factor
                    const dur = Math.round(dist / 30 * 60);
                    // Use Israeli tiered pricing approximation
                    let price = 56.10;
                    if (dist > 6) price = 87.60;
                    if (dist > 12) price = 135.70;
                    if (dist > 22) price = 150.85;
                    if (dist > 25) price = 192.00;
                    if (dist > 36) price = 202.80;
                    if (dist > 44) price = 251.75;
                    if (dist > 59) price = 320.85;
                    if (dist > 79) price = 320.85 + (dist - 79) * 3.70;
                    setPriceQuote({ price, distance_km: dist, duration_mins: dur });
                }
                setQuoteFetching(false);
            };

            if (formData.pickup_lat && formData.pickup_lng && formData.delivery_lat && formData.delivery_lng) {
                api.post('/orders/quote', {
                    pickup_lat: formData.pickup_lat,
                    pickup_lng: formData.pickup_lng,
                    delivery_lat: formData.delivery_lat,
                    delivery_lng: formData.delivery_lng,
                }).then(res => {
                    if (res.data?.success) setPriceQuote(res.data);
                    else haversineFallback();
                }).catch(() => {
                    haversineFallback();
                }).finally(() => setQuoteFetching(false));
            } else {
                haversineFallback();
            }
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                pickup_address: {
                    city: formData.pickup_city,
                    street: formData.pickup_street,
                    number: formData.pickup_number,
                    floor: formData.pickup_floor,
                    apartment: formData.pickup_apartment,
                    notes: formData.pickup_notes,
                    lat: formData.pickup_lat,
                    lon: formData.pickup_lng,
                },
                pickup_contact_name: formData.pickup_contact_name,
                pickup_contact_phone: formData.pickup_contact_phone,
                delivery_address: {
                    city: formData.delivery_city,
                    street: formData.delivery_street,
                    number: formData.delivery_number,
                    floor: formData.delivery_floor,
                    apartment: formData.delivery_apartment,
                    notes: formData.delivery_notes,
                    lat: formData.delivery_lat,
                    lon: formData.delivery_lng,
                },
                recipient_name: formData.delivery_contact_name,
                recipient_phone: formData.delivery_contact_phone,
                package_description: formData.package_description,
                package_weight: parseFloat(formData.package_weight) || 1.0,
                package_size: formData.package_size,
                delivery_type: formData.delivery_type,
                urgency: formData.urgency,
                insurance_required: formData.insurance_required,
                insurance_value: formData.insurance_required ? parseFloat(formData.insurance_value) : 0
            };

            const res = await api.post('/orders', payload);

            if (res.data?.success) {
                setCreatedOrderId(res.data.id);
                setCreatedOrderPrice(res.data.price || priceQuote?.price || 0);
                toast.success("ההזמנה נוצרה! ממשיך לתשלום...");
                setCurrentStep(5);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "שגיאה ביצירת הזמנה");
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { number: 1, title: "פרטי איסוף", icon: MapPin },
        { number: 2, title: "פרטי מקבל", icon: MapPin },
        { number: 3, title: "פרטי חבילה", icon: Package },
        { number: 4, title: "סיכום", icon: CheckCircle },
        { number: 5, title: "תשלום", icon: CreditCard }
    ];

    return (
        <div className="max-w-4xl mx-auto p-6" dir="rtl">
            {/* Progress Steps */}
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    {steps.map((step, index) => (
                        <div key={step.number} className="flex items-center flex-1">
                            <div className="flex flex-col items-center flex-1">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${currentStep >= step.number
                                    ? 'bg-brand text-white'
                                    : 'bg-gray-200 text-gray-500'
                                    }`}>
                                    <step.icon className="w-6 h-6" />
                                </div>
                                <span className="text-sm mt-2 font-medium">{step.title}</span>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`h-1 flex-1 mx-2 ${currentStep > step.number ? 'bg-brand' : 'bg-gray-200'
                                    }`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Form Content */}
            <Card>
                <CardHeader>
                    <CardTitle>{steps[currentStep - 1].title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Step 1: Pickup Details */}
                    {currentStep === 1 && (
                        <>
                            <div className="space-y-2">
                                <Label>חפש כתובת איסוף *</Label>
                                <AddressAutocomplete
                                    value={formData.pickup_street ? `${formData.pickup_street}${formData.pickup_number ? ' ' + formData.pickup_number : ''}, ${formData.pickup_city}` : ''}
                                    onChange={() => { }}
                                    placeholder="הקלד כתובת... (למשל: דיזנגוף 100 תל אביב)"
                                    onSelectAddress={(addr) => {
                                        updateField('pickup_city', addr.city || '');
                                        updateField('pickup_street', addr.street || '');
                                        updateField('pickup_number', addr.number || '');
                                        if (addr.lat != null) updateField('pickup_lat', addr.lat);
                                        if (addr.lng != null) updateField('pickup_lng', addr.lng);
                                    }}
                                    error={errors.pickup_city || errors.pickup_street}
                                />
                            </div>
                            {formData.pickup_city && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm space-y-1 animate-in fade-in duration-200">
                                    <div className="font-medium text-green-800">📍 כתובת שנבחרה:</div>
                                    <div className="text-green-700">{formData.pickup_street} {formData.pickup_number}, {formData.pickup_city}</div>
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label>מספר בית</Label>
                                    <Input
                                        value={formData.pickup_number}
                                        onChange={(e) => updateField('pickup_number', e.target.value)}
                                        placeholder="100"
                                    />
                                </div>
                                <div>
                                    <Label>קומה</Label>
                                    <Input
                                        value={formData.pickup_floor}
                                        onChange={(e) => updateField('pickup_floor', e.target.value)}
                                        placeholder="3"
                                    />
                                </div>
                                <div>
                                    <Label>דירה</Label>
                                    <Input
                                        value={formData.pickup_apartment}
                                        onChange={(e) => updateField('pickup_apartment', e.target.value)}
                                        placeholder="12"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <ValidatedInput
                                    label="שם איש קשר"
                                    value={formData.pickup_contact_name}
                                    onChange={(val) => updateField('pickup_contact_name', val)}
                                    onBlur={(val) => validateField('pickup_contact_name', val)}
                                    error={errors.pickup_contact_name}
                                    placeholder="ישראל ישראלי"
                                />
                                <ValidatedInput
                                    label="טלפון"
                                    value={formData.pickup_contact_phone}
                                    onChange={(val) => updateField('pickup_contact_phone', val)}
                                    onBlur={(val) => {
                                        validateField('pickup_contact_phone', val);
                                        if (val) updateField('pickup_contact_phone', formatPhone(val));
                                    }}
                                    error={errors.pickup_contact_phone}
                                    placeholder="050-1234567"
                                    required
                                />
                            </div>
                            <div>
                                <Label>הערות</Label>
                                <Textarea
                                    value={formData.pickup_notes}
                                    onChange={(e) => updateField('pickup_notes', e.target.value)}
                                    placeholder="קוד כניסה, הנחיות מיוחדות..."
                                    rows={3}
                                />
                            </div>
                        </>
                    )}

                    {currentStep === 2 && (
                        <>
                            <div className="space-y-2">
                                <Label>חפש כתובת מסירה *</Label>
                                <AddressAutocomplete
                                    value={formData.delivery_street ? `${formData.delivery_street}${formData.delivery_number ? ' ' + formData.delivery_number : ''}, ${formData.delivery_city}` : ''}
                                    onChange={() => { }}
                                    placeholder="הקלד כתובת... (למשל: יפו 50 ירושלים)"
                                    onSelectAddress={(addr) => {
                                        updateField('delivery_city', addr.city || '');
                                        updateField('delivery_street', addr.street || '');
                                        updateField('delivery_number', addr.number || '');
                                        if (addr.lat != null) updateField('delivery_lat', addr.lat);
                                        if (addr.lng != null) updateField('delivery_lng', addr.lng);
                                    }}
                                    error={errors.delivery_city || errors.delivery_street}
                                />
                            </div>
                            {formData.delivery_city && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm space-y-1 animate-in fade-in duration-200">
                                    <div className="font-medium text-green-800">📍 כתובת שנבחרה:</div>
                                    <div className="text-green-700">{formData.delivery_street} {formData.delivery_number}, {formData.delivery_city}</div>
                                </div>
                            )}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label>מספר בית</Label>
                                    <Input
                                        value={formData.delivery_number}
                                        onChange={(e) => updateField('delivery_number', e.target.value)}
                                        placeholder="50"
                                    />
                                </div>
                                <div>
                                    <Label>קומה</Label>
                                    <Input
                                        value={formData.delivery_floor}
                                        onChange={(e) => updateField('delivery_floor', e.target.value)}
                                        placeholder="2"
                                    />
                                </div>
                                <div>
                                    <Label>דירה</Label>
                                    <Input
                                        value={formData.delivery_apartment}
                                        onChange={(e) => updateField('delivery_apartment', e.target.value)}
                                        placeholder="8"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <ValidatedInput
                                    label="שם מקבל"
                                    value={formData.delivery_contact_name}
                                    onChange={(val) => updateField('delivery_contact_name', val)}
                                    onBlur={(val) => validateField('delivery_contact_name', val)}
                                    error={errors.delivery_contact_name}
                                    placeholder="דוד כהן"
                                    required
                                />
                                <ValidatedInput
                                    label="טלפון מקבל"
                                    value={formData.delivery_contact_phone}
                                    onChange={(val) => updateField('delivery_contact_phone', val)}
                                    onBlur={(val) => {
                                        validateField('delivery_contact_phone', val);
                                        if (val) updateField('delivery_contact_phone', formatPhone(val));
                                    }}
                                    error={errors.delivery_contact_phone}
                                    placeholder="052-9876543"
                                    required
                                />
                            </div>
                            <div>
                                <Label>הערות</Label>
                                <Textarea
                                    value={formData.delivery_notes}
                                    onChange={(e) => updateField('delivery_notes', e.target.value)}
                                    placeholder="הנחיות למסירה..."
                                    rows={3}
                                />
                            </div>
                        </>
                    )}

                    {/* Step 3: Package Details */}
                    {currentStep === 3 && (
                        <>
                            <div>
                                <Label>תיאור חבילה *</Label>
                                <Input
                                    value={formData.package_description}
                                    onChange={(e) => updateField('package_description', e.target.value)}
                                    placeholder="מסמכים, בגדים, אלקטרוניקה..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>משקל (ק"ג)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={formData.package_weight}
                                        onChange={(e) => updateField('package_weight', e.target.value)}
                                        placeholder="1.5"
                                    />
                                </div>
                                <div>
                                    <Label>גודל חבילה</Label>
                                    <Select value={formData.package_size} onValueChange={(val) => updateField('package_size', val)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="small">קטן (עד 30x30x30 ס"מ)</SelectItem>
                                            <SelectItem value="medium">בינוני (עד 60x60x60 ס"מ)</SelectItem>
                                            <SelectItem value="large">גדול (מעל 60x60x60 ס"מ)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>סוג משלוח</Label>
                                    <Select value={formData.delivery_type} onValueChange={(val) => updateField('delivery_type', val)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standard">רגיל</SelectItem>
                                            <SelectItem value="express">אקספרס</SelectItem>
                                            <SelectItem value="legal_document">מסמך משפטי</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>דחיפות</Label>
                                    <Select value={formData.urgency} onValueChange={(val) => updateField('urgency', val)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standard">רגיל</SelectItem>
                                            <SelectItem value="urgent">דחוף</SelectItem>
                                            <SelectItem value="same_day">היום</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="insurance"
                                    checked={formData.insurance_required}
                                    onChange={(e) => updateField('insurance_required', e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <Label htmlFor="insurance">ביטוח משלוח</Label>
                            </div>
                            {formData.insurance_required && (
                                <div>
                                    <Label>ערך מבוטח (₪)</Label>
                                    <Input
                                        type="number"
                                        value={formData.insurance_value}
                                        onChange={(e) => updateField('insurance_value', e.target.value)}
                                        placeholder="1000"
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* Step 4: Confirmation */}
                    {currentStep === 4 && (
                        <div className="space-y-6">
                            <div className="bg-brand/10 p-4 rounded-lg">
                                <h3 className="font-bold mb-2">📍 פרטי איסוף</h3>
                                <p>{formData.pickup_city}, {formData.pickup_street} {formData.pickup_number}</p>
                                <p className="text-sm text-gray-600">{formData.pickup_contact_name} • {formData.pickup_contact_phone}</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <h3 className="font-bold mb-2">🏠 פרטי מסירה</h3>
                                <p>{formData.delivery_city}, {formData.delivery_street} {formData.delivery_number}</p>
                                <p className="text-sm text-gray-600">{formData.delivery_contact_name} • {formData.delivery_contact_phone}</p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <h3 className="font-bold mb-2">📦 פרטי חבילה</h3>
                                <p>{formData.package_description}</p>
                                <p className="text-sm text-gray-600">
                                    {formData.package_weight && `${formData.package_weight} ק"ג`} • {formData.package_size} • {formData.delivery_type}
                                </p>
                            </div>

                            {/* Price Quote */}
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
                                <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                                    <ShoppingCart className="w-5 h-5" />
                                    הצעת מחיר
                                </h3>
                                {quoteFetching ? (
                                    <div className="flex items-center gap-2 text-amber-700">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        מחשב מחיר...
                                    </div>
                                ) : priceQuote ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm text-amber-700">
                                            <span>מרחק משוער</span>
                                            <span className="font-medium">{priceQuote.distance_km.toFixed(1)} ק"מ</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-amber-700">
                                            <span>זמן נסיעה משוער</span>
                                            <span className="font-medium">{Math.round(priceQuote.duration_mins)} דקות</span>
                                        </div>
                                        <div className="border-t border-amber-200 pt-2 mt-2 flex justify-between items-baseline">
                                            <span className="font-bold text-amber-900 text-lg">סה"כ לתשלום (כולל מע"מ)</span>
                                            <span className="font-black text-2xl text-amber-600">₪{priceQuote.price.toFixed(2)}</span>
                                        </div>
                                        <p className="text-xs text-amber-600 mt-1">* המחיר הסופי עשוי להשתנות בהתאם לתנאי הדרך</p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-amber-700">
                                        {formData.pickup_lat && formData.delivery_lat
                                            ? "לא ניתן לחשב מחיר כרגע. המחיר יוצג לאחר שיוקצה שליח."
                                            : "לחישוב מחיר, בחר כתובות מרשימת ההצעות של גוגל. המחיר יוצג לאחר שיוקצה שליח."}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 5: Payment */}
                    {currentStep === 5 && createdOrderId && (
                        <MockPaymentForm
                            amount={createdOrderPrice}
                            orderId={createdOrderId}
                            onSuccess={() => {
                                if (userType === 'admin') {
                                    router.push('/admin/orders');
                                } else {
                                    router.push('/customer/deliveries');
                                }
                            }}
                            onCancel={() => {
                                if (userType === 'admin') {
                                    router.push('/admin/orders');
                                } else {
                                    router.push('/customer/deliveries');
                                }
                            }}
                        />
                    )}

                    {/* Navigation Buttons */}
                    {currentStep < 5 && (
                    <div className="flex justify-between pt-6 border-t">
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            disabled={currentStep === 1}
                        >
                            <ChevronRight className="w-4 h-4 ml-2" />
                            חזור
                        </Button>

                        {currentStep < 4 ? (
                            <Button onClick={handleNext}>
                                המשך
                                <ChevronLeft className="w-4 h-4 mr-2" />
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={loading}>
                                {loading ? "שולח..." : "אשר ושלח הזמנה"}
                            </Button>
                        )}
                    </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
