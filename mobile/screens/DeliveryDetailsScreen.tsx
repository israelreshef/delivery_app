import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, useColorScheme } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useCourierStore } from '../store';
import Toast from 'react-native-toast-message';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function DeliveryDetailsScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { order } = route.params as { order: any };
    const { isConnected } = useCourierStore();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

    if (!order) return <View style={[styles.container, { backgroundColor: theme.background }]}><Text style={{ color: theme.text }}>No order data</Text></View>;

    const handleNavigate = () => {
        const address = `${order.address.street}, ${order.address.city}`;
        const url = `https://waze.com/ul?q=${encodeURIComponent(address)}`;
        Linking.openURL(url).catch(() => {
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
        });
    };

    const handleCall = () => {
        if (order.customer_phone) {
            Linking.openURL(`tel:${order.customer_phone}`);
        } else {
            Toast.show({ type: 'error', text1: 'No phone number available' });
        }
    };

    const handleStatusUpdate = (status: string) => {
        if (!isConnected) {
            Toast.show({
                type: 'info',
                text1: 'Offline Mode',
                text2: 'Status update saved to queue.'
            });
            // Queue logic will be handled in store action (to be implemented)
        }
        // Mock success for now until store action is ready
        Toast.show({ type: 'success', text1: `Status updated to ${status}` });
        navigation.goBack();
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={styles.headerRow}>
                    <Text style={[styles.orderId, { color: theme.text }]}>Order #{order.order_number}</Text>
                    <Text style={[styles.status, { color: theme.subText, backgroundColor: theme.inputBackground }]}>{order.status}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.subText }]}>PICKUP ADDRESS</Text>
                    <View style={styles.row}>
                        <Ionicons name="location" size={20} color={theme.primary} style={{ marginRight: 8 }} />
                        <Text style={[styles.value, { color: theme.text }]}>{order.address.street}, {order.address.city}</Text>
                    </View>
                </View>

                {order.customer_name && (
                    <View style={styles.section}>
                        <Text style={[styles.label, { color: theme.subText }]}>CUSTOMER</Text>
                        <View style={styles.row}>
                            <Ionicons name="person" size={20} color={theme.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.value, { color: theme.text }]}>{order.customer_name}</Text>
                        </View>
                    </View>
                )}

                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                <View style={styles.actions}>
                    <TouchableOpacity style={[styles.btn, styles.navBtn]} onPress={handleNavigate}>
                        <Ionicons name="navigate" size={20} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.btnText}>Navigate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.btn, styles.callBtn]} onPress={handleCall}>
                        <Ionicons name="call" size={20} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.btnText}>Call</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.statusActions}>
                    <TouchableOpacity style={[styles.btn, styles.actionBtn]} onPress={() => handleStatusUpdate('PICKED_UP')}>
                        <Text style={styles.btnText}>Mark Picked Up</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.btn, styles.successBtn]}
                        onPress={() => navigation.navigate('ProofOfDelivery' as any, { order } as any)}
                    >
                        <Text style={styles.btnText}>Complete Delivery</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 15 },
    card: { borderRadius: 16, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    orderId: { fontSize: 24, fontWeight: 'bold' },
    status: { fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden', textTransform: 'uppercase' },
    section: { marginBottom: 20 },
    label: { fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
    row: { flexDirection: 'row', alignItems: 'center' },
    value: { fontSize: 18, fontWeight: '500', flex: 1 },
    divider: { height: 1, width: '100%', marginBottom: 20 },
    actions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    btn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', marginHorizontal: 6, flexDirection: 'row', justifyContent: 'center' },
    navBtn: { backgroundColor: '#007AFF' },
    callBtn: { backgroundColor: '#34C759' },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    statusActions: { marginTop: 10 },
    actionBtn: { backgroundColor: '#FF9500', marginBottom: 12 },
    successBtn: { backgroundColor: '#30D158' }
});
