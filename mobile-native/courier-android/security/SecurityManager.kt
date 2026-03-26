package com.tzir.delivery.courier.security

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import android.util.Base64

/**
 * Native Android SecurityManager for TZIR Courier.
 * Manages hardware-backed encryption keys via Android KeyStore.
 */
class SecurityManager {
    private val provider = "AndroidKeyStore"
    private val transformation = "AES/GCM/NoPadding"

    /**
     * Encrypts plain text using a hardware-backed AES key.
     * @param alias The key alias in the KeyStore
     * @param plainText The text to encrypt
     * @return Base64 encoded string in format "IV:Ciphertext"
     */
    fun encryptData(alias: String, plainText: String): String? {
        return try {
            val keyStore = KeyStore.getInstance(provider).apply { load(null) }
            if (!keyStore.containsAlias(alias)) {
                val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, provider)
                keyGenerator.init(
                    KeyGenParameterSpec.Builder(alias, 
                        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                        .setRandomizedEncryptionRequired(true)
                        .build()
                )
                keyGenerator.generateKey()
            }

            val secretKey = keyStore.getKey(alias, null) as SecretKey
            val cipher = Cipher.getInstance(transformation)
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)
            
            val iv = cipher.iv
            val encryption = cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))
            
            // Format: IV:Ciphertext (Base64 encoded)
            Base64.encodeToString(iv, Base64.NO_WRAP) + ":" + Base64.encodeToString(encryption, Base64.NO_WRAP)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    /**
     * Decrypts data previously encrypted by this manager.
     * @param alias The key alias in the KeyStore
     * @param encryptedBase64 The combined IV and ciphertext
     */
    fun decryptData(alias: String, encryptedBase64: String): String? {
        return try {
            val parts = encryptedBase64.split(":")
            if (parts.size != 2) return null
            
            val iv = Base64.decode(parts[0], Base64.NO_WRAP)
            val encryptedData = Base64.decode(parts[1], Base64.NO_WRAP)
            
            val keyStore = KeyStore.getInstance(provider).apply { load(null) }
            val secretKey = keyStore.getKey(alias, null) as? SecretKey ?: return null
            
            val cipher = Cipher.getInstance(transformation)
            val spec = GCMParameterSpec(128, iv)
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)
            
            val decoded = cipher.doFinal(encryptedData)
            String(decoded, Charsets.UTF_8)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
