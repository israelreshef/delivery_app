import { z } from "zod";

const phoneRegex = /^05\d-?\d{7}$/;

// Shared Address Schema
export const addressSchema = z.object({
    street: z.string().min(2, "נא להזין שם רחוב"),
    city: z.string().min(2, "נא להזין עיר"),
    number: z.string().min(1, "מס' בית"),
    floor: z.string().optional(),
    apartment: z.string().optional(),
    entrance: z.string().optional(),
    elevator: z.boolean(),
    notes: z.string().optional(),
    lat: z.coerce.number().optional(),
    lon: z.coerce.number().optional(),
});

// Step 1: Sender Details
export const senderSchema = z.object({
    senderName: z.string().min(2, "שם מלא חייב להכיל לפחות 2 תווים"),
    senderPhone: z.string().regex(phoneRegex, "מספר טלפון לא תקין (05X-XXXXXXX)"),
    senderAddress: addressSchema,
});

// Step 2: Recipient Details
export const recipientSchema = z.object({
    recipientName: z.string().min(2, "שם מקבל חייב להכיל לפחות 2 תווים"),
    recipientPhone: z.string().regex(phoneRegex, "מספר טלפון לא תקין (05X-XXXXXXX)"),
    recipientAddress: addressSchema,
});

// Step 3: Package Details
export const packageSchema = z.object({
    packageSize: z.enum(["envelope", "small", "medium", "large", "custom"]),
    packageWeight: z.coerce.number().min(0.1, "משקל חייב להיות גדול מ-0").max(50, "מקסימום 50 ק\"ג").optional(),
    packageContent: z.string().min(3, "נא לפרט את תכולת החבילה"),
    isFragile: z.boolean(),
    keepCold: z.boolean(),
    isLegal: z.boolean().default(false),
    recipientId: z.string().optional(),
}).refine((data) => !data.isLegal || (data.recipientId && data.recipientId.length >= 8), {
    message: "חובה להזין ת.ז. עבור מסירה משפטית",
    path: ["recipientId"],
});

// Step 4: Service Type
export const serviceSchema = z.object({
    serviceType: z.enum(["regular", "express", "same_day"]),
    deliveryType: z.enum(["standard", "legal_document", "valuable"]),
    insuranceRequired: z.boolean(),
    insuranceValue: z.coerce.number().min(0).default(0),
    scheduledTime: z.date().optional(), // For future scheduling
});

// Step 5: Payment (Placeholder for UI validation)
export const paymentSchema = z.object({
    paymentMethod: z.enum(["credit_card", "bit", "apple_pay"]),
    cardHolder: z.string().optional(), // Only for credit_card
    last4: z.string().optional(), // To display stored card
});

// Combined Schema for final submission
export const orderWizardSchema = z.object({
    sender: senderSchema,
    recipient: recipientSchema,
    package: packageSchema,
    service: serviceSchema,
    payment: paymentSchema,
});

export type OrderWizardData = z.infer<typeof orderWizardSchema>;
