"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { senderSchema } from "@/lib/schemas/wizardSchemas";
import { useWizardStore } from "@/lib/stores/wizardStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, MapPin } from "lucide-react";
import { useEffect } from "react";

export default function SenderForm() {
    const { sender, updateSender, nextStep } = useWizardStore();

    const form = useForm<z.infer<typeof senderSchema>>({
        resolver: zodResolver(senderSchema) as any,
        defaultValues: {
            senderName: sender.senderName || "",
            senderPhone: sender.senderPhone || "",
            senderAddress: {
                street: sender.senderAddress?.street || "",
                city: sender.senderAddress?.city || "",
                number: sender.senderAddress?.number || "",
                floor: sender.senderAddress?.floor || "",
                apartment: sender.senderAddress?.apartment || "",
                entrance: sender.senderAddress?.entrance || "",
                notes: sender.senderAddress?.notes || "",
            }
        },
    });

    const onSubmit = (data: z.infer<typeof senderSchema>) => {
        updateSender(data);
        nextStep();
    };

    return (
        <div className="p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                פרטי איסוף (שולח)
            </h2>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="senderName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>שם מלא</FormLabel>
                                    <FormControl>
                                        <Input placeholder="ישראל ישראלי" {...field} className="h-11" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="senderPhone"
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
                            <MapPin className="w-4 h-4 text-blue-500" />
                            כתובת לאיסוף
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="senderAddress.city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>עיר</FormLabel>
                                        <FormControl>
                                            <Input placeholder="תל אביב" {...field} className="h-11" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-3 gap-2">
                                <FormField
                                    control={form.control}
                                    name="senderAddress.street"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>רחוב</FormLabel>
                                            <FormControl>
                                                <Input placeholder="דרך בגין" {...field} className="h-11" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="senderAddress.number"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>מס' בית</FormLabel>
                                            <FormControl>
                                                <Input placeholder="144" {...field} className="h-11" />
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
                                name="senderAddress.floor"
                                render={({ field }) => (
                                    <FormItem className="col-span-1">
                                        <FormLabel>קומה</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="senderAddress.apartment"
                                render={({ field }) => (
                                    <FormItem className="col-span-1">
                                        <FormLabel>דירה</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="senderAddress.entrance"
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
                            name="senderAddress.notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>הערות לשליח (קוד לדלת / הכוונה)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="קוד 1234, להשאיר בלובי..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="pt-6 flex justify-end">
                        <Button type="submit" size="lg" className="px-8 bg-blue-600 hover:bg-blue-700">
                            המשך לפרטי מקבל
                            <ArrowLeft className="mr-2 h-4 w-4" />
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
