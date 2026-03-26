package com.tzir.delivery.shared.utils

/**
 * Security Manager for device-level hardware encryption.
 * Android: Utilizes Android Keystore (Tee/StrongBox)
 * iOS: Utilizes Secure Enclave / CryptoKit
 */
expect class SecurityManager() {
    /**
     * Encrypt sensitive data using a hardware-backed key.
     * The key is generated and stored securely on first use.
     */
    fun encryptData(alias: String, plainText: String): String?

    /**
     * Decrypt data previously encrypted with the hardware-backed key.
     */
    fun decryptData(alias: String, encryptedBase64: String): String?
}
