import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import type { StackNavigationProp } from '@react-navigation/stack';
import { fetchBookingById, updateBookingStatus, type TableBookingRow } from '../../services/venuePortal';
import { VP } from './venuePortalTheme';
import type { VenuePortalStackParamList } from './venuePortalTypes';
import { venuePortalSafeGoBack } from './venuePortalNavigation';

type Props = {
    route: { params: { bookingId: string } };
    navigation: StackNavigationProp<VenuePortalStackParamList, 'VenueBookingDetail'>;
};

export default function VenueBookingDetailScreen({ route, navigation }: Props) {
    const { bookingId } = route.params;
    const [row, setRow] = useState<TableBookingRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const b = await fetchBookingById(bookingId);
        setRow(b);
        setLoading(false);
    }, [bookingId]);

    useEffect(() => {
        load();
    }, [load]);

    const setStatus = async (status: 'confirmed' | 'declined' | 'cancelled') => {
        if (!row) return;
        setBusy(true);
        const { ok, error } = await updateBookingStatus(row.id, status);
        setBusy(false);
        if (!ok) {
            Alert.alert('Update failed', error || 'Could not update booking');
            return;
        }
        await load();
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={VP.gold} size="large" />
            </View>
        );
    }

    if (!row) {
        return (
            <View style={styles.center}>
                <Text style={styles.muted}>Booking not found.</Text>
                <TouchableOpacity onPress={() => venuePortalSafeGoBack(navigation)} style={styles.backLink}>
                    <Text style={styles.backLinkText}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => venuePortalSafeGoBack(navigation)} hitSlop={12}>
                    <Icon name="chevron-back" size={28} color={VP.gold} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Booking</Text>
                <View style={{ width: 28 }} />
            </View>
            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
                <Text style={styles.status}>{row.status}</Text>
                <Text style={styles.guest}>{row.guest_name}</Text>
                <Text style={styles.venue}>{row.venues?.name || 'Venue'}</Text>

                <View style={styles.card}>
                    <Row label="Table" value={row.table_number} />
                    <Row label="Party size" value={String(row.party_size)} />
                    <Row label="Date" value={row.booking_date} />
                    <Row label="Time" value={(row.booking_time || '').slice(0, 5)} />
                    <Row label="Price" value={row.price != null ? `$${Number(row.price).toFixed(0)}` : '—'} />
                    {row.guest_email ? <Row label="Email" value={row.guest_email} /> : null}
                    {row.guest_phone ? <Row label="Phone" value={row.guest_phone} /> : null}
                    {row.notes ? <Row label="Notes" value={row.notes} /> : null}
                </View>

                {row.status === 'pending' ? (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnGold]}
                            disabled={busy}
                            onPress={() => setStatus('confirmed')}
                        >
                            <Text style={styles.btnGoldText}>{busy ? '…' : 'Approve'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, styles.btnOutline]}
                            disabled={busy}
                            onPress={() =>
                                Alert.alert('Decline?', 'Mark this request as declined?', [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Decline', style: 'destructive', onPress: () => setStatus('declined') },
                                ])
                            }
                        >
                            <Text style={styles.btnOutlineText}>Decline</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {row.status === 'confirmed' ? (
                    <TouchableOpacity
                        style={[styles.btn, styles.btnOutline, { marginTop: 12 }]}
                        disabled={busy}
                        onPress={() =>
                            Alert.alert('Cancel booking?', undefined, [
                                { text: 'No', style: 'cancel' },
                                { text: 'Cancel booking', style: 'destructive', onPress: () => setStatus('cancelled') },
                            ])
                        }
                    >
                        <Text style={styles.btnOutlineText}>Cancel booking</Text>
                    </TouchableOpacity>
                ) : null}
            </ScrollView>
        </View>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: VP.bg },
    center: { flex: 1, backgroundColor: VP.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    headerTitle: { color: VP.text, fontSize: 21, fontWeight: '800' },
    body: { padding: 20, paddingBottom: 40 },
    status: { color: VP.gold, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    guest: { color: VP.text, fontSize: 28, fontWeight: '800', marginTop: 6 },
    venue: { color: VP.muted, fontSize: 15, marginTop: 4 },
    card: {
        marginTop: 20,
        backgroundColor: VP.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: VP.cardBorder,
        padding: 16,
    },
    row: { marginBottom: 12 },
    rowLabel: { color: VP.muted, fontSize: 12, fontWeight: '600' },
    rowValue: { color: VP.text, fontSize: 16, marginTop: 2 },
    actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    btn: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    btnGold: { backgroundColor: VP.gold },
    btnGoldText: { color: '#000', fontSize: 16, fontWeight: '800' },
    btnOutline: { borderWidth: 1.5, borderColor: VP.goldDim, backgroundColor: 'transparent' },
    btnOutlineText: { color: VP.gold, fontSize: 16, fontWeight: '700' },
    muted: { color: VP.muted },
    backLink: { marginTop: 16 },
    backLinkText: { color: VP.gold, fontSize: 16, fontWeight: '600' },
});
