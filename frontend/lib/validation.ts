/**
 * Validation utilities for form inputs
 */

/**
 * Validates Israeli phone number
 * Accepts formats: 050-1234567, 0501234567, 972501234567, +972501234567
 */
export function validatePhone(phone: string): { valid: boolean; message?: string } {
    if (!phone || phone.trim() === '') {
        return { valid: false, message: 'מספר טלפון הוא שדה חובה' };
    }

    // Remove spaces and dashes
    const cleaned = phone.replace(/[\s-]/g, '');

    // Israeli phone patterns
    const patterns = [
        /^0(5[0-9]|7[0-9])\d{7}$/,        // 050-1234567 (10 digits starting with 05x or 07x)
        /^972(5[0-9]|7[0-9])\d{7}$/,      // 972501234567
        /^\+972(5[0-9]|7[0-9])\d{7}$/,    // +972501234567
    ];

    const isValid = patterns.some(pattern => pattern.test(cleaned));

    if (!isValid) {
        return { valid: false, message: 'מספר טלפון לא תקין (לדוגמה: 050-1234567)' };
    }

    return { valid: true };
}

/**
 * Validates name field (Hebrew or English letters only)
 */
export function validateName(name: string): { valid: boolean; message?: string } {
    if (!name || name.trim() === '') {
        return { valid: false, message: 'שם הוא שדה חובה' };
    }

    // Allow Hebrew letters, English letters, spaces, hyphens, and apostrophes
    const namePattern = /^[\u0590-\u05FFa-zA-Z\s'-]+$/;

    if (!namePattern.test(name)) {
        return { valid: false, message: 'השם יכול להכיל רק אותיות בעברית או אנגלית' };
    }

    if (name.trim().length < 2) {
        return { valid: false, message: 'השם חייב להכיל לפחות 2 תווים' };
    }

    return { valid: true };
}

/**
 * Validates city name (Hebrew or English letters only)
 */
export function validateCity(city: string): { valid: boolean; message?: string } {
    if (!city || city.trim() === '') {
        return { valid: false, message: 'עיר היא שדה חובה' };
    }

    // Allow Hebrew letters, English letters, spaces, hyphens
    const cityPattern = /^[\u0590-\u05FFa-zA-Z\s-]+$/;

    if (!cityPattern.test(city)) {
        return { valid: false, message: 'שם העיר יכול להכיל רק אותיות בעברית או אנגלית' };
    }

    return { valid: true };
}

/**
 * Validates street name (Hebrew or English letters and numbers)
 */
export function validateStreet(street: string): { valid: boolean; message?: string } {
    if (!street || street.trim() === '') {
        return { valid: false, message: 'רחוב הוא שדה חובה' };
    }

    // Allow Hebrew letters, English letters, numbers, spaces, hyphens, apostrophes
    const streetPattern = /^[\u0590-\u05FFa-zA-Z0-9\s'-]+$/;

    if (!streetPattern.test(street)) {
        return { valid: false, message: 'שם הרחוב יכול להכיל אותיות ומספרים בלבד' };
    }

    return { valid: true };
}

/**
 * Validates building number (numbers only)
 */
export function validateBuildingNumber(number: string): { valid: boolean; message?: string } {
    if (!number || number.trim() === '') {
        return { valid: true }; // Building number is optional
    }

    // Allow numbers and optionally a letter (e.g., "12א")
    const numberPattern = /^\d+[א-ת]?$/;

    if (!numberPattern.test(number)) {
        return { valid: false, message: 'מספר בית לא תקין (לדוגמה: 12 או 12א)' };
    }

    return { valid: true };
}

/**
 * Validates floor number
 */
export function validateFloor(floor: string): { valid: boolean; message?: string } {
    if (!floor || floor.trim() === '') {
        return { valid: true }; // Floor is optional
    }

    // Allow numbers, negative numbers (for basement), and special values
    const floorPattern = /^-?\d+$/;

    if (!floorPattern.test(floor)) {
        return { valid: false, message: 'מספר קומה לא תקין' };
    }

    return { valid: true };
}

/**
 * Validates apartment number
 */
export function validateApartment(apartment: string): { valid: boolean; message?: string } {
    if (!apartment || apartment.trim() === '') {
        return { valid: true }; // Apartment is optional
    }

    // Allow numbers and optionally a letter
    const apartmentPattern = /^\d+[א-ת]?$/;

    if (!apartmentPattern.test(apartment)) {
        return { valid: false, message: 'מספר דירה לא תקין' };
    }

    return { valid: true };
}

/**
 * Formats phone number to Israeli standard format
 */
export function formatPhone(phone: string): string {
    const cleaned = phone.replace(/[\s-]/g, '');

    // If starts with 972 or +972, convert to 0
    let normalized = cleaned;
    if (normalized.startsWith('+972')) {
        normalized = '0' + normalized.slice(4);
    } else if (normalized.startsWith('972')) {
        normalized = '0' + normalized.slice(3);
    }

    // Format as 050-1234567
    if (normalized.length === 10 && normalized.startsWith('0')) {
        return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
    }

    return phone; // Return original if can't format
}
