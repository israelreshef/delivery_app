import { create } from 'zustand';
import { z } from 'zod';
import { orderWizardSchema, senderSchema, recipientSchema, packageSchema, serviceSchema, paymentSchema } from '../schemas/wizardSchemas';

// Helper types for individual steps
type SenderData = z.infer<typeof senderSchema>;
type RecipientData = z.infer<typeof recipientSchema>;
type PackageData = z.infer<typeof packageSchema>;
type ServiceData = z.infer<typeof serviceSchema>;
type PaymentData = z.infer<typeof paymentSchema>;

interface WizardState {
    currentStep: number;

    // Data for each step
    sender: Partial<SenderData>;
    recipient: Partial<RecipientData>;
    packageDetails: Partial<PackageData>;
    service: Partial<ServiceData>;
    payment: Partial<PaymentData>;

    // Price Estimation (Calculated from API)
    estimatedPrice: number;
    estimatedDistance: number;
    estimatedDuration: number;

    // Actions
    setStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;

    updateSender: (data: Partial<SenderData>) => void;
    updateRecipient: (data: Partial<RecipientData>) => void;
    updatePackage: (data: Partial<PackageData>) => void;
    updateService: (data: Partial<ServiceData>) => void;
    updatePayment: (data: Partial<PaymentData>) => void;

    setEstimates: (price: number, distance: number, duration: number) => void;
    resetWizard: () => void;
}

const initialAddress = {
    street: '',
    city: '',
    number: '',
    floor: '',
    apartment: '',
    entrance: '',
    elevator: false,
    notes: ''
};

export const useWizardStore = create<WizardState>((set) => ({
    currentStep: 1,

    sender: { senderAddress: { ...initialAddress } },
    recipient: { recipientAddress: { ...initialAddress } },
    packageDetails: { isFragile: false, keepCold: false, isLegal: false },
    service: {
        serviceType: 'regular',
        deliveryType: 'standard',
        insuranceRequired: false,
        insuranceValue: 0
    },
    payment: { paymentMethod: 'credit_card' },

    estimatedPrice: 0,
    estimatedDistance: 0,
    estimatedDuration: 0,

    setStep: (step) => set({ currentStep: step }),
    nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 6) })),
    prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),

    updateSender: (data) => set((state) => ({
        sender: {
            ...state.sender,
            ...data,
            senderAddress: {
                ...state.sender.senderAddress,
                ...(data.senderAddress || {})
            } as any
        }
    })),
    updateRecipient: (data) => set((state) => ({
        recipient: {
            ...state.recipient,
            ...data,
            recipientAddress: {
                ...state.recipient.recipientAddress,
                ...(data.recipientAddress || {})
            } as any
        }
    })),
    updatePackage: (data) => set((state) => ({
        packageDetails: { ...state.packageDetails, ...data }
    })),
    updateService: (data) => set((state) => ({
        service: { ...state.service, ...data }
    })),
    updatePayment: (data) => set((state) => ({
        payment: { ...state.payment, ...data }
    })),

    setEstimates: (price, distance, duration) => set({
        estimatedPrice: price,
        estimatedDistance: distance,
        estimatedDuration: duration
    }),

    resetWizard: () => set({
        currentStep: 1,
        sender: { senderAddress: { ...initialAddress } },
        recipient: { recipientAddress: { ...initialAddress } },
        packageDetails: { isFragile: false, keepCold: false, isLegal: false },
        service: { serviceType: 'regular' },
        payment: { paymentMethod: 'credit_card' },
        estimatedPrice: 0
    })
}));
