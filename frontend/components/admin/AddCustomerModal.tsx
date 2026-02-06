"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
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
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"

const formSchema = z.object({
    username: z.string().min(3, "שם משתמש חייב להכיל לפחות 3 תווים"),
    password: z.string().min(6, "סיסמה חייבת להכיל לפחות 6 תווים"),
    full_name: z.string().min(2, "שם מלא חייב להכיל לפחות 2 תווים"),
    company_name: z.string().optional(),
    business_id: z.string().optional(), // H.P.
    contact_person: z.string().optional(),
    email: z.string().email("כתובת אימייל לא תקינה"),
    phone: z.string().regex(/^05\d{8}$/, "מספר טלפון לא תקין"),
    billing_address: z.string().optional(),
    credit_limit: z.any().optional(),
    is_business: z.boolean(),
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
            username: "",
            password: "",
            full_name: "",
            company_name: "",
            business_id: "",
            contact_person: "",
            email: "",
            phone: "",
            billing_address: "",
            credit_limit: 0,
            is_business: false,
        },
    })

    // Watch is_business to conditionally show fields
    const isBusiness = form.watch("is_business")

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            const res = await api.post('/customers', values)

            if (res.status !== 201 && res.status !== 200) {
                // Should be redundant via axios interceptor rejections usually, but api wrapper might return response.
                // Actually axios throws on error status by default.
            }

            toast.success("הלקוח נוצר בהצלחה!")
            setOpen(false)
            form.reset()
            onSuccess()
        } catch (error: any) {
            toast.error(error.response?.data?.error || error.message || "Failed to create customer")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
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
                            name="is_business"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-x-reverse rounded-md border p-4 bg-muted/50">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none mr-2">
                                        <FormLabel>
                                            לקוח עסקי / מוסדי
                                        </FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />

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

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="full_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>שם מלא / שם תצוגה</FormLabel>
                                        <FormControl>
                                            <Input placeholder="ישראל ישראלי" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>טלפון</FormLabel>
                                        <FormControl>
                                            <Input placeholder="0500000000" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>אימייל</FormLabel>
                                    <FormControl>
                                        <Input placeholder="client@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {isBusiness && (
                            <div className="space-y-4 border-t pt-4 mt-4">
                                <h4 className="font-medium text-sm text-blue-600">פרטי עסק</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="company_name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>שם חברה רשמי</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="שם החברה בע''מ" {...field} />
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
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
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
