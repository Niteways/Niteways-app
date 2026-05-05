import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { format, getDay } from 'date-fns';
import { useVenuePortal } from '../../context/VenuePortalContext';
import {
    useRealtimeGuestLists,
    DAYS_SUNDAY_FIRST,
    type RecurringListGuest,
    type GuestList,
} from '../../hooks/useRealtimeGuestLists';
import {
    fetchBookingsForVenue,
    subscribeTableBookingsVenue,
    type TableBookingRow,
} from '../../services/venuePortal';
import { ensureCameraForQrScanner } from '../../services/cameraPermission';
import { VenueQrScannerModal } from './VenueQrScannerModal';
import { VP, VP_PARTITION_LINE } from './venuePortalTheme';
import type { VenuePortalStackParamList } from './venuePortalTypes';

type Nav = StackNavigationProp<VenuePortalStackParamList, 'VenueMain'>;

const BG = '#000000';
const GOLD = '#FFD700';
const CARD = '#141414';
const CARD_BORDER = 'rgba(255,255,255,0.06)';
const SEGMENT_TRACK = '#252525';
const SEGMENT_ACTIVE = '#2A2A2A';
const MUTED = '#8E8E93';

type Segment = 'guests' | 'bookings';

export type CheckInGuestRow = RecurringListGuest & {
    sourceListKind: 'recurring' | 'oneday';
    sourceListId: string;
    sourceListName: string;
};

function partyTotal(g: RecurringListGuest) {
    return 1 + (g.plusGuests || 0);
}

function collectGuestsForToday(recurringLists: GuestList[], oneDayLists: GuestList[]): CheckInGuestRow[] {
    const todayDowName = DAYS_SUNDAY_FIRST[getDay(new Date())];
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const out: CheckInGuestRow[] = [];

    for (const list of recurringLists) {
        if (!list.isActive || list.dayOfWeek !== todayDowName) continue;
        for (const g of list.guests) {
            out.push({
                ...g,
                sourceListKind: 'recurring',
                sourceListId: list.id,
                sourceListName: list.name,
            });
        }
    }
    for (const list of oneDayLists) {
        if (!list.isActive || list.eventDate !== todayStr) continue;
        for (const g of list.guests) {
            out.push({
                ...g,
                sourceListKind: 'oneday',
                sourceListId: list.id,
                sourceListName: list.name,
            });
        }
    }
    return out;
}

function listTypePillStyle(listType: string): { bg: string; fg: string } {
    const t = listType.toLowerCase();
    if (t === 'aa') return { bg: GOLD, fg: '#000000' };
    if (t === 'vip') return { bg: '#7F1D1D', fg: '#FFFFFF' };
    return { bg: '#2A2A2A', fg: '#FFFFFF' };
}

export function VenueCheckInScreen({
    navigation,
    onBack,
}: {
    navigation: Nav;
    onBack: () => void;
}) {
    const { venueId, loading: venueLoading, error: venueError, refresh: refreshVenue } = useVenuePortal();
    const { recurringLists, oneDayLists, loading: listsLoading, refetch, checkInGuest } = useRealtimeGuestLists({
        venueId,
    });

    const [segment, setSegment] = useState<Segment>('guests');
    const [search, setSearch] = useState('');

    useEffect(() => {
        setSearch('');
    }, [segment]);
    const [bookings, setBookings] = useState<TableBookingRow[]>([]);
    const [bookingsLoading, setBookingsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [qrScannerOpen, setQrScannerOpen] = useState(false);

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const loadBookings = useCallback(async () => {
        if (!venueId) {
            setBookings([]);
            setBookingsLoading(false);
            return;
        }
        setBookingsLoading(true);
        const rows = await fetchBookingsForVenue(venueId);
        setBookings(rows);
        setBookingsLoading(false);
    }, [venueId]);

    useFocusEffect(
        useCallback(() => {
            void refetch();
            void loadBookings();
        }, [refetch, loadBookings])
    );

    React.useEffect(() => {
        if (!venueId) return () => {};
        return subscribeTableBookingsVenue(venueId, loadBookings);
    }, [venueId, loadBookings]);

    const allTodayGuests = useMemo(
        () => collectGuestsForToday(recurringLists, oneDayLists),
        [recurringLists, oneDayLists]
    );

    const todayBookings = useMemo(
        () => bookings.filter((b) => String(b.booking_date).slice(0, 10) === todayStr),
        [bookings, todayStr]
    );

    const filteredBookings = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return todayBookings;
        return todayBookings.filter((b) => {
            const hay = [b.guest_name, b.table_number, b.status, b.booking_time].join(' ').toLowerCase();
            return hay.includes(q);
        });
    }, [todayBookings, search]);

    const filteredGuests = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return allTodayGuests;
        return allTodayGuests.filter((g) => {
            const hay = [g.name, g.sourceListName, g.notes, g.promoter].filter(Boolean).join(' ').toLowerCase();
            return hay.includes(q);
        });
    }, [allTodayGuests, search]);

    const stats = useMemo(() => {
        const total = allTodayGuests.length;
        const checkedFull = allTodayGuests.filter((g) => {
            const t = partyTotal(g);
            const c = g.checkedInCount ?? 0;
            return c >= t;
        }).length;
        const pending = total - checkedFull;
        return { total, checkedFull, pending };
    }, [allTodayGuests]);

    const onRefresh = async () => {
        setRefreshing(true);
        await refreshVenue();
        await refetch();
        await loadBookings();
        setRefreshing(false);
    };

    const onQrScanResult = useCallback(
        (raw: string) => {
            const v = raw.trim();
            const row = allTodayGuests.find((g) => g.id === v);
            setQrScannerOpen(false);
            if (row) {
                const total = partyTotal(row);
                const cur = row.checkedInCount ?? 0;
                if (cur >= total) {
                    Alert.alert('Already checked in', `${row.name} is fully checked in.`);
                    return;
                }
                void (async () => {
                    const ok = await checkInGuest(row.id, cur, total, row.sourceListKind);
                    if (ok) {
                        Alert.alert('Checked in', row.name);
                    } else {
                        Alert.alert('Check-in failed', 'Could not update this guest. Try again from the list.');
                    }
                })();
                return;
            }
            Alert.alert(
                'Unknown QR code',
                `No guest on today’s list matches this code. Use the guest list to check in manually.\n\n${v.length > 120 ? `${v.slice(0, 120)}…` : v}`
            );
        },
        [allTodayGuests, checkInGuest]
    );

    const onQrPress = () => {
        void (async () => {
            const ok = await ensureCameraForQrScanner();
            if (ok) {
                setQrScannerOpen(true);
            }
        })();
    };

    const onGuestRowPress = (row: CheckInGuestRow) => {
        const total = partyTotal(row);
        const cur = row.checkedInCount ?? 0;
        if (cur >= total) {
            Alert.alert('Already checked in', `${row.name} and party are fully checked in.`);
            return;
        }
        void checkInGuest(row.id, cur, total, row.sourceListKind);
    };

    const renderGuest = ({ item }: { item: CheckInGuestRow }) => {
        const total = partyTotal(item);
        const cur = item.checkedInCount ?? 0;
        const done = cur >= total;
        const typeStyle = listTypePillStyle(item.listType);
        return (
            <TouchableOpacity
                style={styles.guestRow}
                onPress={() => onGuestRowPress(item)}
                activeOpacity={0.85}
            >
                <View style={[styles.guestIconCircle, done && styles.guestIconCircleDone]}>
                    <Icon name={done ? 'checkmark' : 'time-outline'} size={20} color={done ? VP.teal : MUTED} />
                </View>
                <View style={styles.guestMain}>
                    <View style={styles.guestNameRow}>
                        <Text style={styles.guestName} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <View style={styles.listKindBadge}>
                            <Text style={styles.listKindBadgeText}>{item.sourceListKind === 'recurring' ? 'R' : '1D'}</Text>
                        </View>
                    </View>
                    <View style={styles.pillsRow}>
                        <View style={[styles.typePill, { backgroundColor: typeStyle.bg }]}>
                            <Text style={[styles.typePillText, { color: typeStyle.fg }]}>{item.listType}</Text>
                        </View>
                        <Text style={styles.listNameHint} numberOfLines={1}>
                            {item.sourceListName}
                        </Text>
                    </View>
                </View>
                <View style={styles.guestRight}>
                    <Text style={styles.ratioText}>
                        {cur}/{total}
                    </Text>
                    {cur > 0 && !done ? (
                        <Text style={styles.inGold}>
                            {cur} in
                        </Text>
                    ) : null}
                </View>
            </TouchableOpacity>
        );
    };

    const renderBooking = ({ item }: { item: TableBookingRow }) => (
        <TouchableOpacity
            style={styles.bookingRow}
            onPress={() => navigation.navigate('VenueBookingDetail', { bookingId: item.id })}
            activeOpacity={0.85}
        >
            <Icon name="restaurant-outline" size={22} color={GOLD} />
            <View style={styles.bookingMid}>
                <Text style={styles.guestName} numberOfLines={1}>
                    {item.guest_name}
                </Text>
                <Text style={styles.bookingMeta} numberOfLines={1}>
                    Table {item.table_number} · {item.booking_time} · {item.status}
                </Text>
            </View>
            <Icon name="chevron-forward" size={20} color={MUTED} />
        </TouchableOpacity>
    );

    if (venueLoading && !venueId) {
        return (
            <View style={styles.fill}>
                <CheckInHeader onBack={onBack} />
                <View style={styles.center}>
                    <ActivityIndicator color={GOLD} size="large" />
                    <Text style={styles.muted}>Loading venue…</Text>
                </View>
            </View>
        );
    }

    if (!venueId) {
        return (
            <View style={styles.fill}>
                <CheckInHeader onBack={onBack} />
                <View style={styles.center}>
                    <Text style={styles.muted}>{venueError || 'No venue linked to this account.'}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => void refreshVenue()}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const listLoading = segment === 'guests' ? listsLoading : bookingsLoading;

    return (
        <View style={styles.fill}>
            <CheckInHeader onBack={onBack} />

            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{stats.total}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: VP.teal }]}>{stats.checkedFull}</Text>
                    <Text style={styles.statLabel}>Checked In</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statValue, { color: GOLD }]}>{stats.pending}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.qrBtn} onPress={onQrPress} activeOpacity={0.9}>
                <Icon name="qr-code-outline" size={28} color="#000000" />
                <Text style={styles.qrBtnText}>Open QR Scanner</Text>
            </TouchableOpacity>

            <View style={styles.searchWrap}>
                <Icon name="search-outline" size={20} color={MUTED} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={segment === 'guests' ? 'Search guests…' : 'Search bookings…'}
                    placeholderTextColor={MUTED}
                    value={search}
                    onChangeText={setSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>

            <View style={styles.segmentOuter}>
                <TouchableOpacity
                    style={[styles.segBtn, segment === 'guests' && styles.segBtnOn]}
                    onPress={() => setSegment('guests')}
                    activeOpacity={0.9}
                >
                    <Text style={[styles.segText, segment === 'guests' && styles.segTextOn]}>
                        Guest List ({allTodayGuests.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.segBtn, segment === 'bookings' && styles.segBtnOn]}
                    onPress={() => setSegment('bookings')}
                    activeOpacity={0.9}
                >
                    <Text style={[styles.segText, segment === 'bookings' && styles.segTextOn]}>
                        Table Bookings ({todayBookings.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {listLoading && !refreshing ? (
                <View style={styles.listLoading}>
                    <ActivityIndicator color={GOLD} />
                </View>
            ) : segment === 'guests' ? (
                <FlatList
                    data={filteredGuests}
                    keyExtractor={(g) => `${g.sourceListKind}-${g.id}`}
                    renderItem={renderGuest}
                    contentContainerStyle={[
                        styles.listPad,
                        filteredGuests.length === 0 && styles.listPadEmpty,
                    ]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            {search.trim()
                                ? 'No guests match your search.'
                                : 'No guest list entries for today. Recurring lists match today’s weekday; one-day lists match today’s date.'}
                        </Text>
                    }
                />
            ) : (
                <FlatList
                    data={filteredBookings}
                    keyExtractor={(b) => b.id}
                    renderItem={renderBooking}
                    contentContainerStyle={[
                        styles.listPad,
                        filteredBookings.length === 0 && styles.listPadEmpty,
                    ]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            {search.trim() ? 'No bookings match your search.' : 'No table bookings for today.'}
                        </Text>
                    }
                />
            )}

            <VenueQrScannerModal
                visible={qrScannerOpen}
                onClose={() => setQrScannerOpen(false)}
                onCodeScanned={onQrScanResult}
            />
        </View>
    );
}

function CheckInHeader({ onBack }: { onBack: () => void }) {
    return (
        <View>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backBtn} accessibilityLabel="Back">
                    <Icon name="chevron-back" size={26} color={GOLD} />
                </TouchableOpacity>
                <View style={styles.headerTitles}>
                    <Text style={styles.title}>Check In</Text>
                    <Text style={styles.subtitle}>Guest lists & table bookings · {format(new Date(), 'EEE, MMM d')}</Text>
                </View>
            </View>
            <View style={VP_PARTITION_LINE} />
        </View>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: BG },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    muted: { color: VP.muted, marginTop: 12, textAlign: 'center' },
    retryBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, backgroundColor: CARD },
    retryText: { color: GOLD, fontWeight: '700' },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 8,
        paddingTop: 4,
        paddingBottom: 12,
        backgroundColor: BG,
    },
    backBtn: { width: 40, paddingTop: 2, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitles: { flex: 1, minWidth: 0 },
    title: { color: VP.text, fontSize: 22, fontWeight: '800' },
    subtitle: { color: VP.muted, fontSize: 13, fontWeight: '500', marginTop: 4 },
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 12,
        paddingTop: 14,
        paddingBottom: 10,
    },
    statCard: {
        flex: 1,
        backgroundColor: CARD,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: CARD_BORDER,
    },
    statValue: { color: VP.text, fontSize: 22, fontWeight: '800' },
    statLabel: { color: MUTED, fontSize: 12, fontWeight: '600', marginTop: 4 },
    qrBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginHorizontal: 12,
        paddingVertical: 18,
        paddingHorizontal: 4,
        borderRadius: 16,
        minHeight: 52,
        backgroundColor: GOLD,
    },
    qrBtnText: { color: '#000000', fontSize: 17, fontWeight: '800' },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
        marginTop: 12,
        marginBottom: 10,
        backgroundColor: CARD,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        paddingHorizontal: 12,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, color: VP.text, fontSize: 16, paddingVertical: 12 },
    segmentOuter: {
        flexDirection: 'row',
        marginHorizontal: 12,
        marginBottom: 8,
        backgroundColor: SEGMENT_TRACK,
        borderRadius: 14,
        padding: 4,
        gap: 4,
    },
    segBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
    },
    segBtnOn: { backgroundColor: SEGMENT_ACTIVE },
    segText: { color: MUTED, fontSize: 13, fontWeight: '700' },
    segTextOn: { color: VP.text },
    listPad: { paddingHorizontal: 12, paddingBottom: 24 },
    listPadEmpty: { flexGrow: 1, justifyContent: 'center' },
    listLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: VP.muted, textAlign: 'center', fontSize: 15, paddingHorizontal: 20, marginTop: 32 },
    guestRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CARD,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        gap: 12,
    },
    guestIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1F1F1F',
        alignItems: 'center',
        justifyContent: 'center',
    },
    guestIconCircleDone: { backgroundColor: 'rgba(45, 212, 191, 0.15)' },
    guestMain: { flex: 1, minWidth: 0 },
    guestNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    guestName: { color: VP.text, fontSize: 16, fontWeight: '700', flexShrink: 1 },
    listKindBadge: {
        minWidth: 28,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(255, 215, 0, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    listKindBadgeText: { color: GOLD, fontSize: 11, fontWeight: '800' },
    pillsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
    typePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    typePillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    listNameHint: { color: MUTED, fontSize: 12, flex: 1 },
    guestRight: { alignItems: 'flex-end' },
    ratioText: { color: VP.text, fontSize: 15, fontWeight: '700' },
    inGold: { color: GOLD, fontSize: 13, fontWeight: '700', marginTop: 2 },
    bookingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CARD,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        gap: 12,
    },
    bookingMid: { flex: 1, minWidth: 0 },
    bookingMeta: { color: MUTED, fontSize: 13, marginTop: 4 },
});
