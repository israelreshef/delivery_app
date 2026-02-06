import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Camera, ShieldCheck, AlertTriangle, Fingerprint } from 'lucide-react';
import { toast } from 'sonner';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import axios from 'axios';
import Cookies from 'js-cookie';

interface BiometricScannerProps {
    open: boolean;
    onClose: () => void;
    onVerified: () => void;
}

export default function BiometricScanner({ open, onClose, onVerified }: BiometricScannerProps) {
    const webcamRef = useRef<Webcam>(null);
    const [capturing, setCapturing] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleWebAuthn = async () => {
        setError(null);
        setVerifying(true);
        try {
            const token = Cookies.get('token');
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Get options from backend
            const optionsResp = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/webauthn/auth/options`, {}, { headers });

            // 2. Start Authentication with browser
            const asseResp = await startAuthentication(optionsResp.data);

            // 3. Verify with backend
            const verifyResp = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/webauthn/auth/verify`, asseResp, { headers });

            if (verifyResp.data.verified) {
                toast.success("אימות מכשיר הצליח!");
                onVerified();
            } else {
                throw new Error("Verification failed");
            }
        } catch (err: any) {
            console.error(err);
            // If user has no credentials yet, maybe ask to register? 
            // For this flow, we'll just show error.
            if (err.response?.status === 404 || err.message?.includes("No credentials")) {
                setError("לא נמצאו מפתחות רשומים למכשיר זה. אנא הירשם דרך ההגדרות או השתמש במצלמה.");
            } else {
                setError("אימות מכשיר נכשל. נסה שנית או השתמש במצלמה.");
            }
        } finally {
            setVerifying(false);
        }
    };

    const handleVerify = useCallback(async (imageSrc: string) => {
        setCapturing(false);
        setVerifying(true);
        setError(null);

        try {
            // Simulation of API call to /api/biometric/verify
            // In real world, we post 'imageSrc' to backend
            await new Promise(resolve => setTimeout(resolve, 2500));

            // Mock success
            toast.success("זיהוי ביומטרי הושלם בהצלחה", {
                icon: <ShieldCheck className="h-5 w-5 text-green-500" />
            });
            onVerified();
        } catch (err) {
            setError("זיהוי נכשל. אנא נסה שנית.");
            toast.error("זיהוי נכשל");
        } finally {
            setVerifying(false);
        }
    }, [onVerified]);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        if (imageSrc) {
            handleVerify(imageSrc);
        } else {
            setError("המצלמה לא זמינה");
        }
    }, [webcamRef, handleVerify]);


    return (
        <Dialog open={open} onOpenChange={(val) => !val && !verifying && onClose()}>
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-blue-400">
                        <ShieldCheck className="h-5 w-5" />
                        אימות זהות ביומטרי
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        משלוח זה מוגדר כרגיש. עליך לאמת זהות.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-700 shadow-inner">
                    {verifying ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-10">
                            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-blue-400 animate-pulse font-medium">מאמת זהות...</p>
                        </div>
                    ) : (
                        <>
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                className="w-full h-full object-cover"
                                mirrored
                            />
                            {/* Scanning Overlay UI */}
                            <div className="absolute inset-0 border-[3px] border-blue-500/30 rounded-lg pointer-events-none">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-dashed border-white/50 rounded-full" />
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 text-white px-3 py-2 rounded text-sm flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            {error}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button
                        variant="secondary"
                        onClick={handleWebAuthn}
                        disabled={verifying}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 h-auto py-3 flex flex-col gap-1 items-center justify-center border border-slate-700"
                    >
                        <Fingerprint className="h-6 w-6 text-blue-400" />
                        <span className="text-xs">זיהוי מכשיר (טביעת אצבע/פנים)</span>
                    </Button>

                    <Button
                        onClick={capture}
                        disabled={verifying}
                        className="bg-blue-600 hover:bg-blue-700 h-auto py-3 flex flex-col gap-1 items-center justify-center"
                    >
                        <Camera className="h-6 w-6" />
                        <span className="text-xs">צילום סלפי לאימות</span>
                    </Button>
                </div>

                <DialogFooter className="sm:justify-center mt-2">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={verifying}
                        className="text-slate-500 hover:text-slate-300 w-full"
                    >
                        ביטול
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
