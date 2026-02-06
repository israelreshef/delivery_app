"use client";

import { useEffect, useState } from "react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Loader2, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function PrivacyConsentModal() {
    const { user, isAuthenticated, login } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Validation:
        // 1. User must be logged in
        // 2. User hasn't accepted privacy policy (privacy_policy_accepted_at is null)
        // 3. User hasn't dismissed the modal in this session (checked via sessionStorage)

        const hasDismissed = sessionStorage.getItem("privacy_modal_dismissed");

        // TEMPORARILY DISABLED BY USER REQUEST
        // if (isAuthenticated && user && !user.privacy_policy_accepted_at && !hasDismissed) {
        //     setIsOpen(true);
        // } else {
        setIsOpen(false);
        // }
    }, [isAuthenticated, user]);

    const handleDismiss = () => {
        // User clicked 'X' / Close
        // Save dismissal to sessionStorage so it doesn't pop up again this session/refresh
        // If user logs out and back in, or opens new tab, it might pop up again - this fits "only once" reasonably well without permanent DB suppression
        sessionStorage.setItem("privacy_modal_dismissed", "true");
        setIsOpen(false);
    };

    const handleAccept = async () => {
        if (!user) return;

        setIsLoading(true);
        try {
            // 1. Call API to update consent
            await api.post('/auth/consent', {
                privacy_policy_accepted: true
            });

            // 2. Update local state manually to close modal immediately without reload
            const updatedUser = {
                ...user,
                privacy_policy_accepted_at: new Date().toISOString()
            };

            const token = localStorage.getItem('token');
            if (token) {
                login(token, updatedUser);
            }

            toast.success("מדיניות הפרטיות אושרה בהצלחה");
            setIsOpen(false);

        } catch (error) {
            console.error(error);
            toast.error("אירעה שגיאה באישור המדיניות. אנא נסה שוב.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => {
            // Allow closing via escape key or clicking outside ONLY if we want to allow dismissal.
            // Using onOpenChange to handle unexpected closing if needed, but the explicit buttons are better.
            if (!open) handleDismiss();
        }}>
            <AlertDialogContent className="max-w-md" dir="rtl">
                {/* Close Button X */}
                <button
                    onClick={handleDismiss}
                    className="absolute left-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">סגור</span>
                </button>

                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-bold text-primary">
                        עדכון מדיניות פרטיות
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-base text-foreground/80 mt-2">
                        שלום {user?.username},<br />
                        עדכנו את <Link href="/privacy" className="text-blue-600 underline hover:text-blue-800" target="_blank">מדיניות הפרטיות ותנאי השימוש</Link> שלנו.
                        <br /><br />
                        כדי להמשיך להשתמש במערכת, עליך לאשר שקראת והסכמת למדיניות החדשה.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:justify-start gap-2 mt-4 flex-col sm:flex-row">
                    <Button
                        onClick={handleAccept}
                        disabled={isLoading}
                        className="w-full sm:w-auto text-lg py-6"
                    >
                        {isLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                        אני מאשר/ת את המדיניות
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={handleDismiss}
                        className="w-full sm:w-auto mt-2 sm:mt-0 text-muted-foreground"
                    >
                        אזכיר לי אחר כך
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
