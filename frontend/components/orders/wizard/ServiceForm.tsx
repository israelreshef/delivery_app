"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { serviceSchema } from "@/lib/schemas/wizardSchemas";
import { useWizardStore } from "@/lib/stores/wizardStore";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, Clock, Zap, Timer, FileText, Gem, ShieldCheck } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ordersApi } from "@/lib/api/orders";

// Combined schema extending the base one
const extendedServiceSchema = serviceSchema.extend({
    deliveryType: z.enum(["standard", "legal_document", "valuable"]),
    insuranceRequired: z.boolean().optional(),
    insuranceValue: z.number().min(0).optional(),
});

export default function ServiceForm() {
    const { service, updateService, nextStep, prevStep } = useWizardStore();
    const [calculating, setCalculating] = useState(false);
    const [prices, setPrices] = useState({ regular: 60, express: 90, same_day: 120 });

    const form = useForm<z.infer<typeof extendedServiceSchema>>({
        resolver: zodResolver(extendedServiceSchema),
        defaultValues: {
            serviceType: service.serviceType as any || "regular",
            deliveryType: service.deliveryType as any || "standard",
            insuranceRequired: service.insuranceRequired || false,
            insuranceValue: service.insuranceValue || 0
        },
    });

    const watchDeliveryType = form.watch("deliveryType");
    const watchInsurance = form.watch("insuranceRequired");

    // Real API price calculation
    useEffect(() => {
        const calculatePrices = async () => {
            setCalculating(true);
            try {
                // We calculate for all 3 urgencies to show comparison
                const urgencies = ['regular', 'express', 'same_day'];
                const newPrices = { ...prices };

                // Get current wizard state for other params
                const packageSize = useWizardStore.getState().packageDetails.packageSize || 'small';
                const weight = useWizardStore.getState().packageDetails.packageWeight || 0;

                // TODO: Get real distance from previous step or store
                const distance = 15; // Mock distance for now until Geocoding is fully connected

                const promises = urgencies.map(async (urgency) => {
                    const res = await ordersApi.calculatePrice({
                        distance_km: distance,
                        package_size: packageSize,
                        urgency: urgency,
                        delivery_type: watchDeliveryType, // From form watcher
                        insurance_value: watchInsurance ? (form.getValues('insuranceValue') || 0) : 0,
                        weight: weight
                    });
                    return { urgency, price: res.price };
                });

                const results = await Promise.all(promises);

                results.forEach(r => {
                    if (r.urgency === 'regular') newPrices.regular = r.price;
                    if (r.urgency === 'express') newPrices.express = r.price;
                    if (r.urgency === 'same_day') newPrices.same_day = r.price;
                });

                setPrices(newPrices);
            } catch (error) {
                console.error("Failed to calculate prices", error);
            } finally {
                setCalculating(false);
            }
        };

        // Debounce calculation
        const timer = setTimeout(() => {
            calculatePrices();
        }, 600);

        return () => clearTimeout(timer);
    }, [watchDeliveryType, watchInsurance, form.watch('insuranceValue')]);

    const onSubmit = (data: z.infer<typeof extendedServiceSchema>) => {
        updateService(data);
        nextStep();
    };

    return (
        <div className="p-6 md:p-8 animate-in fade-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto" dir="rtl">
            <h2 className="text-2xl font-bold mb-2 text-slate-800 flex items-center gap-2">
                <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
                אפשרויות שילוח מתקדמות
            </h2>
            <p className="text-muted-foreground mb-8 mr-3">
                בחר את רמת הדחיפות וסוג המשלוח המתאים ביותר לצרכים שלך
            </p>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                    {/* Delivery Type Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-700">
                            1. מה שולחים?
                        </h3>
                        <FormField
                            control={form.control}
                            name="deliveryType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="grid grid-cols-1 md:grid-cols-3 gap-4"
                                        >
                                            <FormItem>
                                                <FormControl><RadioGroupItem value="standard" className="peer sr-only" /></FormControl>
                                                <FormLabel className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50/50 cursor-pointer transition-all h-full">
                                                    <div className="w-12 h-12 rounded-full bg-blue-100/50 text-blue-600 flex items-center justify-center mb-3">
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                    <div className="text-center">
                                                        <h3 className="font-bold text-base mb-1">רגיל / חבילה</h3>
                                                        <p className="text-xs text-slate-500">למשלוחים סטנדרטיים</p>
                                                    </div>
                                                </FormLabel>
                                            </FormItem>

                                            <FormItem>
                                                <FormControl><RadioGroupItem value="legal_document" className="peer sr-only" /></FormControl>
                                                <FormLabel className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-indigo-600 peer-data-[state=checked]:bg-indigo-50/50 cursor-pointer transition-all h-full">
                                                    <div className="w-12 h-12 rounded-full bg-indigo-100/50 text-indigo-600 flex items-center justify-center mb-3">
                                                        <ShieldCheck className="w-6 h-6" />
                                                    </div>
                                                    <div className="text-center">
                                                        <h3 className="font-bold text-base mb-1">מסמך משפטי</h3>
                                                        <p className="text-xs text-slate-500">כולל אימות זהות וחתימה</p>
                                                    </div>
                                                </FormLabel>
                                            </FormItem>

                                            <FormItem>
                                                <FormControl><RadioGroupItem value="valuable" className="peer sr-only" /></FormControl>
                                                <FormLabel className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-50/50 cursor-pointer transition-all h-full">
                                                    <div className="w-12 h-12 rounded-full bg-amber-100/50 text-amber-600 flex items-center justify-center mb-3">
                                                        <Gem className="w-6 h-6" />
                                                    </div>
                                                    <div className="text-center">
                                                        <h3 className="font-bold text-base mb-1">רכוש יקר ערך</h3>
                                                        <p className="text-xs text-slate-500">טיפול מיוחד וביטוח מוגדל</p>
                                                    </div>
                                                </FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="h-px bg-slate-200"></div>

                    {/* Urgency Section (Existing logic preserved) */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-700">
                            2. מתי זה יגיע?
                        </h3>
                        <FormField
                            control={form.control}
                            name="serviceType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="grid grid-cols-1 md:grid-cols-3 gap-6"
                                        >
                                            {/* Regular */}
                                            <FormItem>
                                                <FormControl><RadioGroupItem value="regular" className="peer sr-only" /></FormControl>
                                                <FormLabel className="relative flex flex-col justify-between rounded-xl border-2 border-muted bg-white p-6 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:shadow-lg cursor-pointer transition-all h-full">
                                                    {calculating && <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10"><Loader2 className="animate-spin text-blue-600" /></div>}
                                                    <div>
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                                                <Clock className="w-5 h-5" />
                                                            </div>
                                                            <span className="text-xl font-bold text-slate-900">₪{prices.regular}</span>
                                                        </div>
                                                        <h3 className="font-bold text-lg mb-1">רגיל</h3>
                                                        <p className="text-sm text-slate-500">הגעה עד סוף יום העסקים הבא</p>
                                                    </div>
                                                </FormLabel>
                                            </FormItem>

                                            {/* Express */}
                                            <FormItem>
                                                <FormControl><RadioGroupItem value="express" className="peer sr-only" /></FormControl>
                                                <FormLabel className="relative flex flex-col justify-between rounded-xl border-2 border-muted bg-white p-6 hover:bg-slate-50 peer-data-[state=checked]:border-purple-600 peer-data-[state=checked]:shadow-lg cursor-pointer transition-all h-full">
                                                    {calculating && <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10"><Loader2 className="animate-spin text-purple-600" /></div>}
                                                    <div className="absolute -top-3 -left-3 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">מומלץ</div>
                                                    <div>
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                                                <Zap className="w-5 h-5" />
                                                            </div>
                                                            <span className="text-xl font-bold text-slate-900">₪{prices.express}</span>
                                                        </div>
                                                        <h3 className="font-bold text-lg mb-1">אקספרס</h3>
                                                        <p className="text-sm text-slate-500">איסוף ומסירה תוך 4 שעות</p>
                                                    </div>
                                                </FormLabel>
                                            </FormItem>

                                            {/* Same Day */}
                                            <FormItem>
                                                <FormControl><RadioGroupItem value="same_day" className="peer sr-only" /></FormControl>
                                                <FormLabel className="relative flex flex-col justify-between rounded-xl border-2 border-muted bg-white p-6 hover:bg-slate-50 peer-data-[state=checked]:border-orange-500 peer-data-[state=checked]:shadow-lg cursor-pointer transition-all h-full">
                                                    {calculating && <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10"><Loader2 className="animate-spin text-orange-600" /></div>}
                                                    <div>
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                                                                <Timer className="w-5 h-5" />
                                                            </div>
                                                            <span className="text-xl font-bold text-slate-900">₪{prices.same_day}</span>
                                                        </div>
                                                        <h3 className="font-bold text-lg mb-1">מעכשיו לעכשיו</h3>
                                                        <p className="text-sm text-slate-500">שליח יוצא אליך מיד (VIP)</p>
                                                    </div>
                                                </FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Insurance Section - Only for Valuable */}
                    {(watchDeliveryType === 'valuable' || watchDeliveryType === 'legal_document') && (
                        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2">
                            <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-700 mb-4">
                                <ShieldCheck className="w-5 h-5 text-blue-600" />
                                הגנות וביטוח
                            </h3>

                            <div className="flex flex-col gap-4">
                                <FormField
                                    control={form.control}
                                    name="insuranceRequired"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-white shadow-sm">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-base font-semibold">ביטוח תכולה</FormLabel>
                                                <div className="text-sm text-slate-500">
                                                    האם תרצה לבטח את המשלוח? (בסיס עד 500 ₪)
                                                </div>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {watchInsurance && (
                                    <FormField
                                        control={form.control}
                                        name="insuranceValue"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>שווי מוערך (בשקלים)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="הכנס סכום..."
                                                        {...field}
                                                        onChange={e => field.onChange(parseFloat(e.target.value))}
                                                    />
                                                </FormControl>
                                                <p className="text-xs text-slate-500">הפרמיה תחושב כ-1% משווי הערך המוצהר</p>
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    <div className="pt-6 flex justify-between">
                        <Button type="button" variant="outline" size="lg" onClick={prevStep}>
                            <ArrowRight className="ml-2 h-4 w-4" /> חזרה
                        </Button>
                        <Button type="submit" size="lg" className="px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
                            המשך לתשלום
                            <ArrowLeft className="mr-2 h-4 w-4" />
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
