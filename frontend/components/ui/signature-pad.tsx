"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, RotateCcw } from 'lucide-react';

interface SignaturePadProps {
    onSave: (dataUrl: string, recipientName?: string, recipientId?: string) => void;
    onCancel: () => void;
    isLegalDelivery?: boolean;
}

export default function SignaturePad({ onSave, onCancel, isLegalDelivery }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);

    // Legal Fields
    const [recipientName, setRecipientName] = useState("");
    const [recipientId, setRecipientId] = useState("");

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        // Configure drawing style
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        setIsEmpty(false);

        const rect = canvas.getBoundingClientRect();
        const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsEmpty(true);
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas || isEmpty) return;

        if (isLegalDelivery && (!recipientName || !recipientId)) {
            alert("חובה למלא שם מלא ומספר תעודת זהות למסירה משפטית");
            return;
        }

        const dataUrl = canvas.toDataURL('image/png');
        // If legal, we append the details to the save callback (or handle differently, but here we assume onSave takes extras or we modify the call in parent)
        // Since the interface is fixed, we might need to modify the interface or how we pass data.
        // For now, let's assume we pass an object or modifying the string is hacky. 
        // Better: Update the interface in the file.
        onSave(dataUrl, recipientName, recipientId);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">חתימה דיגיטלית</h3>
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {isLegalDelivery && (
                    <div className="bg-purple-50 p-3 rounded-lg text-sm text-purple-900 border border-purple-200">
                        <p className="font-bold mb-2">📜 מסירה משפטית - זיהוי חובה</p>
                        <div className="space-y-2">
                            <input
                                type="text"
                                placeholder="שם המקבל (מלא)"
                                className="w-full p-2 border rounded text-right"
                                value={recipientName}
                                onChange={e => setRecipientName(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="תעודת זהות (9 ספרות)"
                                className="w-full p-2 border rounded text-right"
                                value={recipientId}
                                onChange={e => setRecipientId(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white relative">
                    <canvas
                        ref={canvasRef}
                        className="w-full h-64 touch-none cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                    {isEmpty && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400">
                            חתום כאן
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <Button variant="outline" onClick={clearCanvas} className="flex-1">
                        <RotateCcw className="w-4 h-4 mr-2" /> נקה
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isEmpty || (isLegalDelivery && (!recipientName.trim() || !recipientId.trim()))}
                        className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                        אשר מסירה
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Update Interface for Parent Components
// Note: Parent components using this might break if they expect only string.
// We need to update ActiveDeliveryCard.tsx as well.
