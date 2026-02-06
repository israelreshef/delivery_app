import { useCourierStore } from "@/lib/stores/courierStore";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Package, Clock, Navigation, Ban, CheckCircle2 } from "lucide-react";
import CourierMap from "./CourierMap";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { playNotificationSound } from "@/lib/utils"; // Assume this utility exists or skip for now

export default function IncomingOrderModal() {
    const { incomingOrder, acceptOrder, rejectOrder } = useCourierStore();
    const [isOpen, setIsOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);

    useEffect(() => {
        if (incomingOrder) {
            setIsOpen(true);
            setTimeLeft(30);
            // playNotificationSound(); 
        } else {
            setIsOpen(false);
        }
    }, [incomingOrder]);

    // Countdown timer
    useEffect(() => {
        if (!isOpen || timeLeft <= 0) return;
        const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
        return () => clearInterval(timer);
    }, [isOpen, timeLeft]);

    const handleAccept = async () => {
        if (!incomingOrder) return;
        await acceptOrder(incomingOrder.order_id || incomingOrder.id);
        setIsOpen(false);
    };

    const handleReject = async () => {
        if (!incomingOrder) return;
        await rejectOrder(incomingOrder.order_id || incomingOrder.id);
        setIsOpen(false);
    };

    if (!incomingOrder) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleReject()}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border-none shadow-2xl [&>button]:hidden gap-0">
                {/* Header / Map Area */}
                <div className="relative h-48 w-full bg-slate-100">
                    <CourierMap
                        orders={incomingOrder ? [incomingOrder] : []}
                        courierLocation={incomingOrder?.pickup_location} // Focus on pickup
                        height="100%"
                    />
                    <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent flex justify-between items-start text-white">
                        <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
                            <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
                        </div>
                        <Badge variant="secondary" className="bg-blue-600 text-white border-none shadow-lg">
                            הצעה חדשה
                        </Badge>
                    </div>
                </div>

                {/* Content Body */}
                <div className="p-6 space-y-6">
                    {/* Price - Hero Section */}
                    <div className="text-center space-y-1">
                        <p className="text-sm text-slate-500 font-medium">תמורה מוערכת</p>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter flex items-center justify-center gap-1">
                            <span className="text-2xl text-slate-400 font-normal">₪</span>
                            {incomingOrder.estimated_price || incomingOrder.price || 45}
                        </h2>
                    </div>

                    {/* Route Info */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center gap-1 mt-1">
                                <div className="w-3 h-3 rounded-full bg-blue-600 ring-4 ring-blue-50" />
                                <div className="w-0.5 h-10 bg-slate-200" />
                                <div className="w-3 h-3 rounded-full bg-green-600 ring-4 ring-green-50" />
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">איסוף (2.4 ק"מ)</p>
                                    <p className="text-base font-semibold text-slate-900 leading-tight">
                                        {incomingOrder.pickup_address}
                                        {incomingOrder.pickup_point?.contact_name && <span className="block text-xs font-normal text-slate-500 mt-0.5">{incomingOrder.pickup_point.contact_name}</span>}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">מסירה (5.1 ק"מ)</p>
                                    <p className="text-base font-semibold text-slate-900 leading-tight">{incomingOrder.delivery_address || "תל אביב"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Package Info */}
                    <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3 text-sm text-slate-600 border border-slate-100">
                        <Package className="w-5 h-5 text-blue-500" />
                        <span className="font-medium">{incomingOrder.package_description || "חבילה רגילה"}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 mx-auto" />
                        <span>עד 5 ק"ג</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-5 gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={handleReject}
                            className="col-span-2 h-14 rounded-2xl border-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                        >
                            <Ban className="w-5 h-5 ml-2" />
                            דחה
                        </Button>
                        <Button
                            onClick={handleAccept}
                            className="col-span-3 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-lg font-bold shadow-xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <CheckCircle2 className="w-6 h-6 ml-2" />
                            קבל (₪{incomingOrder.estimated_price || incomingOrder.price || 45})
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
    );
}
