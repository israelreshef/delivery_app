# Courier App CI Checks

**CRITICAL RULES:**
1. **Before marking any task done:** Always verify the app compiles successfully (`gradlew assembleDebug`) and reaches the login screen without crashing.
2. **TokenManager.kt safety:** Never change `TokenManager.kt` without running a full build (`gradlew clean assembleDebug`) immediately after to catch JVM signature collisions.
