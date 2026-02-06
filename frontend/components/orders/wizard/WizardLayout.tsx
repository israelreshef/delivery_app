"use client";

import { useWizardStore } from "@/lib/stores/wizardStore";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const steps = [
    { number: 1, title: "פרטי שולח" },
    { number: 2, title: "פרטי מקבל" },
    { number: 3, title: "פרטי חבילה" },
    { number: 4, title: "סוג משלוח" },
    { number: 5, title: "תשלום" },
];

export function WizardLayout({ children }: { children: React.ReactNode }) {
    const { currentStep, prevStep } = useWizardStore();
    const progress = (currentStep / steps.length) * 100;

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4" dir="rtl">
            <div className="max-w-3xl mx-auto">

                {/* Header & Progress */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            {currentStep > 1 && (
                                <Button variant="ghost" size="icon" onClick={prevStep} className="shrink-0">
                                    <ArrowRight className="h-5 w-5" />
                                </Button>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">יצירת משלוח חדש</h1>
                                <p className="text-slate-500 text-sm">שלב {currentStep} מתוך {steps.length}: {steps[currentStep - 1].title}</p>
                            </div>
                        </div>
                        <div className="text-slate-400 font-mono text-sm hidden sm:block">
                            ORD-{new Date().getFullYear()}-TEMP
                        </div>
                    </div>

                    {/* Desktop Steps Indicator */}
                    <div className="hidden sm:flex justify-between items-center relative mb-8 px-2">
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -z-10 -translate-y-1/2"></div>
                        {steps.map((step) => {
                            const isActive = step.number === currentStep;
                            const isCompleted = step.number < currentStep;

                            return (
                                <div key={step.number} className="flex flex-col items-center bg-white px-2">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2
                                        ${isActive ? 'border-blue-600 bg-blue-600 text-white shadow-md scale-110' :
                                                isCompleted ? 'border-green-500 bg-green-50 text-green-600' : 'border-slate-200 bg-white text-slate-400'}`}
                                    >
                                        {isCompleted ? <Check className="w-4 h-4" /> : step.number}
                                    </div>
                                    <span className={`text-xs mt-2 font-medium ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Mobile Progress Bar */}
                    <div className="sm:hidden w-full">
                        <Progress value={progress} className="h-2" />
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden min-h-[400px]">
                    {children}
                </div>

            </div>
        </div>
    );
}
