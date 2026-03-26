
pluginManagement {
    repositories {
        google()
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "TzirDelivery"
include(":courierApp")
include(":customerApp")

project(":courierApp").projectDir = file("courier-android")
project(":customerApp").projectDir = file("customer-android")
