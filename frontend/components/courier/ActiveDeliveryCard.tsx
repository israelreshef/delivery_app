import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Navigation, CheckCircle, Package, MessageSquare } from "lucide-react";
import { useCourierStore } from "@/lib/stores/courierStore";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import SignaturePad from "@/components/ui/signature-pad";
import SwipeButton from "@/components/ui/swipe-button";
import { api } from "@/lib/api";

export default function ActiveDeliveryCard() {
    const { activeOrder, updateDeliveryStatus } = useCourierStore();
    const [showSignaturePad, setShowSignaturePad] = useState(false);

    if (!activeOrder) return null;

    const isLegalDelivery = activeOrder.is_legal || activeOrder.delivery_type === 'legal_document';

    const steps = {
        'accepted': { label: 'סע לאיסוף', next: 'picked_up', btnText: 'אספתי את החבילה', icon: Navigation },
        'in_transit_to_pickup': { label: 'בדרך לאיסוף', next: 'picked_up', btnText: 'אספתי את החבילה', icon: Package },
        'picked_up': { label: 'בדרך למסירה', next: 'delivered', btnText: isLegalDelivery ? '📜 חתימה ומסירה' : 'החבילה נמסרה', icon: CheckCircle },
        'in_transit_to_delivery': { label: 'בדרך למסירה', next: 'delivered', btnText: isLegalDelivery ? '📜 חתימה ומסירה' : 'החבילה נמסרה', icon: CheckCircle },
    };

    const currentStep = steps[activeOrder.status as keyof typeof steps] || steps['accepted'];

    const openWaze = (address: string) => {
        window.open(`https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`, '_blank');
    };

    const handleNextStep = async () => {
        // If it's a legal delivery and we're about to mark as delivered, show signature pad
        if (isLegalDelivery && currentStep.next === 'delivered') {
            setShowSignaturePad(true);
        } else {
            await updateDeliveryStatus(activeOrder.id || activeOrder.order_id, currentStep.next);
        }
    };

    const handleSignatureSave = async (signatureDataUrl: string, recipientName?: string, recipientId?: string) => {
        try {
            // Get GPS location
            let geoLat, geoLng;
            if (navigator.geolocation) {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                geoLat = position.coords.latitude;
                geoLng = position.coords.longitude;
            }

            // Send signature + geo + legal details to backend
            await api.post(`/couriers/orders/${activeOrder.id || activeOrder.order_id}/status`, {
                status: 'delivered',
                pod_signature: signatureDataUrl,
                pod_lat: geoLat,
                pod_lng: geoLng,
                pod_recipient_name: recipientName,
                pod_recipient_id: recipientId
            });

            setShowSignaturePad(false);
            // Refresh order status
            await updateDeliveryStatus(activeOrder.id || activeOrder.order_id, 'delivered');
        } catch (error) {
            console.error('Signature upload failed:', error);
            alert('שגיאה בשמירת החתימה');
        }
    };

    return (
        <>
            {showSignaturePad && (
                <SignaturePad
                    onSave={handleSignatureSave}
                    onCancel={() => setShowSignaturePad(false)}
                    isLegalDelivery={isLegalDelivery}
                />
            )}

            <Card className="bg-blue-600 text-white border-none shadow-xl overflow-hidden relative">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-xl"></div>

                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 mb-2">
                                #{activeOrder.order_number || '1234'}
                            </Badge>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                {currentStep.label}
                            </CardTitle>
                        </div>
                        <div className="bg-white/20 p-2 rounded-full">
                            <currentStep.icon className="w-6 h-6" />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="bg-white/10 p-4 rounded-xl space-y-3 backdrop-blur-sm">
                        {/* Destination Address (Changes based on status) */}
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-blue-100 text-xs uppercase tracking-wider">
                                    {activeOrder.status === 'picked_up' ? 'כתובת מסירה' : 'כתובת איסוף'}
                                </p>
                                <p className="font-bold text-lg leading-tight">
                                    {activeOrder.status === 'picked_up'
                                        ? (activeOrder.delivery_address || "כתובת מסירה")
                                        : (activeOrder.pickup_address || "כתובת איסוף")}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <SwipeButton
                            text="נווט"
                            completedText="מנווט"
                            onComplete={() => openWaze(activeOrder.status === 'picked_up' ? activeOrder.delivery_address : activeOrder.pickup_address)}
                            icon={<Navigation className="w-4 h-4" />}
                            color="blue"
                            className="w-full"
                        />
                        <SwipeButton
                            text="התקשר"
                            completedText="מתקשר"
                            onComplete={() => { window.open(`tel:${activeOrder.status === 'picked_up' ? activeOrder.delivery_contact_phone : activeOrder.pickup_contact_phone}`); }}
                            icon={<Phone className="w-4 h-4" />}
                            color="blue"
                            className="w-full"
                        />
                        <SwipeButton
                            text="שלח הודעה"
                            completedText="נשלח"
                            onComplete={() => { window.open(`sms:${activeOrder.status === 'picked_up' ? activeOrder.delivery_contact_phone : activeOrder.pickup_contact_phone}`); }}
                            icon={<MessageSquare className="w-4 h-4" />}
                            color="blue"
                            className="w-full"
                        />
                    </div>
                </CardContent>

                <CardFooter className="pt-2">
                    <Button
                        className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold h-12 text-lg shadow-lg"
                        onClick={handleNextStep}
                    >
                        {currentStep.btnText}
                    </Button>
                </CardFooter>
            </Card>
        </>
    );
}
