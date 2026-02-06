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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

const formSchema = z.object({
    username: z.string().min(2, "שם משתמש חייב להכיל לפחות 2 תווים"),
    password: z.string().min(6, "סיסמה חייבת להכיל לפחות 6 תווים"),
    full_name: z.string().min(2, "שם מלא חייב להכיל לפחות 2 תווים"),
    email: z.string().email("כתובת אימייל לא תקינה"),
    phone: z.string().regex(/^05\d{8}$/, "מספר טלפון לא תקין (חייב להתחיל ב-05 ולהיות באורך 10 ספרות)"),
    vehicle_type: z.enum(["motorcycle", "car", "bicycle", "van"]),
    license_plate: z.string().min(5, "מספר רישוי לא תקין"),
    national_id: z.string().length(9, "תעודת זהות חייבת להכיל 9 ספרות"),
    drivers_license_number: z.string().min(5, "מספר רישיון נהיגה לא תקין"),
    insurance_policy_number: z.string().min(5, "מספר פוליסה לא תקין"),
    is_freelance_declared: z.boolean(),
})

interface AddCourierModalProps {
    onSuccess: () => void
}

export function AddCourierModal({ onSuccess }: AddCourierModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
            full_name: "",
            email: "",
            phone: "",
            vehicle_type: "motorcycle",
            license_plate: "",
            national_id: "",
            drivers_license_number: "",
            insurance_policy_number: "",
            is_freelance_declared: false,
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true)
        try {
            const res = await api.post('/couriers', values)

            // api.post throws on 4xx/5xx by default? No, axios throws.
            // But we need to check if interceptor or response structure.
            // My api wrapper returns response object.

            toast.success("השליח נוצר בהצלחה!")
            setOpen(false)
            form.reset()
            onSuccess()
        } catch (error: any) { // Axios error
            toast.error(error.response?.data?.error || error.message || "Failed to create courier")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    הוסף שליח חדש
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                    <DialogTitle>הוספת שליח חדש</DialogTitle>
                    <DialogDescription>
                        מלא את כל הפרטים הנדרשים ליצירת שליח חדש במערכת. שים לב לשדות החובה.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>שם משתמש</FormLabel>
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
                                        <FormLabel>סיסמה ראשונית</FormLabel>
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
                                        <FormLabel>שם מלא</FormLabel>
                                        <FormControl>
                                            <Input placeholder="ישראל ישראלי" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="national_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>תעודת זהות</FormLabel>
                                        <FormControl>
                                            <Input placeholder="123456789" maxLength={9} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>טלפון נייד</FormLabel>
                                        <FormControl>
                                            <Input placeholder="0500000000" {...field} />
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
                                            <Input placeholder="courier@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="vehicle_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>סוג רכב</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="בחר סוג רכב" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="motorcycle">קטנוע/אופנוע</SelectItem>
                                                <SelectItem value="car">רכב פרטי</SelectItem>
                                                <SelectItem value="bicycle">אופניים חשמליים</SelectItem>
                                                <SelectItem value="van">מסחרית</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="license_plate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>מספר רישוי</FormLabel>
                                        <FormControl>
                                            <Input placeholder="12-345-67" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="drivers_license_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>מספר רישיון נהיגה</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="insurance_policy_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>מספר פוליסת ביטוח</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="is_freelance_declared"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-x-reverse rounded-md border p-4">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none mr-2">
                                        <FormLabel>
                                            הצהרת עצמאי/פרילנסר
                                        </FormLabel>
                                        <FormDescription>
                                            אני מצהיר כי אני עוסק מורשה/פטור ומספק חשבונית כחוק כנגד תשלום.
                                        </FormDescription>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>ביטול</Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                צור שליח
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
