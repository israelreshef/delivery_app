import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ScrollView, Alert, Modal, useColorScheme } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import SignatureScreen from 'react-native-signature-canvas';
import { useCourierStore } from '../store';
import Toast from 'react-native-toast-message';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function ProofOfDeliveryScreen() {
    const route = useRoute();
    const navigation = useNavigation();
    const { order } = route.params as { order: any };
    const { addToQueue, courierId } = useCourierStore();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

    const [photo, setPhoto] = useState<string | null>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [isSignatureModalVisible, setSignatureModalVisible] = useState(false);
    const signatureRef = useRef<any>();

    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera permission is required to take proof of delivery.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, // Updated: deprecated 'Images' fits, check version if 'MediaTypeOptions' needed
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setPhoto(result.assets[0].uri);
        }
    };

    const handleSignatureOK = (signatureScheme: string) => {
        setSignature(signatureScheme); // Base64 signature
        setSignatureModalVisible(false);
    };

    const handleClearSignature = () => {
        signatureRef.current?.clearSignature();
    };

    const handleSubmit = async () => {
        if (!photo && !signature) {
            Alert.alert('Missing Info', 'Please provide at least a photo or a signature.');
            return;
        }

        const payload = {
            order_id: order.id,
            courier_id: courierId,
            status: 'DELIVERED',
            proof_image: photo, // In real app, upload this first and send URL, or send base64 if small
            signature: signature,
            timestamp: new Date().toISOString()
        };

        // Add to offline queue / send
        // We use a generic 'update_order' action or specific 'complete_delivery'
        addToQueue('complete_delivery', payload);

        Toast.show({
            type: 'success',
            text1: 'Delivery Completed!',
            text2: 'Proof of delivery saved.'
        });

        navigation.navigate('Home' as never);
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.headerContainer}>
                <Text style={[styles.header, { color: theme.text }]}>Proof of Delivery</Text>
                <Text style={[styles.subHeader, { color: theme.subText }]}>Order #{order.order_number}</Text>
            </View>

            <View style={styles.section}>
                <Text style={[styles.label, { color: theme.text }]}>1. Photo of Package</Text>
                {photo ? (
                    <View>
                        <Image source={{ uri: photo }} style={[styles.previewImage, { backgroundColor: theme.inputBackground }]} />
                        <TouchableOpacity onPress={() => setPhoto(null)} style={styles.retakeBtn}>
                            <Ionicons name="refresh" size={16} color={theme.danger} />
                            <Text style={[styles.retakeText, { color: theme.danger }]}> Retake Photo</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={[styles.cameraBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border }]} onPress={handleTakePhoto}>
                        <Ionicons name="camera" size={40} color={theme.subText} />
                        <Text style={[styles.cameraText, { color: theme.subText }]}>Tap to Take Photo</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.section}>
                <Text style={[styles.label, { color: theme.text }]}>2. Customer Signature</Text>
                {signature ? (
                    <View>
                        <Image source={{ uri: signature }} style={[styles.previewSignature, { backgroundColor: 'white' }]} />
                        <TouchableOpacity onPress={() => setSignature(null)} style={styles.retakeBtn}>
                            <Ionicons name="refresh" size={16} color={theme.danger} />
                            <Text style={[styles.retakeText, { color: theme.danger }]}> Clear Signature</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={[styles.signatureBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setSignatureModalVisible(true)}>
                        <Ionicons name="pencil" size={30} color={theme.primary} />
                        <Text style={[styles.signatureText, { color: theme.primary }]}>Tap to Sign</Text>
                    </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.success }]} onPress={handleSubmit}>
                <Text style={styles.submitText}>Complete Delivery</Text>
                <Ionicons name="checkmark-circle" size={24} color="white" style={{ marginLeft: 10 }} />
            </TouchableOpacity>

            <Modal visible={isSignatureModalVisible} animationType="slide">
                <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>Customer Signature</Text>
                    <View style={[styles.signatureBox, { borderColor: theme.border }]}>
                        <SignatureScreen
                            ref={signatureRef}
                            onOK={handleSignatureOK}
                            onEmpty={() => console.log('Empty')}
                            descriptionText="Sign above"
                            clearText="Clear"
                            confirmText="Save"
                            webStyle={`.m-signature-pad--footer { display: none; margin: 0px; } body,html { width: 100%; height: 100%; }`}
                        />
                    </View>
                    <View style={styles.modalActions}>
                        <TouchableOpacity style={[styles.modalBtnCancel, { backgroundColor: theme.danger }]} onPress={() => setSignatureModalVisible(false)}>
                            <Text style={styles.modalBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalBtnClear, { backgroundColor: theme.warning }]} onPress={handleClearSignature}>
                            <Text style={styles.modalBtnText}>Clear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalBtnSave, { backgroundColor: theme.primary }]} onPress={() => signatureRef.current?.readSignature()}>
                            <Text style={styles.modalBtnText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    headerContainer: { marginBottom: 30 },
    header: { fontSize: 28, fontWeight: '800', marginBottom: 5 },
    subHeader: { fontSize: 16 },
    section: { marginBottom: 30 },
    label: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
    cameraBtn: {
        height: 180,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderStyle: 'dashed'
    },
    cameraText: { fontSize: 16, marginTop: 10, fontWeight: '500' },
    previewImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: 10 },
    retakeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8 },
    retakeText: { fontSize: 14, fontWeight: '600' },
    signatureBtn: {
        height: 120,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    signatureText: { fontSize: 16, fontWeight: '600', marginTop: 8 },
    previewSignature: { width: '100%', height: 120, resizeMode: 'contain', borderRadius: 16, borderWidth: 1, borderColor: '#eee' },
    submitBtn: {
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginTop: 10,
        marginBottom: 60,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5
    },
    submitText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    modalContainer: { flex: 1, padding: 20, paddingTop: 60 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    signatureBox: { flex: 1, borderWidth: 1, marginBottom: 20, borderRadius: 10, overflow: 'hidden' },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalBtnCancel: { padding: 16, borderRadius: 12, flex: 1, marginRight: 10, alignItems: 'center' },
    modalBtnClear: { padding: 16, borderRadius: 12, flex: 1, marginRight: 10, alignItems: 'center' },
    modalBtnSave: { padding: 16, borderRadius: 12, flex: 1, alignItems: 'center' },
    modalBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
