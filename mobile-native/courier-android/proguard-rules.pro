# Keep Tzir courier app classes
-keep class com.tzir.delivery.** { *; }

# Retrofit / OkHttp
-keepclassmembers class * {
    @retrofit2.http.* <methods>;
}
-keep class retrofit2.** { *; }
-keep class okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn retrofit2.**

# Kotlin Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keep class kotlinx.serialization.** { *; }
-keep @kotlinx.serialization.Serializable class * { *; }

# Ktor
-keep class io.ktor.** { *; }
-dontwarn io.ktor.**

# Compose
-keep class androidx.compose.** { *; }

# Firebase + FCM
-keep class com.google.firebase.** { *; }

# Socket.IO
-keep class io.socket.** { *; }
-dontwarn io.socket.**

# Google Play Integrity
-keep class com.google.android.play.** { *; }
