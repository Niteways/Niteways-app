import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useVenuePortal } from '../../context/VenuePortalContext';
import { VP } from './venuePortalTheme';

export function VenueMoreTab({ onSignOut }: { onSignOut: () => Promise<void> }) {
    const { venueName, error, refresh } = useVenuePortal();

    const logout = () => {
        Alert.alert('Log out', 'Sign out of the venue app?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log out',
                style: 'destructive',
                onPress: () => {
                    void onSignOut();
                },
            },
        ]);
    };

    return (
        <View style={styles.wrap}>
            <Text style={styles.title}>Venue</Text>
            <Text style={styles.sub}>Settings & account</Text>

            <View style={styles.card}>
                <Text style={styles.label}>Connected venue</Text>
                <Text style={styles.value}>{venueName || 'Not linked'}</Text>
                {error ? <Text style={styles.warn}>{error}</Text> : null}
                <TouchableOpacity style={styles.linkBtn} onPress={() => refresh()}>
                    <Icon name="refresh-outline" size={18} color={VP.gold} />
                    <Text style={styles.linkText}>Refresh venue link</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>Niteways</Text>
                <Text style={styles.body}>
                    This venue app uses the same Supabase project as the web dashboard. Table bookings and guest lists
                    update in real time when RLS allows.
                </Text>
            </View>

            <TouchableOpacity style={styles.logout} onPress={logout} activeOpacity={0.85}>
                <Icon name="log-out-outline" size={22} color="#000" />
                <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flex: 1, backgroundColor: VP.bg, padding: 20, paddingBottom: 100 },
    title: { color: VP.text, fontSize: 30, fontWeight: '800' },
    sub: { color: VP.muted, fontSize: 14, marginBottom: 20 },
    card: {
        backgroundColor: VP.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: VP.cardBorder,
        padding: 16,
        marginBottom: 14,
    },
    label: { color: VP.muted, fontSize: 12, fontWeight: '600', marginBottom: 6 },
    value: { color: VP.text, fontSize: 18, fontWeight: '700' },
    warn: { color: '#FCA5A5', fontSize: 13, marginTop: 10, lineHeight: 18 },
    body: { color: VP.muted, fontSize: 14, lineHeight: 21 },
    linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
    linkText: { color: VP.gold, fontSize: 15, fontWeight: '600' },
    logout: {
        marginTop: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: VP.gold,
        paddingVertical: 16,
        borderRadius: 14,
    },
    logoutText: { color: '#000', fontSize: 16, fontWeight: '800' },
});
