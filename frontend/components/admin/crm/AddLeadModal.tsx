"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { crmApi } from "@/lib/api/crm";

const formSchema = z.object({
    first_name: z.string().min(2, "שם פרטי חייב להכיל לפחות 2 תווים"),
    last_name: z.string().min(2, "שם משפחה חייב להכיל לפחות 2 תווים"),
    company_name: z.string().optional(),
    email: z.string().email("כתובת אימייל לא תקינה").optional().or(z.literal("")),
    phone: z.string().min(9, "מספר טלפון חייב להיות תקין"),
    source: z.enum(["website", "facebook", "referral", "cold_call", "other"]),
    estimated_value: z.coerce.number().min(0),
});

type FormValues = z.infer<typeof formSchema>;

interface AddLeadModalProps {
    onSuccess: () => void;
}

export function AddLeadModal({ onSuccess }: AddLeadModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            first_name: "",
            last_name: "",
            company_name: "",
            email: "",
            phone: "",
            source: "other",
            estimated_value: 0,
        },
    });

    async function onSubmit(values: FormValues) {
        setLoading(true);
        try {
            await crmApi.createLead({
                ...values,
                company_name: values.company_name || undefined,
                email: values.email || undefined,
            });
            toast.success("הליד נוצר בהצלחה!");
            setOpen(false);
            form.reset();
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || "שגיאה ביצירת הליד");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    ליד חדש
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" dir="rtl">
                <DialogHeader>
                    <DialogTitle>הוספת ליד חדש</DialogTitle>
                    <DialogDescription>
                        הכנס את פרטי המתעניין החדש.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="first_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>שם פרטי</FormLabel>
                                        <FormControl>
                                            <Input placeholder="ישראל" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="last_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>שם משפחה</FormLabel>
                                        <FormControl>
                                            <Input placeholder="ישראלי" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="company_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>שם חברה (אופציונלי)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="חברה בע''מ" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>טלפון</FormLabel>
                                        <FormControl>
                                            <Input placeholder="050..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>אימייל</FormLabel>
                                        <FormControl>
                                            <Input placeholder="email@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="source"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>מקור הגעה</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="בחר מקור" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="website">אתר אינטרנט</SelectItem>
                                                <SelectItem value="facebook">פייסבוק/אינסטגרם</SelectItem>
                                                <SelectItem value="referral">המלצה מלקוח</SelectItem>
                                                <SelectItem value="cold_call">שיחה יזומה</SelectItem>
                                                <SelectItem value="other">אחר</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="estimated_value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>שווי משוער (₪)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                צור ליד
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
