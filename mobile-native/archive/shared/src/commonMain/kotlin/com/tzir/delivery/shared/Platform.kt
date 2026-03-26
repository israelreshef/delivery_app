
package com.tzir.delivery.shared

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform
