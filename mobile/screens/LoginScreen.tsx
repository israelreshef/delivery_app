import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Image, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';
import { useCourierStore } from '../store';
import { API_URL } from '../config';
import { Colors } from '../constants/Colors';

export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { setToken, connect } = useCourierStore();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

    const handleLogin = async () => {
        if (!username || !password) {
            alert('Please fill in all fields');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok && data.token) {
                // Check if user is courier is done server side or we check profile next
                // For safety we can fetch profile immediately or assume server validated rights
                // Based on previous file we checked profile:

                const profileRes = await fetch(`${API_URL}/auth/profile`, {
                    headers: { 'Authorization': `Bearer ${data.token}` }
                });
                const profileData = await profileRes.json();

                if (profileData.user_type !== 'courier') {
                    throw new Error('Access denied: You are not a courier');
                }

                await setToken(data.token);
                connect();
            } else {
                throw new Error(data.error || 'Login failed');
            }

        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Login Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.container, { backgroundColor: theme.background }]}
        >
            <View style={styles.logoContainer}>
                <View style={styles.logoPlaceholder}>
                    <Text style={styles.logoText}>📦</Text>
                </View>
                <Text style={[styles.appName, { color: theme.text }]}>Courier App</Text>
                <Text style={[styles.tagline, { color: theme.subText }]}>Fast & Reliable Delivery</Text>
            </View>

            <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
                <Text style={[styles.label, { color: theme.text }]}>Username</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                    placeholder="Enter username"
                    placeholderTextColor={theme.subText}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                />

                <Text style={[styles.label, { color: theme.text }]}>Password</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                    placeholder="Enter password"
                    placeholderTextColor={theme.subText}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    style={[styles.loginBtn, { backgroundColor: theme.primary }]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.loginText}>Login</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        backgroundColor: '#007AFF',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    logoText: {
        fontSize: 40,
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    tagline: {
        fontSize: 16,
    },
    inputContainer: {
        padding: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 15,
        marginBottom: 20,
        fontSize: 16,
    },
    loginBtn: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    loginText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
