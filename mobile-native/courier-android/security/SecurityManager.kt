package com.tzir.delivery.courier.security

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyInfo
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec

class SecurityManager {
    private val provider = "AndroidKeyStore"
    private val transformation = "AES/GCM/NoPadding"
    private val gcmTagLength = 128

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
                        .setKeySize(256)
                        .setRandomizedEncryptionRequired(true)
                        .setInvalidatedByBiometricEnrollment(false)
                        .build()
                )
                keyGenerator.generateKey()
            }

            val secretKey = keyStore.getKey(alias, null) as SecretKey
            val cipher = Cipher.getInstance(transformation)
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)

            val iv = cipher.iv
            val encryption = cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))

            Base64.encodeToString(iv, Base64.NO_WRAP) + ":" +
                    Base64.encodeToString(encryption, Base64.NO_WRAP)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun decryptData(alias: String, encryptedBase64: String): String? {
        return try {
            val parts = encryptedBase64.split(":")
            if (parts.size != 2) return null

            val iv = Base64.decode(parts[0], Base64.NO_WRAP)
            val encryptedData = Base64.decode(parts[1], Base64.NO_WRAP)

            val keyStore = KeyStore.getInstance(provider).apply { load(null) }

            val secretKey = try {
                keyStore.getKey(alias, null) as? SecretKey
            } catch (e: KeyPermanentlyInvalidatedException) {
                keyStore.deleteEntry(alias)
                return null
            } ?: return null

            val cipher = Cipher.getInstance(transformation)
            val spec = GCMParameterSpec(gcmTagLength, iv)
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)

            val decoded = cipher.doFinal(encryptedData)
            String(decoded, Charsets.UTF_8)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun isHardwareBacked(alias: String): Boolean {
        return try {
            val keyStore = KeyStore.getInstance(provider).apply { load(null) }
            val key = keyStore.getKey(alias, null) as? SecretKey ?: return false
            val factory = SecretKeyFactory.getInstance(key.algorithm, provider)
            val keyInfo = factory.getKeySpec(key, KeyInfo::class.java) as KeyInfo
            keyInfo.isInsideSecureHardware
        } catch (e: Exception) {
            false
        }
    }
}
