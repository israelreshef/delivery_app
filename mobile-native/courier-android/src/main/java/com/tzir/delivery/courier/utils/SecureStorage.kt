package com.tzir.delivery.courier.utils

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

object SecureStorage {

    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val KEY_ALIAS = "tzir_delivery_master_key"
    private const val GCM_TAG_LENGTH = 128
    private const val GCM_IV_LENGTH = 12

    init {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)
        if (!keyStore.containsAlias(KEY_ALIAS)) {
            generateKey()
        }
    }

    private fun generateKey() {
        val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setInvalidatedByBiometricEnrollment(false)
            .build()
        keyGenerator.init(spec)
        keyGenerator.generateKey()
    }

    fun isHardwareBacked(): Boolean {
        return try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)
            val key = keyStore.getKey(KEY_ALIAS, null) as? SecretKey ?: return false
            val factory = SecretKeyFactory.getInstance(key.algorithm, ANDROID_KEYSTORE)
            val keyInfo = factory.getKeySpec(key, KeyInfo::class.java) as KeyInfo
            keyInfo.isInsideSecureHardware
        } catch (e: Exception) {
            false
        }
    }

    fun encrypt(data: String): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)
        val key = keyStore.getKey(KEY_ALIAS, null) as SecretKey

        cipher.init(Cipher.ENCRYPT_MODE, key)
        val iv = cipher.iv
        require(iv.size == GCM_IV_LENGTH) {
            "Generated IV length ${iv.size} != required $GCM_IV_LENGTH bytes"
        }

        val ciphertext = cipher.doFinal(data.toByteArray(Charsets.UTF_8))

        return Base64.encodeToString(iv, Base64.NO_WRAP) + ":" +
                Base64.encodeToString(ciphertext, Base64.NO_WRAP)
    }

    fun decrypt(encrypted: String): String? {
        return try {
            val parts = encrypted.split(":")
            if (parts.size != 2) return null

            val iv = Base64.decode(parts[0], Base64.NO_WRAP)
            if (iv.size != GCM_IV_LENGTH) return null

            val ciphertext = Base64.decode(parts[1], Base64.NO_WRAP)

            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            val spec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)

            val secretKey = try {
                keyStore.getKey(KEY_ALIAS, null) as? SecretKey
            } catch (e: KeyPermanentlyInvalidatedException) {
                regenerateKey()
                return null
            } ?: return null

            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)

            val decoded = cipher.doFinal(ciphertext)
            String(decoded, Charsets.UTF_8)
        } catch (e: Exception) {
            null
        }
    }

    private fun regenerateKey() {
        try {
            val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
            keyStore.load(null)
            keyStore.deleteEntry(KEY_ALIAS)
            generateKey()
        } catch (_: Exception) {
        }
    }
}
