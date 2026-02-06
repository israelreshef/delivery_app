"use client";

import CustomerLayout from "@/components/customer/CustomerLayout";
import NewOrderWizard from "@/components/customer/NewOrderWizard";

export default function NewOrderPage() {
    return (
        <CustomerLayout>
            <div className="max-w-5xl mx-auto py-8 space-y-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">יצירת הזמנה חדשה</h1>
                    <p className="text-slate-500 mt-2">מלא את הפרטים הבאים כדי להזמין שליח באופן מיידי</p>
                </div>

                <NewOrderWizard />
            </div>
        </CustomerLayout>
    );
}
