import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, useColorScheme, Switch, Alert, ActivityIndicator } from 'react-native';
import { useCourierStore } from '../store';
import { API_URL } from '../config';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
    const { token, logout } = useCourierStore();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch(`${API_URL}/auth/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    setProfile(data.user);
                }
            } catch (error) {
                console.error("Profile fetch error", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [token]);

    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", style: "destructive", onPress: logout }
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.primary }]}>
                <View style={styles.avatarContainer}>
                    <Ionicons name="person-circle" size={80} color="white" />
                </View>
                <Text style={styles.userName}>{profile?.full_name || 'Courier'}</Text>
                <Text style={styles.userEmail}>{profile?.email}</Text>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.subText }]}>Vehicle Information</Text>
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.row}>
                        <Ionicons name="car-outline" size={20} color={theme.primary} />
                        <View style={styles.rowText}>
                            <Text style={[styles.label, { color: theme.subText }]}>Type</Text>
                            <Text style={[styles.value, { color: theme.text }]}>Motorcycle (Standard)</Text>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.row}>
                        <Ionicons name="list-outline" size={20} color={theme.primary} />
                        <View style={styles.rowText}>
                            <Text style={[styles.label, { color: theme.subText }]}>License Plate</Text>
                            <Text style={[styles.value, { color: theme.text }]}>123-45-678</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.subText }]}>Settings</Text>
                <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.row}>
                        <Ionicons name="notifications-outline" size={20} color={theme.primary} />
                        <View style={styles.rowText}>
                            <Text style={[styles.value, { color: theme.text }]}>Push Notifications</Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: theme.border, true: theme.primary }}
                        />
                    </View>
                </View>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>

            <Text style={[styles.versionText, { color: theme.subText }]}>Version 1.0.0 (Build 42)</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 30,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    avatarContainer: {
        marginBottom: 12,
    },
    userName: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
    },
    userEmail: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginTop: 4,
    },
    section: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 4,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    rowText: {
        flex: 1,
        marginLeft: 12,
    },
    label: {
        fontSize: 12,
        marginBottom: 2,
    },
    value: {
        fontSize: 16,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginLeft: 48,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        padding: 16,
    },
    logoutButtonText: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    versionText: {
        textAlign: 'center',
        fontSize: 12,
        marginTop: 20,
        marginBottom: 40,
    },
});
