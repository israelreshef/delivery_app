import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, FlatList, RefreshControl, useColorScheme } from 'react-native';
import * as Location from 'expo-location';
import { useCourierStore } from '../store';
import { API_URL } from '../config';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const ShiftTimer = () => {
    const [seconds, setSeconds] = useState(0);
    const { isShiftActive } = useCourierStore();

    useEffect(() => {
        let interval: any;
        if (isShiftActive) {
            interval = setInterval(() => {
                setSeconds(prev => prev + 1);
            }, 1000);
        } else {
            setSeconds(0);
        }
        return () => clearInterval(interval);
    }, [isShiftActive]);

    const formatTime = (s: number) => {
        const hrs = Math.floor(s / 3600);
        const mins = Math.floor((s % 3600) / 60);
        const secs = s % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return <Text style={styles.timerText}>{formatTime(seconds)}</Text>;
};

export default function HomeScreen() {
    const { isConnected, token, logout, courierId, setCourierId, activeOrders, isShiftActive, toggleShift } = useCourierStore();
    const navigation = useNavigation();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

    const [locationStatus, setLocationStatus] = useState('Offline');
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [courierName, setCourierName] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Fetch Courier Profile on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch(`${API_URL}/auth/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) {
                    throw new Error('Failed to fetch profile');
                }

                const data = await res.json();

                if (data.courier) {
                    setCourierId(data.courier.id);
                    setCourierName(data.courier.full_name);
                } else {
                    Alert.alert('Error', 'No courier profile found for this user');
                    logout();
                }
            } catch (error) {
                console.error("Profile fetch error", error);
                Alert.alert('Error', 'Failed to load profile');
            } finally {
                setLoadingProfile(false);
            }
        };

        fetchProfile();
    }, [token]);

    // Update location status display based on shift
    useEffect(() => {
        if (isShiftActive) {
            setLocationStatus('Active - Tracking Location');
        } else {
            setLocationStatus('Shift Ended - Offline');
        }
    }, [isShiftActive]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // Simulate refresh or fetch orders from API
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
    }, []);

    const renderOrder = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.orderCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => navigation.navigate('DeliveryDetails' as any, { order: item } as any)}
        >
            <View style={styles.orderHeader}>
                <View style={styles.orderIdContainer}>
                    <Ionicons name="cube-outline" size={18} color={theme.primary} style={{ marginRight: 5 }} />
                    <Text style={[styles.orderId, { color: theme.text }]}>#{item.order_number}</Text>
                </View>
                <Text style={[styles.orderStatus, { color: theme.subText, backgroundColor: theme.inputBackground }]}>{item.status}</Text>
            </View>
            <View style={styles.addressContainer}>
                <Ionicons name="location-outline" size={16} color={theme.subText} style={{ marginRight: 5, marginTop: 2 }} />
                <Text style={[styles.orderAddress, { color: theme.subText }]}>{item.address?.street}, {item.address?.city}</Text>
            </View>
            <Text style={[styles.timeAgo, { color: theme.subText }]}>Just now</Text>
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.greetingLabel, { color: theme.subText }]}>Good Morning,</Text>
                    <Text style={[styles.greeting, { color: theme.text }]}>{courierName}</Text>
                </View>
                <View style={styles.statusContainer}>
                    <View style={[styles.statusBadgeContainer, { backgroundColor: isConnected ? theme.success + '20' : theme.danger + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: isConnected ? theme.success : theme.danger }]} />
                        <Text style={[styles.statusBadge, { color: isConnected ? theme.success : theme.danger }]}>
                            {isConnected ? 'Online' : 'Offline'}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={[styles.shiftControl, { backgroundColor: theme.card }]}>
                <View style={[styles.circle, isShiftActive ? styles.activeCircle : styles.inactiveCircle, { borderColor: theme.background }]}>
                    <Ionicons name={isShiftActive ? "bicycle" : "power"} size={40} color="white" />
                    <Text style={styles.statusText}>
                        {isShiftActive ? 'ON SHIFT' : 'OFF SHIFT'}
                    </Text>
                    {isShiftActive && <ShiftTimer />}
                </View>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: isShiftActive ? theme.warning : theme.primary }]}
                    onPress={toggleShift}
                >
                    <Text style={styles.btnText}>
                        {isShiftActive ? 'End Shift' : 'Start Shift'}
                    </Text>
                </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Active Orders</Text>
        </View>
    );

    if (loadingProfile) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{ marginTop: 10, color: theme.subText }}>Loading Profile...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <FlatList
                data={activeOrders}
                renderItem={renderOrder}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="clipboard-outline" size={50} color={theme.border} />
                        <Text style={[styles.emptyText, { color: theme.subText }]}>No active orders</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        padding: 20,
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 30,
    },
    greetingLabel: {
        fontSize: 14,
        marginBottom: 2,
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    statusContainer: {
        alignItems: 'flex-end',
    },
    statusBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 8,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    statusBadge: {
        fontSize: 12,
        fontWeight: '600',
    },
    shiftControl: {
        alignItems: 'center',
        marginBottom: 30,
        padding: 24,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    circle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 4,
    },
    activeCircle: { backgroundColor: '#34C759' }, // Fixed color for brand consistency
    inactiveCircle: { backgroundColor: '#FF3B30' },
    statusText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 5,
    },
    timerText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
        fontFamily: 'monospace',
    },
    actionButton: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    btnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    orderCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        // Shadow handled by native elevation for Android, simple border for clean look
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        alignItems: 'center',
    },
    orderIdContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    orderId: {
        fontWeight: '700',
        fontSize: 16,
    },
    orderStatus: {
        fontSize: 11,
        fontWeight: '600',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        overflow: 'hidden',
        textTransform: 'uppercase',
    },
    addressContainer: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'flex-start',
    },
    orderAddress: {
        fontSize: 15,
        flex: 1,
        lineHeight: 20,
    },
    timeAgo: {
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.6,
    },
    emptyText: {
        marginTop: 10,
        fontSize: 16,
    }
});
