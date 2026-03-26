import React, { useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Plus, X } from "lucide-react"

interface PhoneListEditorProps {
    primaryPhone: string
    onPrimaryPhoneChange: (val: string) => void
    additionalPhones: string[]
    onAdditionalPhonesChange: (phones: string[]) => void
    disabled?: boolean
    primaryLabel?: string
}

export function PhoneListEditor({
    primaryPhone,
    onPrimaryPhoneChange,
    additionalPhones,
    onAdditionalPhonesChange,
    disabled = false,
    primaryLabel = "טלפון ראשי"
}: PhoneListEditorProps) {
    const lastInputRef = useRef<HTMLInputElement>(null)

    const addPhone = () => {
        if (disabled) return
        onAdditionalPhonesChange([...additionalPhones, ""])
    }

    const updatePhone = (index: number, val: string) => {
        const newPhones = [...additionalPhones]
        newPhones[index] = val
        onAdditionalPhonesChange(newPhones)
    }

    const removePhone = (index: number) => {
        const newPhones = [...additionalPhones]
        newPhones.splice(index, 1)
        onAdditionalPhonesChange(newPhones)
    }

    // Auto focus the last input when a new one is added
    useEffect(() => {
        if (additionalPhones.length > 0 && additionalPhones[additionalPhones.length - 1] === "") {
            lastInputRef.current?.focus()
        }
    }, [additionalPhones.length])

    return (
        <div className="space-y-3">
            <div className="space-y-2">
                <Label>{primaryLabel}</Label>
                <div className="flex items-center gap-2">
                    <Input
                        value={primaryPhone}
                        disabled={disabled}
                        onChange={(e) => onPrimaryPhoneChange(e.target.value)}
                        placeholder="0500000000"
                        dir="ltr"
                        className="text-right"
                    />
                    {!disabled && (
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={addPhone}
                            className="shrink-0 h-10 w-10 text-brand"
                            title="הוסף טלפון נוסף"
                            disabled={additionalPhones.length >= 5 || (additionalPhones.length > 0 && !additionalPhones[additionalPhones.length - 1].trim())}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {additionalPhones.length > 0 && (
                <div className="space-y-2 pl-2 border-r-2 border-brand/20 mr-1 pr-3">
                    {additionalPhones.map((phone, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <Input
                                ref={index === additionalPhones.length - 1 ? lastInputRef : null}
                                value={phone}
                                disabled={disabled}
                                onChange={(e) => updatePhone(index, e.target.value)}
                                placeholder="מספר פלאפון נוסף"
                                dir="ltr"
                                className="text-right"
                            />
                            {!disabled && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removePhone(index)}
                                    className="shrink-0 h-10 w-10 text-destructive hover:bg-destructive/10"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
