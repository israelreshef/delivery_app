"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { recipientSchema } from "@/lib/schemas/wizardSchemas";
import { useWizardStore } from "@/lib/stores/wizardStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, UserCheck } from "lucide-react";

export default function RecipientForm() {
    const { recipient, updateRecipient, nextStep, prevStep } = useWizardStore();

    const form = useForm<z.infer<typeof recipientSchema>>({
        resolver: zodResolver(recipientSchema) as any,
        defaultValues: {
            recipientName: recipient.recipientName || "",
            recipientPhone: recipient.recipientPhone || "",
            recipientAddress: {
                street: recipient.recipientAddress?.street || "",
                city: recipient.recipientAddress?.city || "",
                number: recipient.recipientAddress?.number || "",
                floor: recipient.recipientAddress?.floor || "",
                apartment: recipient.recipientAddress?.apartment || "",
                entrance: recipient.recipientAddress?.entrance || "",
                notes: recipient.recipientAddress?.notes || "",
            }
        },
    });

    const onSubmit = (data: z.infer<typeof recipientSchema>) => {
        updateRecipient(data);
        nextStep();
    };

    return (
        <div className="p-6 md:p-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                פרטי מסירה (מקבל)
            </h2>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="recipientName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>שם המקבל</FormLabel>
                                    <FormControl>
                                        <Input placeholder="דני כהן" {...field} className="h-11" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="recipientPhone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>טלפון נייד</FormLabel>
                                    <FormControl>
                                        <Input placeholder="050-0000000" {...field} className="h-11 dir-ltr text-right" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-green-500" />
                            כתובת למסירה
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="recipientAddress.city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>עיר</FormLabel>
                                        <FormControl>
                                            <Input placeholder="רמת גן" {...field} className="h-11" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-3 gap-2">
                                <FormField
                                    control={form.control}
                                    name="recipientAddress.street"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>רחוב</FormLabel>
                                            <FormControl>
                                                <Input placeholder="ביאליק" {...field} className="h-11" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="recipientAddress.number"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>מס' בית</FormLabel>
                                            <FormControl>
                                                <Input placeholder="50" {...field} className="h-11" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                            <FormField
                                control={form.control}
                                name="recipientAddress.floor"
                                render={({ field }) => (
                                    <FormItem className="col-span-1">
                                        <FormLabel>קומה</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="recipientAddress.apartment"
                                render={({ field }) => (
                                    <FormItem className="col-span-1">
                                        <FormLabel>דירה</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="recipientAddress.entrance"
                                render={({ field }) => (
                                    <FormItem className="col-span-1">
                                        <FormLabel>כניסה</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="recipientAddress.notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>הערות לשליח</FormLabel>
                                    <FormControl>
                                        <Input placeholder="להתקשר כשהוא מגיע..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="pt-6 flex justify-between">
                        <Button type="button" variant="outline" size="lg" onClick={prevStep}>
                            <ArrowRight className="ml-2 h-4 w-4" /> חזרה
                        </Button>
                        <Button type="submit" size="lg" className="px-8 bg-blue-600 hover:bg-blue-700">
                            המשך לפרטי חבילה
                            <ArrowLeft className="mr-2 h-4 w-4" />
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
