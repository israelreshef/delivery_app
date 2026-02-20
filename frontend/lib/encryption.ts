// lib/encryption.ts

/**
 * TZIR Secure Delivery - Client Side Encryption Utility
 * AES-GCM-256 + RSA-OAEP-256 Hybrid Encryption
 */

// המרת מחרוזת ל-ArrayBuffer
function str2ab(str: string): ArrayBuffer {
    const enc = new TextEncoder();
    return enc.encode(str).buffer;
}

// המרת ArrayBuffer למחרוזת Base64 (לשליחה לשרת)
function ab2base64(buf: ArrayBuffer): string {
    let binary = "";
    const bytes = new Uint8Array(buf);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// המרת מחרוזת בינארית (מ-atob) ל-ArrayBuffer תקין
function binaryStringToArrayBuffer(binary: string): ArrayBuffer {
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// המרת מפתח PEM למבנה שהדפדפן יודע לקרוא
function importPublicKey(pem: string): Promise<CryptoKey> {
    // ניקוי הדרים של PEM
    const pemHeader = "-----BEGIN PUBLIC KEY-----";
    const pemFooter = "-----END PUBLIC KEY-----";
    const pemContents = pem.substring(
        pem.indexOf(pemHeader) + pemHeader.length,
        pem.lastIndexOf(pemFooter)
    ).replace(/(\r\n|\n|\r)/gm, ""); // הסרת ירידות שורה

    // Base64 decode
    const binaryDerString = window.atob(pemContents);
    const binaryDer = binaryStringToArrayBuffer(binaryDerString);

    return window.crypto.subtle.importKey(
        "spki",
        binaryDer,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        true,
        ["encrypt"]
    );
}

export type EncryptedData = {
    encrypted_payload: string;
    encrypted_session_key: string;
    iv: string; // Initialization Vector (חובה לפענוח AES)
};

/**
 * פונקציה ראשית להצפנת מידע רגיש לפני שליחה
 * @param sensitiveData - המחרוזת או ה-JSON שרוצים להצפין
 * @param serverPublicKeyPEM - המפתח הציבורי של השרת (מחרוזת PEM)
 */
export async function clientEncryptSensitive(
    sensitiveData: string,
    serverPublicKeyPEM: string
): Promise<EncryptedData> {
    try {
        // 1. יצירת מפתח זמני (Session Key) מסוג AES-GCM
        const sessionKey = await window.crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256,
            },
            true,
            ["encrypt", "decrypt"]
        );

        // 2. יצירת וקטור אקראי (IV)
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        // 3. הצפנת המידע הרגיש עם המפתח הזמני
        const encodedData = str2ab(sensitiveData);
        const encryptedContent = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            sessionKey,
            encodedData
        );

        // 4. ייבוא המפתח הציבורי של השרת
        const serverKey = await importPublicKey(serverPublicKeyPEM);

        // 5. ייצוא המפתח הזמני ל-RAW כדי להצפין אותו
        const sessionKeyRaw = await window.crypto.subtle.exportKey("raw", sessionKey);

        // 6. הצפנת המפתח הזמני עם המפתח של השרת (RSA)
        const encryptedSessionKey = await window.crypto.subtle.encrypt(
            {
                name: "RSA-OAEP",
            },
            serverKey,
            sessionKeyRaw
        );

        // 7. החזרת התוצאה בפורמט שהשרת מצפה לקבל (Base64)
        // שים לב: ב-AES-GCM ה-encryptedContent מכיל גם את ה-Auth Tag בסוף.
        // השרת צריך את ה-IV לפענוח, אז נצרף אותו ל-Payload או כשדה נפרד.
        // כאן נשרשר: IV + EncryptedData (ניתן גם לשלוח בנפרד, אבל שרשור נוח יותר לשמירה ב-DB)

        const combinedPayload = new Uint8Array(iv.byteLength + encryptedContent.byteLength);
        combinedPayload.set(iv, 0);
        combinedPayload.set(new Uint8Array(encryptedContent), iv.byteLength);

        return {
            encrypted_payload: ab2base64(combinedPayload.buffer),
            encrypted_session_key: ab2base64(encryptedSessionKey),
            iv: ab2base64(iv.buffer) // לפעמים נוח לשמור גם בנפרד לדיבאג
        };

    } catch (err) {
        console.error("Encryption failed:", err);
        throw new Error("Failed to encrypt sensitive data");
    }
}
