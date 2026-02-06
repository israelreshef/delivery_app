"use client";

import OrderWizard from "@/components/orders/OrderWizard";

export default function AdminNewOrderPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-8">
            <div className="max-w-6xl mx-auto px-4">
                <div className="mb-6" dir="rtl">
                    <h1 className="text-3xl font-bold text-slate-900">יצירת הזמנה חדשה</h1>
                    <p className="text-slate-600">מלא את הפרטים ליצירת משלוח עבור לקוח</p>
                </div>
                <OrderWizard userType="admin" />
            </div>
        </div>
    );
}
