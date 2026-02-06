"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Copy, Loader2, QrCode, Shield, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function TwoFactorSetup() {
    const { user, login } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'initial' | 'qr' | 'success'>('initial');
    const [qrCode, setQrCode] = useState("");
    const [secret, setSecret] = useState("");
    const [verifyCode, setVerifyCode] = useState("");

    const fetchSetupData = async () => {
        setLoading(true);
        try {
            const res = await api.post('/auth/2fa/setup');
            setQrCode(res.data.qr_code);
            setSecret(res.data.secret);
            setStep('qr');
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to start 2FA setup");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        setLoading(true);
        try {
            const res = await api.post('/auth/2fa/verify-and-enable', {
                code: verifyCode
            });

            setStep('success');
            toast.success("2FA Enabled Successfully!");

            // Update local user state
            if (user) {
                // Since this component is inside the AuthProvider context, 
                // we technically should assume the user object is updated on next fetch/refresh.
                // But for immediate UI feedback without reload:
                const updatedUser = { ...user, is_two_factor_enabled: true };
                // We use the existing token
                const token = sessionStorage.getItem('tzir_auth_token');
                if (token) login(token, updatedUser);
            }

        } catch (error: any) {
            toast.error(error.response?.data?.error || "Verification failed");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(secret);
        toast.success("Secret copied to clipboard");
    };

    if (user?.is_two_factor_enabled) {
        return (
            <Card className="border-green-100 bg-green-50/50">
                <CardHeader>
                    <CardTitle className="text-green-700 flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Two-Factor Authentication is Enabled
                    </CardTitle>
                    <CardDescription className="text-green-600/80">
                        Your account is secured with 2FA.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                                Disable 2FA
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md" dir="rtl">
                            <DialogHeader>
                                <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                                <DialogDescription>
                                    Enter your current verification code to disable 2FA
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Verification Code</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="000000"
                                            className="text-center text-lg tracking-[0.5em]"
                                            maxLength={6}
                                            value={verifyCode}
                                            onChange={(e) => setVerifyCode(e.target.value)}
                                        />
                                        <Button
                                            onClick={async () => {
                                                setLoading(true);
                                                try {
                                                    await api.post('/auth/2fa/disable', { code: verifyCode });
                                                    toast.success("2FA Disabled Successfully!");

                                                    // Update local user state
                                                    if (user) {
                                                        const updatedUser = { ...user, is_two_factor_enabled: false };
                                                        const token = sessionStorage.getItem('tzir_auth_token');
                                                        if (token) login(token, updatedUser);
                                                    }
                                                    window.location.reload();
                                                } catch (error: any) {
                                                    toast.error(error.response?.data?.error || "Failed to disable 2FA");
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            disabled={loading || verifyCode.length !== 6}
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disable"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-orange-100 bg-orange-50/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                    <ShieldAlert className="w-5 h-5" />
                    Enhance Account Security
                </CardTitle>
                <CardDescription>
                    Enable Two-Factor Authentication (2FA) to protect your account.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={fetchSetupData} variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-100 hover:text-orange-900">
                            <QrCode className="w-4 h-4 ml-2" />
                            Enable 2FA Now
                        </Button>
                    </DialogTrigger>

                    <DialogContent className="sm:max-w-md" dir="rtl">
                        <DialogHeader>
                            <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
                            <DialogDescription>
                                Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
                            </DialogDescription>
                        </DialogHeader>

                        {step === 'qr' && (
                            <div className="space-y-6 py-4">
                                <div className="flex justify-center bg-white p-4 rounded-lg border">
                                    {qrCode ? (
                                        <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                                    ) : (
                                        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Manual Entry Code</Label>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-slate-100 rounded text-sm font-mono flex-1 text-center tracking-widest">
                                            {secret}
                                        </div>
                                        <Button size="icon" variant="ghost" onClick={copyToClipboard}>
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Verification Code</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="000000"
                                            className="text-center text-lg tracking-[0.5em]"
                                            maxLength={6}
                                            value={verifyCode}
                                            onChange={(e) => setVerifyCode(e.target.value)}
                                        />
                                        <Button onClick={handleVerify} disabled={loading || verifyCode.length !== 6}>
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 'success' && (
                            <div className="py-6 text-center space-y-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold text-green-700">2FA Enabled!</h3>
                                <p className="text-slate-600">Your account is now more secure.</p>
                                <Button className="w-full" onClick={() => setIsOpen(false)}>Close</Button>
                            </div>
                        )}

                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
