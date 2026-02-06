import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { useCourierStore } from './store';

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Background location task error:', error);
        return;
    }
    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        const location = locations[0];
        if (location) {
            // Direct access to store might not work outside React context if not careful, 
            // but Zustand stores can be accessed directly.
            // utilization of 'getState()' to access store outside of components.
            const state = useCourierStore.getState();
            if (state.isShiftActive && state.isConnected) {
                state.sendLocation(location.coords.latitude, location.coords.longitude);
                console.log('📍 Background Location:', location.coords.latitude, location.coords.longitude);
            }
        }
    }
});

export const startBackgroundLocation = async () => {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status === 'granted') {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000, // 10 seconds
            distanceInterval: 20, // 20 meters
            showsBackgroundLocationIndicator: true,
            foregroundService: {
                notificationTitle: "Delivery App",
                notificationBody: "Tracking your location for deliveries",
            }
        });
        console.log('Background location started');
    } else {
        console.log('Background location permission denied');
    }
};

export const stopBackgroundLocation = async () => {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log('Background location stopped');
    }
};
