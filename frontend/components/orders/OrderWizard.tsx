"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronRight, ChevronLeft, Package, MapPin, CheckCircle, AlertCircle } from "lucide-react";
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

        setCurrentStep(prev => Math.min(prev + 1, 4));
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Prepare payload
            const payload = {
                pickup_address: {
                    city: formData.pickup_city,
                    street: formData.pickup_street,
                    number: formData.pickup_number,
                    floor: formData.pickup_floor,
                    apartment: formData.pickup_apartment,
                    notes: formData.pickup_notes
                },
                delivery_address: {
                    city: formData.delivery_city,
                    street: formData.delivery_street,
                    number: formData.delivery_number,
                    floor: formData.delivery_floor,
                    apartment: formData.delivery_apartment,
                    notes: formData.delivery_notes
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

            toast.success("ההזמנה נוצרה בהצלחה!");

            // Redirect based on user type
            if (userType === 'admin') {
                router.push('/admin/orders');
            } else {
                router.push('/customer/deliveries');
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
        { number: 4, title: "אישור", icon: CheckCircle }
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
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-500'
                                    }`}>
                                    <step.icon className="w-6 h-6" />
                                </div>
                                <span className="text-sm mt-2 font-medium">{step.title}</span>
                            </div>
                            {index < steps.length - 1 && (
                                <div className={`h-1 flex-1 mx-2 ${currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>עיר *</Label>
                                    <AddressAutocomplete
                                        value={formData.pickup_city}
                                        onChange={(val) => updateField('pickup_city', val)}
                                        valueKey="city"
                                        placeholder="תל אביב"
                                        onSelectAddress={(addr) => {
                                            updateField('pickup_city', addr.city);
                                            updateField('pickup_street', addr.street); // Optional: Pre-fill street if user selected by city search
                                        }}
                                        error={errors.pickup_city}
                                    />
                                </div>
                                <div>
                                    <Label>רחוב *</Label>
                                    <AddressAutocomplete
                                        value={formData.pickup_street}
                                        onChange={(val) => updateField('pickup_street', val)}
                                        placeholder="דיזנגוף"
                                        onSelectAddress={(addr) => {
                                            updateField('pickup_city', addr.city);
                                            updateField('pickup_street', addr.street);
                                        }}
                                        error={errors.pickup_street}
                                    />
                                </div>
                            </div>
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

                    {/* Step 2: Delivery Details */}
                    {currentStep === 2 && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>עיר *</Label>
                                    <AddressAutocomplete
                                        value={formData.delivery_city}
                                        onChange={(val) => updateField('delivery_city', val)}
                                        valueKey="city"
                                        placeholder="ירושלים"
                                        onSelectAddress={(addr) => {
                                            updateField('delivery_city', addr.city);
                                            updateField('delivery_street', addr.street);
                                        }}
                                        error={errors.delivery_city}
                                    />
                                </div>
                                <div>
                                    <Label>רחוב *</Label>
                                    <AddressAutocomplete
                                        value={formData.delivery_street}
                                        onChange={(val) => updateField('delivery_street', val)}
                                        placeholder="יפו"
                                        onSelectAddress={(addr) => {
                                            updateField('delivery_city', addr.city);
                                            updateField('delivery_street', addr.street);
                                        }}
                                        error={errors.delivery_street}
                                    />
                                </div>
                            </div>
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
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h3 className="font-bold mb-2">פרטי איסוף</h3>
                                <p>{formData.pickup_city}, {formData.pickup_street} {formData.pickup_number}</p>
                                <p className="text-sm text-gray-600">{formData.pickup_contact_phone}</p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <h3 className="font-bold mb-2">פרטי מסירה</h3>
                                <p>{formData.delivery_city}, {formData.delivery_street} {formData.delivery_number}</p>
                                <p className="text-sm text-gray-600">{formData.delivery_contact_name} - {formData.delivery_contact_phone}</p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <h3 className="font-bold mb-2">פרטי חבילה</h3>
                                <p>{formData.package_description}</p>
                                <p className="text-sm text-gray-600">
                                    {formData.package_weight && `${formData.package_weight} ק"ג`} • {formData.package_size} • {formData.delivery_type}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
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
                                {loading ? "שולח..." : "אשר ושלח"}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
