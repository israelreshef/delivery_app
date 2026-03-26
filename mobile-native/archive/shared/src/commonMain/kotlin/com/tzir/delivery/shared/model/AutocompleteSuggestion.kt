
package com.tzir.delivery.shared.model

import kotlinx.serialization.Serializable

@Serializable
data class AutocompleteSuggestion(
    val id: String,
    val street: String,
    val city: String,
    val number: String,
    val full_address: String,
    val place_id: String? = null,
    val source: String
)
