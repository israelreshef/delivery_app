import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, useColorScheme, TouchableOpacity, RefreshControl } from 'react-native';
import { useCourierStore } from '../store';
import { API_URL } from '../config';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
    const { token } = useCourierStore();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ total_earnings: 0, completed_count: 0 });

    const fetchHistory = async () => {
        try {
            const res = await fetch(`${API_URL}/courier/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setHistory(data.history || []);
                setStats({
                    total_earnings: data.total_earnings || 0,
                    completed_count: data.completed_count || 0
                });
            }
        } catch (error) {
            console.error("History fetch error", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [token]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchHistory();
    };

    const renderItem = ({ item }) => (
        <View style={[styles.historyItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.itemHeader}>
                <Text style={[styles.dateText, { color: theme.subText }]}>{new Date(item.completed_at).toLocaleDateString()}</Text>
                <Text style={[styles.earningText, { color: theme.success }]}>₪{item.earning}</Text>
            </View>
            <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>
                {item.pickup_address} → {item.dropoff_address}
            </Text>
            <View style={styles.statusRow}>
                <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                <Text style={[styles.statusText, { color: theme.success }]}>Delivered</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.statsContainer, { backgroundColor: theme.primary }]}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Earned</Text>
                    <Text style={styles.statValue}>₪{stats.total_earnings}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Deliveries</Text>
                    <Text style={styles.statValue}>{stats.completed_count}</Text>
                </View>
            </View>

            <FlatList
                data={history}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="time-outline" size={60} color={theme.border} />
                        <Text style={[styles.emptyText, { color: theme.subText }]}>No completed deliveries yet</Text>
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
    statsContainer: {
        flexDirection: 'row',
        padding: 24,
        paddingTop: 60,
        alignItems: 'center',
        justifyContent: 'space-around',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    statBox: {
        alignItems: 'center',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginBottom: 4,
    },
    statValue: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    divider: {
        width: 1,
        height: 40,
    },
    listContent: {
        padding: 16,
    },
    historyItem: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    dateText: {
        fontSize: 12,
    },
    earningText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    addressText: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 8,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        fontSize: 12,
        marginLeft: 4,
        fontWeight: '600',
    },
    emptyState: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 10,
        fontSize: 16,
    }
});
