import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

interface ValidatedInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: (value: string) => void;
    error?: string;
    placeholder?: string;
    required?: boolean;
    type?: string;
    className?: string;
}

export function ValidatedInput({
    label,
    value,
    onChange,
    onBlur,
    error,
    placeholder,
    required = false,
    type = "text",
    className = ""
}: ValidatedInputProps) {
    return (
        <div className={className}>
            <Label>
                {label} {required && <span className="text-red-500">*</span>}
            </Label>
            <Input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={(e) => onBlur?.(e.target.value)}
                placeholder={placeholder}
                className={error ? 'border-red-500 focus:border-red-500' : ''}
            />
            {error && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </p>
            )}
        </div>
    );
}
