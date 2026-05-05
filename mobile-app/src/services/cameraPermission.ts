import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';

/**
 * Ensures camera access before opening the QR scanner.
 * - Android: runtime permission dialog (Allow / Deny).
 * - iOS: returns true; the camera view triggers the system prompt on first use.
 */
export async function ensureCameraForQrScanner(): Promise<boolean> {
    if (Platform.OS === 'android') {
        try {
            const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
                title: 'Allow camera access?',
                message: 'Nightclub needs the camera to scan guest QR codes at check-in.',
                buttonPositive: 'Allow',
                buttonNegative: 'Deny',
            });

            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                return true;
            }
            if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                Alert.alert(
                    'Camera blocked',
                    'To scan QR codes, enable camera access for Nightclub in your device settings.',
                    [
                        { text: 'Not now', style: 'cancel' },
                        { text: 'Open settings', onPress: () => void Linking.openSettings() },
                    ]
                );
                return false;
            }
            Alert.alert(
                'Camera access declined',
                'You can enable the camera later in Settings when you are ready to scan QR codes.'
            );
            return false;
        } catch {
            Alert.alert('Camera', 'Could not request camera access. Please try again.');
            return false;
        }
    }

    return true;
}
