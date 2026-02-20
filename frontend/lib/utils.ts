import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function playNotificationSound() {
    try {
        const audio = new Audio('/sounds/notification.mp3'); // Ensure this file exists or use a data URI
        audio.play().catch(e => console.log("Audio play failed", e));
    } catch (e) {
        console.log("Audio not supported");
    }
}
