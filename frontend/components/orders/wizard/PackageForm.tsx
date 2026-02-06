"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { packageSchema } from "@/lib/schemas/wizardSchemas";
import { useWizardStore } from "@/lib/stores/wizardStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Assuming you have this or standard textarea
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, Box, Snowflake, AlertTriangle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

export default function PackageForm() {
    const { packageDetails, updatePackage, nextStep, prevStep } = useWizardStore();

    const form = useForm<z.infer<typeof packageSchema>>({
        resolver: zodResolver(packageSchema) as any,
        defaultValues: {
            packageSize: packageDetails.packageSize as any || "small",
            packageWeight: packageDetails.packageWeight || undefined,
            packageContent: packageDetails.packageContent || "",
            isFragile: packageDetails.isFragile || false,
            keepCold: packageDetails.keepCold || false,
            isLegal: packageDetails.isLegal || false,
            recipientId: packageDetails.recipientId || "",
        },
    });

    const onSubmit = (data: z.infer<typeof packageSchema>) => {
        updatePackage(data);
        nextStep();
    };

    return (
        <div className="p-6 md:p-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                פרטי חבילה
            </h2>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                    <FormField
                        control={form.control}
                        name="packageSize"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>גודל החבילה</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
                                    >
                                        <FormItem>
                                            <FormControl>
                                                <RadioGroupItem value="envelope" className="peer sr-only" />
                                            </FormControl>
                                            <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all">
                                                <Box className="mb-3 h-6 w-6 text-slate-500" />
                                                <span className="text-sm font-semibold">מעטפה</span>
                                                <span className="text-xs text-slate-400 mt-1">עד 0.5 ק"ג</span>
                                            </FormLabel>
                                        </FormItem>
                                        <FormItem>
                                            <FormControl>
                                                <RadioGroupItem value="small" className="peer sr-only" />
                                            </FormControl>
                                            <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all">
                                                <Box className="mb-3 h-8 w-8 text-slate-600" />
                                                <span className="text-sm font-semibold">קטנה</span>
                                                <span className="text-xs text-slate-400 mt-1">עד 2 ק"ג</span>
                                            </FormLabel>
                                        </FormItem>
                                        <FormItem>
                                            <FormControl>
                                                <RadioGroupItem value="medium" className="peer sr-only" />
                                            </FormControl>
                                            <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all">
                                                <Box className="mb-3 h-10 w-10 text-slate-700" />
                                                <span className="text-sm font-semibold">בינונית</span>
                                                <span className="text-xs text-slate-400 mt-1">עד 10 ק"ג</span>
                                            </FormLabel>
                                        </FormItem>
                                        <FormItem>
                                            <FormControl>
                                                <RadioGroupItem value="large" className="peer sr-only" />
                                            </FormControl>
                                            <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-slate-50 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all">
                                                <Box className="mb-3 h-12 w-12 text-slate-800" />
                                                <span className="text-sm font-semibold">גדולה</span>
                                                <span className="text-xs text-slate-400 mt-1">עד 25 ק"ג</span>
                                            </FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="packageWeight"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>משקל מוערך (ק"ג)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.1" placeholder="לדוגמה: 1.5" {...field} className="h-11" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="packageContent"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>תכולת חבילה</FormLabel>
                                    <FormControl>
                                        <Input placeholder="לדוגמה: מסמכים משפטיים" {...field} className="h-11" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl space-y-4">
                        <Label className="text-base font-semibold">מאפיינים מיוחדים</Label>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <FormField
                                control={form.control}
                                name="isFragile"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-x-reverse space-y-0 rounded-md border p-4 bg-white shadow-sm w-full">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel className="flex items-center gap-2 cursor-pointer">
                                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                                שביר
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="keepCold"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-x-reverse space-y-0 rounded-md border p-4 bg-white shadow-sm w-full">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel className="flex items-center gap-2 cursor-pointer">
                                                <Snowflake className="h-4 w-4 text-blue-500" />
                                                דורש קירור
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>

                    {/* Legal Delivery Section */}
                    <div className={`p-4 rounded-xl border-2 transition-all ${form.watch('isLegal') ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-transparent'}`}>
                        <FormField
                            control={form.control}
                            name="isLegal"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg p-2">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base font-bold flex items-center gap-2">
                                            📜 מסירה משפטית
                                            {form.watch('isLegal') && <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">מופעל</span>}
                                        </FormLabel>
                                        <div className="text-sm text-muted-foreground">
                                            מחייב זיהוי ע"י תעודת זהות וחתימה דיגיטלית במעמד המסירה
                                        </div>
                                    </div>
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className="h-6 w-6"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {form.watch('isLegal') && (
                            <div className="mt-4 animate-in slide-in-from-top-2 fade-in duration-300">
                                <FormField
                                    control={form.control}
                                    name="recipientId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>תעודת זהות של המקבל (חובה)</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="לדוגמה: 012345678" maxLength={9} className="bg-white border-purple-200 focus-visible:ring-purple-500" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}
                    </div>

                    <div className="pt-6 flex justify-between">
                        <Button type="button" variant="outline" size="lg" onClick={prevStep}>
                            <ArrowRight className="ml-2 h-4 w-4" /> חזרה
                        </Button>
                        <Button type="submit" size="lg" className="px-8 bg-blue-600 hover:bg-blue-700">
                            המשך לבחירת שירות
                            <ArrowLeft className="mr-2 h-4 w-4" />
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
