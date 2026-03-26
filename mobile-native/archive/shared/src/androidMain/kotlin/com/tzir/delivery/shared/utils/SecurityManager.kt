package com.tzir.delivery.shared.utils

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import android.util.Base64

actual class SecurityManager actual constructor() {
    private val provider = "AndroidKeyStore"

    actual fun encryptData(alias: String, plainText: String): String? {
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
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)
            
            val iv = cipher.iv
            val encryption = cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))
            
            // Format: IV:Ciphertext (Base64 encoded)
            Base64.encodeToString(iv, Base64.DEFAULT) + ":" + Base64.encodeToString(encryption, Base64.DEFAULT)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    actual fun decryptData(alias: String, encryptedBase64: String): String? {
        return try {
            val parts = encryptedBase64.split(":")
            if (parts.size != 2) return null
            
            val iv = Base64.decode(parts[0], Base64.DEFAULT)
            val encryptedData = Base64.decode(parts[1], Base64.DEFAULT)
            
            val keyStore = KeyStore.getInstance(provider).apply { load(null) }
            val secretKey = keyStore.getKey(alias, null) as SecretKey
            
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
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
