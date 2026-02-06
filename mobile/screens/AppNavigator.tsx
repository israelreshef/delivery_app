import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useCourierStore } from '../store';
import LoginScreen from './LoginScreen';
import HomeScreen from './HomeScreen';
import DeliveryDetailsScreen from './DeliveryDetailsScreen';
import ProofOfDeliveryScreen from './ProofOfDeliveryScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const { token } = useCourierStore();

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {token ? (
                    // App Stack
                    <>
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen
                            name="DeliveryDetails"
                            component={DeliveryDetailsScreen}
                            options={{ headerShown: true, title: 'Delivery Details' }}
                        />
                        <Stack.Screen
                            name="ProofOfDelivery"
                            component={ProofOfDeliveryScreen}
                            options={{ headerShown: true, title: 'Complete Delivery' }}
                        />
                    </>
                ) : (
                    // Auth Stack
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
