"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { PhoneListEditor } from "@/components/customer/PhoneListEditor"

const formSchema = z
    .object({
        has_account: z.boolean(),
        username: z.string().optional(),
        password: z.string().optional(),
        full_name: z.string().min(2, "שם מלא חייב להכיל לפחות 2 תווים"),
        company_name: z.string().optional(),
        business_id: z.string().optional(),
        contact_person: z.string().optional(),
        tax_id: z.string().optional(),
        customer_type: z.string().optional(),
        vat_status: z.string().optional(),
        payment_terms: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        additional_phones: z.array(z.string()).optional(),
        billing_address: z.string().optional(),
        credit_limit: z.any().optional(),
        is_business: z.boolean(),
    })
    .superRefine((data, ctx) => {
        if (data.has_account) {
            if (!data.username || data.username.length < 3) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["username"],
                    message: "שם משתמש חייב להכיל לפחות 3 תווים",
                })
            }
            if (!data.password || data.password.length < 6) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["password"],
                    message: "סיסמה חייבת להכיל לפחות 6 תווים",
                })
            }
            if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["email"],
                    message: "כתובת אימייל לא תקינה",
                })
            }
            if (data.phone && !/^05\d{8}$/.test(data.phone)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["phone"],
                    message: "מספר טלפון לא תקין",
                })
            }
        }
    })

interface AddCustomerModalProps {
    onSuccess: () => void
}

export function AddCustomerModal({ onSuccess }: AddCustomerModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            has_account: true,
            username: "",
            password: "",
            full_name: "",
            company_name: "",
            business_id: "",
            contact_person: "",
            tax_id: "",
            customer_type: "private",
            vat_status: "authorized_dealer",
            payment_terms: "net_30",
            email: "",
            phone: "",
            additional_phones: [],
            billing_address: "",
            credit_limit: 0,
            is_business: false,
        },
    })

    const isBusiness = form.watch("is_business")
    const hasAccount = form.watch("has_account")

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            const payload: any = { ...values }
            payload.customer_type = values.is_business ? "business" : values.customer_type || "private"
            if (!values.has_account) {
                delete payload.username
                delete payload.password
                // NOTE: email and phone are kept even without account so they can be saved on the customer
            }
            if (payload.additional_phones && payload.additional_phones.length > 0) {
                // Extract values and clean up
                payload.additional_phones = JSON.stringify(
                    payload.additional_phones.map((p: string) => p.trim()).filter(Boolean)
                )
            } else {
                payload.additional_phones = "[]"
            }
            await api.post("/customers", payload)
            toast.success("הלקוח נוצר בהצלחה!")
            setOpen(false)
            form.reset()
            onSuccess()
        } catch (error: any) {
            toast.error(error.response?.data?.error || error.message || "שגיאה ביצירת לקוח")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-brand hover:bg-brand-dark">
                    <Plus className="h-4 w-4" />
                    לקוח חדש
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                    <DialogTitle>הוספת לקוח חדש</DialogTitle>
                    <DialogDescription>
                        מלא את פרטי הלקוח. סמן "לקוח עסקי" כדי להוסיף פרטי חברה.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="has_account"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-x-reverse rounded-md border p-4 bg-muted/50">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none mr-2">
                                        <FormLabel>צור חשבון כניסה ללקוח (אופציונלי)</FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="is_business"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-x-reverse rounded-md border p-4 bg-muted/50">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none mr-2">
                                        <FormLabel>לקוח עסקי / מוסדי</FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />

                        {hasAccount && (
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>שם משתמש (למערכת)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="user123" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>סיסמה זמנית</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="******" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="full_name"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>שם מלא / שם תצוגה</FormLabel>
                                        <FormControl>
                                            <Input placeholder="ישראל ישראלי" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>אימייל{hasAccount ? " (חובה לחשבון)" : " (אופציונלי)"}</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="client@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <PhoneListEditor
                                primaryPhone={form.watch("phone") || ""}
                                onPrimaryPhoneChange={(val) => form.setValue("phone", val)}
                                additionalPhones={form.watch("additional_phones") || []}
                                onAdditionalPhonesChange={(phones) => form.setValue("additional_phones", phones)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="tax_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>מס' עוסק / ח.פ</FormLabel>
                                        <FormControl>
                                            <Input placeholder="512345678" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="customer_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>סוג לקוח</FormLabel>
                                        <FormControl>
                                            <select {...field} className="w-full border rounded-md px-3 py-2 text-sm">
                                                <option value="private">פרטי</option>
                                                <option value="business">עסקי</option>
                                            </select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="vat_status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>סטטוס מע״מ</FormLabel>
                                        <FormControl>
                                            <select {...field} className="w-full border rounded-md px-3 py-2 text-sm">
                                                <option value="exempt">פטור</option>
                                                <option value="authorized_dealer">עוסק מורשה</option>
                                                <option value="company">חברה</option>
                                                <option value="standard">רגיל</option>
                                            </select>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="payment_terms"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>תנאי תשלום</FormLabel>
                                        <FormControl>
                                            <Input placeholder="net_30" {...field} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        {isBusiness && (
                            <div className="space-y-4 border-t pt-4 mt-4">
                                <h4 className="font-medium text-sm text-brand">פרטי עסק</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="company_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>שם חברה רשמי</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="שם החברה בע״מ" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="business_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>ח.פ / מס' עוסק</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="512345678" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="contact_person"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>איש קשר</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="שם איש קשר" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="credit_limit"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>תקרת אשראי (₪)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="billing_address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>כתובת לחיוב / שליחת חשבונית</FormLabel>
                                            <FormControl>
                                                <Input placeholder="רחוב, עיר, מיקוד" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                ביטול
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                צור לקוח
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
