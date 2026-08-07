package com.tzir.delivery.courier.util

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import java.io.File

object DocumentOpener {

    fun mimeFor(format: String): String = when (format.lowercase()) {
        "pdf" -> "application/pdf"
        "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        else -> "application/octet-stream"
    }

    /**
     * Writes the given bytes to the app cache and opens them with an external viewer.
     * Returns true if an activity was launched successfully.
     */
    fun openBytes(context: Context, bytes: ByteArray, fileName: String, format: String): Boolean {
        return try {
            val dir = File(context.cacheDir, "documents").apply { mkdirs() }
            val file = File(dir, fileName)
            file.writeBytes(bytes)

            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                file
            )

            val viewIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, mimeFor(format))
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            val chooser = Intent.createChooser(viewIntent, "פתח מסמך").apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(chooser)
            true
        } catch (e: Exception) {
            false
        }
    }
}
