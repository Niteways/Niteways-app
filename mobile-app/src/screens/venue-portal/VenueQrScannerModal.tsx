import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Camera, CameraType } from 'react-native-camera-kit';

const GOLD = '#FFD700';
const BG = '#000000';

export type VenueQrScannerModalProps = {
    visible: boolean;
    onClose: () => void;
    /** Raw QR payload (e.g. guest row UUID from your printed codes). */
    onCodeScanned: (value: string) => void;
};

function readCodeFromEvent(event: {
    nativeEvent?: { codeStringValue?: string };
    codeStringValue?: string;
}): string {
    const v = event?.nativeEvent?.codeStringValue ?? event?.codeStringValue;
    return v != null ? String(v).trim() : '';
}

export function VenueQrScannerModal({ visible, onClose, onCodeScanned }: VenueQrScannerModalProps) {
    const insets = useSafeAreaInsets();
    const lastRef = useRef<{ value: string; at: number }>({ value: '', at: 0 });

    const onReadCode = useCallback(
        (event: { nativeEvent?: { codeStringValue?: string }; codeStringValue?: string }) => {
            const value = readCodeFromEvent(event);
            if (!value) return;
            const now = Date.now();
            if (lastRef.current.value === value && now - lastRef.current.at < 2000) {
                return;
            }
            lastRef.current = { value, at: now };
            onCodeScanned(value);
        },
        [onCodeScanned]
    );

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
            <View style={styles.root}>
                <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                    <TouchableOpacity
                        onPress={onClose}
                        hitSlop={14}
                        style={styles.closeHit}
                        accessibilityLabel="Close scanner"
                    >
                        <Icon name="close" size={28} color={GOLD} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Scan QR code</Text>
                    <View style={styles.closeHit} />
                </View>

                <View style={styles.cameraWrap}>
                    {visible ? (
                        <Camera
                            style={StyleSheet.absoluteFill}
                            cameraType={CameraType.Back}
                            flashMode="auto"
                            focusMode="on"
                            zoomMode="on"
                            torchMode="off"
                            scanBarcode
                            showFrame
                            laserColor={GOLD}
                            frameColor={GOLD}
                            onReadCode={onReadCode}
                        />
                    ) : null}
                </View>

                <View style={[styles.hintBar, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
                    <Text style={styles.hint}>Align the QR code inside the frame</Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BG,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingBottom: 10,
        zIndex: 2,
        backgroundColor: BG,
    },
    closeHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    title: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
    cameraWrap: {
        flex: 1,
        backgroundColor: '#0A0A0A',
    },
    hintBar: {
        paddingHorizontal: 20,
        paddingTop: 12,
        backgroundColor: BG,
    },
    hint: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 14,
        textAlign: 'center',
    },
});
