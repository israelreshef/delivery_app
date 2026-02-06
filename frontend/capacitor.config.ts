import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.tzir.app',
    appName: 'TZIR Delivery',
    webDir: 'out',
    server: {
        // Live production server
        url: 'https://tzirdelivery.co.il',
        cleartext: true,
        androidScheme: 'https'
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: "#ffffff",
            showSpinner: true,
        },
    },
};

export default config;
