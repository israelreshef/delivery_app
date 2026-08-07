package com.tzir.delivery.courier

import com.tzir.delivery.courier.model.PaymentMethod
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Test

class PaymentMethodSerializationTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun `parse payment method from JSON`() {
        val input = """
            {
                "id": 1,
                "method_type": "bank_transfer",
                "label": "בנק הפועלים",
                "details": {"bank": "פועלים", "branch": "123", "account": "456789"},
                "is_default": true,
                "created_at": "2026-07-15T12:00:00"
            }
        """.trimIndent()

        val method = json.decodeFromString<PaymentMethod>(input)
        assertEquals(1, method.id)
        assertEquals("bank_transfer", method.methodType)
        assertEquals("בנק הפועלים", method.label)
        assertEquals(true, method.isDefault)
        assertEquals("456789", method.details["account"])
    }

    @Test
    fun `parse payment method list response`() {
        val input = """
            {
                "payment_methods": [
                    {"id": 1, "method_type": "bit", "label": "Bit שלי", "details": {"phone": "050-1234567"}, "is_default": true, "created_at": "2026-07-15T12:00:00"},
                    {"id": 2, "method_type": "paypal", "label": "PayPal שלי", "details": {"email": "test@example.com"}, "is_default": false, "created_at": "2026-07-15T13:00:00"}
                ]
            }
        """.trimIndent()

        val response = json.decodeFromString<PaymentMethodsResponse>(input)
        assertEquals(2, response.methods.size)
        assertEquals("bit", response.methods[0].methodType)
        assertEquals("paypal", response.methods[1].methodType)
    }
}

@kotlinx.serialization.Serializable
data class PaymentMethodsResponse(
    @kotlinx.serialization.SerialName("payment_methods") val methods: List<PaymentMethod>
)
