"use client";

import { useChatStore } from "@/lib/stores/chatStore";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StartChatButtonProps {
    className?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    showLabel?: boolean;
}

export default function StartChatButton({
    className,
    variant = "outline",
    size = "default",
    showLabel = true
}: StartChatButtonProps) {
    const { toggle, setIsOpen } = useChatStore();

    return (
        <Button
            onClick={() => setIsOpen(true)}
            variant={variant}
            size={size}
            className={cn("gap-2", className)}
        >
            <MessageSquare className="w-4 h-4" />
            {showLabel && "צ'אט תמיכה"}
        </Button>
    );
}
