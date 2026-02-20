"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, Check } from "lucide-react";

interface SwipeButtonProps {
    onComplete: () => Promise<void> | void;
    text: string;
    completedText?: string;
    icon?: React.ReactNode;
    color?: "blue" | "green" | "red" | "purple";
    className?: string;
    disabled?: boolean;
}

export default function SwipeButton({
    onComplete,
    text,
    completedText = "הושלם",
    icon,
    color = "blue",
    className,
    disabled = false
}: SwipeButtonProps) {
    const [dragWidth, setDragWidth] = useState(0);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const sliderRef = useRef<HTMLDivElement>(null);

    const colors = {
        blue: { bg: "bg-blue-600", track: "bg-blue-100", text: "text-blue-600" },
        green: { bg: "bg-green-600", track: "bg-green-100", text: "text-green-600" },
        red: { bg: "bg-red-600", track: "bg-red-100", text: "text-red-600" },
        purple: { bg: "bg-purple-600", track: "bg-purple-100", text: "text-purple-600" },
    };

    const currentTheme = colors[color];

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || isCompleted || disabled) return;
            updateDrag(e.clientX);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isDragging || isCompleted || disabled) return;
            updateDrag(e.touches[0].clientX);
        };

        const handleMouseUp = () => endDrag();
        const handleTouchEnd = () => endDrag();

        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("touchmove", handleTouchMove);
            window.addEventListener("mouseup", handleMouseUp);
            window.addEventListener("touchend", handleTouchEnd);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("touchend", handleTouchEnd);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDragging, isCompleted, disabled]);

    const startDrag = () => {
        if (isCompleted || disabled) return;
        setIsDragging(true);
    };

    const updateDrag = (clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const maxWidth = rect.width - 50; // 50px is handle width

        let newWidth = Math.max(0, Math.min(offsetX, maxWidth));
        setDragWidth(newWidth);

        // Threshold to trigger completion (90%)
        if (newWidth >= maxWidth * 0.95) {
            completeSwipe();
        }
    };

    const endDrag = () => {
        if (isCompleted) return;
        setIsDragging(false);
        // Snap back if not completed
        setDragWidth(0);
    };

    const completeSwipe = async () => {
        setIsDragging(false);
        setDragWidth(containerRef.current ? containerRef.current.offsetWidth - 50 : 0);
        setIsCompleted(true);

        // Haptic feedback if available
        if (navigator.vibrate) navigator.vibrate(50);

        try {
            await onComplete();
            // Reset after delay (optional, depends on use case, here we might keep it or parent unmounts it)
        } catch (error) {
            // Revert on failure
            console.error("Action failed", error);
            setIsCompleted(false);
            setDragWidth(0);
        }
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative h-14 rounded-full overflow-hidden select-none touch-none transition-all",
                currentTheme.track,
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
            dir="ltr" // LTR for slider mechanics, text handled inside
        >
            {/* Background Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className={cn(
                    "font-bold text-lg tracking-wide transition-opacity duration-300 flex items-center gap-2",
                    isCompleted ? "opacity-0" : "opacity-100",
                    currentTheme.text
                )}>
                    {icon}
                    {text}
                </span>
                <div className={cn(
                    "absolute inset-0 flex items-center justify-center font-bold text-white z-20 transition-opacity duration-300",
                    isCompleted ? "opacity-100" : "opacity-0"
                )}>
                    {completedText}
                </div>
            </div>

            {/* Slider Track (Filled part) */}
            <div
                className={cn(
                    "absolute top-0 left-0 h-full transition-all duration-75 ease-linear",
                    isCompleted ? "w-full transition-all duration-500 ease-out" : "",
                    currentTheme.bg
                )}
                style={{ width: isCompleted ? '100%' : dragWidth + 50 }}
            />

            {/* Handle */}
            <div
                ref={sliderRef}
                onMouseDown={startDrag}
                onTouchStart={startDrag}
                style={{
                    transform: `translateX(${isCompleted ? '1000%' : dragWidth}px)`, // Move out of view when completed
                    transition: isDragging ? 'none' : 'transform 0.3s ease'
                }}
                className={cn(
                    "absolute top-1 left-1 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing z-10",
                    isCompleted && "hidden" // Hide handle on completion
                )}
            >
                {isCompleted ? (
                    <Check className={cn("w-6 h-6", currentTheme.text)} />
                ) : (
                    <ChevronRight className={cn("w-6 h-6", currentTheme.text)} />
                )}
            </div>
        </div>
    );
}
