"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { paymentSchema } from "@/lib/schemas/wizardSchemas";
import { useWizardStore } from "@/lib/stores/wizardStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, CreditCard, Wallet, Lock, CheckCircle2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PaymentForm() {
    const { payment, updatePayment, prevStep, estimatedPrice } = useWizardStore();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof paymentSchema>>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            paymentMethod: payment.paymentMethod as any || "credit_card",
            cardHolder: payment.cardHolder || "",
            last4: payment.last4 || "",
        },
    });

    const onSubmit = async (data: z.infer<typeof paymentSchema>) => {
        updatePayment(data);
        setIsSubmitting(true);

        try {
            // 1. Get full state
            const state = useWizardStore.getState();

            // 2. Construct Payload
            const payload = {
                sender: state.sender,
                recipient: state.recipient,
                package: state.packageDetails,
                service: state.service,
                payment: data,
                distance_km: 10, // Mock distance for now, or calculate client-side
                notes: state.packageDetails.packageContent // or specific notes field
            };

            // 3. Send to Backend
            // Retrieve token from localStorage or useAuth hook (assuming stored in localStorage 'token')
            const token = localStorage.getItem('token');
            const headers: HeadersInit = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch('http://localhost:5000/api/orders', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Failed to create order');
            }

            toast.success(`ההזמנה נוצרה בהצלחה! מס' ${result.order_number}`);

            // Redirect to success page or dashboard
            // router.push(`/orders/${result.id}`); 
            // For now back to dashboard
            setTimeout(() => {
                router.push('/dashboard/customer');
                // resetWizard(); // Clear store
            }, 2000);

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "אירעה שגיאה ביצירת ההזמנה");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 md:p-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                <div className="w-1 h-6 bg-slate-900 rounded-full"></div>
                תשלום וסיום
            </h2>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8 flex justify-between items-center">
                <div>
                    <div className="text-sm text-slate-500 mb-1">סה"כ לתשלום</div>
                    <div className="text-3xl font-bold text-slate-900">₪60.00</div>
                </div>
                <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Lock className="w-5 h-5 text-slate-400" />
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                    <FormField
                        control={form.control}
                        name="paymentMethod"
                        render={({ field }) => (
                            <FormItem className="space-y-4">
                                <FormLabel>אמצעי תשלום</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="grid grid-cols-1 gap-4"
                                    >
                                        <FormItem>
                                            <FormControl><RadioGroupItem value="credit_card" className="peer sr-only" /></FormControl>
                                            <FormLabel className="flex items-center gap-4 rounded-xl border-2 border-muted bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all">
                                                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                                    <CreditCard className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg">כרטיס אשראי</h3>
                                                    <p className="text-sm text-slate-500">חיוב מאובטח מיידי</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {/* Icons placeholders */}
                                                    <div className="w-8 h-5 bg-slate-200 rounded"></div>
                                                    <div className="w-8 h-5 bg-slate-200 rounded"></div>
                                                </div>
                                            </FormLabel>
                                        </FormItem>

                                        <FormItem>
                                            <FormControl><RadioGroupItem value="bit" className="peer sr-only" /></FormControl>
                                            <FormLabel className="flex items-center gap-4 rounded-xl border-2 border-muted bg-white p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all">
                                                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                                    <Wallet className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-lg">Bit / PayBox</h3>
                                                    <p className="text-sm text-slate-500">תשלום מהיר באפליקציה</p>
                                                </div>
                                            </FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {form.watch("paymentMethod") === "credit_card" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <FormField
                                control={form.control}
                                name="cardHolder"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>שם בעל הכרטיס</FormLabel>
                                        <FormControl>
                                            <Input placeholder="ISRAEL ISRAELI" {...field} className="h-11" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {/* Card number input placeholder - normally handled by Stripe Elements */}
                            <div className="p-4 border border-dashed border-slate-300 rounded-lg bg-slate-50 text-center text-slate-500 text-sm">
                                [Stripe Elements Placeholder]
                            </div>
                        </div>
                    )}

                    <div className="pt-6 flex justify-between">
                        <Button type="button" variant="outline" size="lg" onClick={prevStep} disabled={isSubmitting}>
                            <ArrowRight className="ml-2 h-4 w-4" /> חזרה
                        </Button>
                        <Button type="submit" size="lg" className="px-8 bg-green-600 hover:bg-green-700 w-48" disabled={isSubmitting}>
                            {isSubmitting ? (
                                "מבצע הזמנה..."
                            ) : (
                                <>
                                    בצע תשלום
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
