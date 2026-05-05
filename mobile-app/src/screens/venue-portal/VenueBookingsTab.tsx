import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    TextInput,
    Platform,
    InteractionManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useVenuePortal } from '../../context/VenuePortalContext';
import {
    fetchBookingsForVenue,
    fetchGuestListForVenue,
    subscribeGuestListVenue,
    subscribeTableBookingsVenue,
    type GuestListEntryRow,
    type TableBookingRow,
} from '../../services/venuePortal';
import { format } from 'date-fns';
import { VP, VP_PARTITION_LINE } from './venuePortalTheme';
import { TableBookingDatePickerModal, type DatePickerAnchor } from './TableBookingDatePickerModal';

type Filter = 'all' | 'pending' | 'today';
type RequestsSegment = 'tables' | 'guest_lists';

export function VenueBookingsTab({
    initialFilter,
    onOpenBooking,
    onBack,
}: {
    initialFilter: Filter;
    onOpenBooking: (id: string) => void;
    /** e.g. return to More hub from the Requests tab */
    onBack?: () => void;
}) {
    const { venueId, refresh: refreshVenuePortal } = useVenuePortal();
    const [filter, setFilter] = useState<Filter>(initialFilter);
    const [bookings, setBookings] = useState<TableBookingRow[]>([]);
    const [guestRows, setGuestRows] = useState<GuestListEntryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [segment, setSegment] = useState<RequestsSegment>('tables');
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [datePickerAnchor, setDatePickerAnchor] = useState<DatePickerAnchor | null>(null);
    const dateFieldRef = useRef<View>(null);

    useEffect(() => {
        setFilter(initialFilter);
    }, [initialFilter]);

    const loadBookings = useCallback(async () => {
        if (!venueId) {
            setBookings([]);
            return;
        }
        const rows = await fetchBookingsForVenue(venueId);
        setBookings(rows);
    }, [venueId]);

    const loadGuests = useCallback(async () => {
        if (!venueId) {
            setGuestRows([]);
            return;
        }
        const rows = await fetchGuestListForVenue(venueId);
        setGuestRows(rows);
    }, [venueId]);

    const loadAll = useCallback(async () => {
        if (!venueId) {
            setBookings([]);
            setGuestRows([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        await Promise.all([loadBookings(), loadGuests()]);
        setLoading(false);
    }, [venueId, loadBookings, loadGuests]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    useEffect(() => {
        if (!venueId) return () => {};
        const unsubB = subscribeTableBookingsVenue(venueId, loadBookings);
        const unsubG = subscribeGuestListVenue(venueId, loadGuests);
        return () => {
            unsubB();
            unsubG();
        };
    }, [venueId, loadBookings, loadGuests]);

    const onRefresh = async () => {
        setRefreshing(true);
        const id = await refreshVenuePortal();
        if (id) {
            const [b, g] = await Promise.all([fetchBookingsForVenue(id), fetchGuestListForVenue(id)]);
            setBookings(b);
            setGuestRows(g);
        } else {
            setBookings([]);
            setGuestRows([]);
        }
        setRefreshing(false);
    };

    const today = format(new Date(), 'yyyy-MM-dd');
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dateLabel = format(selectedDate, 'MMMM do, yyyy');

    const openDatePicker = useCallback(() => {
        const tryMeasure = (attempt: number) => {
            dateFieldRef.current?.measureInWindow((x, y, width, height) => {
                const ok = width >= 12 && height >= 12;
                if (!ok && attempt < 4) {
                    setTimeout(() => tryMeasure(attempt + 1), 48);
                    return;
                }
                if (!ok) return;
                setDatePickerAnchor({ x, y, width, height });
                setDatePickerOpen(true);
            });
        };
        InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => requestAnimationFrame(() => tryMeasure(0)));
        });
    }, []);

    const closeDatePicker = useCallback(() => {
        setDatePickerOpen(false);
        setDatePickerAnchor(null);
    }, []);

    const q = search.trim().toLowerCase();

    const pendingOnDate = useMemo(
        () => bookings.filter((b) => b.status === 'pending' && b.booking_date === dateStr),
        [bookings, dateStr]
    );

    const guestsOnDate = useMemo(
        () => guestRows.filter((g) => g.event_date === dateStr),
        [guestRows, dateStr]
    );

    const tablesBadgeCount = pendingOnDate.length;
    const guestBadgeCount = guestsOnDate.length;

    const filteredTables = useMemo(() => {
        if (!q) return pendingOnDate;
        return pendingOnDate.filter((b) => {
            const name = (b.guest_name || '').toLowerCase();
            const tbl = String(b.table_number || '').toLowerCase();
            return name.includes(q) || tbl.includes(q);
        });
    }, [pendingOnDate, q]);

    const filteredGuests = useMemo(() => {
        if (!q) return guestsOnDate;
        return guestsOnDate.filter((g) => (g.guest_name || '').toLowerCase().includes(q));
    }, [guestsOnDate, q]);

    const filteredLegacy = useMemo(() => {
        let list = bookings.filter((b) => b.status !== 'blocked');
        if (filter === 'pending') list = list.filter((b) => b.status === 'pending');
        if (filter === 'today') list = list.filter((b) => b.booking_date === today);
        return list;
    }, [bookings, filter, today]);

    const chips: { key: Filter; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'pending', label: 'Requests' },
        { key: 'today', label: 'Tonight' },
    ];

    if (venueId && loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={VP.gold} size="large" />
            </View>
        );
    }

    /** Booking Requests — full layout (Requests tab uses pending only) */
    if (filter === 'pending') {
        const emptyMsg = `No pending requests for ${format(selectedDate, 'MMMM d, yyyy')}`;

        const listRefresh = (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={VP.gold} />
        );

        const emptyNoVenue = (
            <View style={styles.emptyBlock}>
                <Icon name="calendar-outline" size={56} color="rgba(156,163,175,0.35)" />
                <Text style={styles.emptyText}>
                    Link a venue to load requests. Pull down to retry after signing in as a venue owner.
                </Text>
            </View>
        );

        const emptyTables = !venueId ? (
            emptyNoVenue
        ) : (
            <View style={styles.emptyBlock}>
                <Icon name="calendar-outline" size={56} color="rgba(156,163,175,0.35)" />
                <Text style={styles.emptyText}>{emptyMsg}</Text>
            </View>
        );

        const emptyGuests = !venueId ? (
            emptyNoVenue
        ) : (
            <View style={styles.emptyBlock}>
                <Icon name="people-outline" size={56} color="rgba(156,163,175,0.35)" />
                <Text style={styles.emptyText}>
                    No guest list entries for {format(selectedDate, 'MMMM d, yyyy')}
                </Text>
            </View>
        );

        return (
            <View style={[styles.wrap, styles.requestsWrap]}>
                <View style={styles.reqHeadRow}>
                    {onBack ? (
                        <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.reqBackBtn} accessibilityRole="button" accessibilityLabel="Go back">
                            <Icon name="chevron-back" size={26} color={VP.gold} />
                        </TouchableOpacity>
                    ) : null}
                    <View style={styles.reqHeadTitles}>
                        <Text style={styles.reqTitle}>Booking Requests</Text>
                        <Text style={styles.reqSub}>Review and manage pending requests</Text>
                    </View>
                </View>
                <View style={styles.headerRule} />

                <View style={styles.searchBox}>
                    <Icon name="search-outline" size={20} color={PILL_ICON} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by guest name or table..."
                        placeholderTextColor={PILL_PLACEHOLDER}
                        value={search}
                        onChangeText={setSearch}
                        underlineColorAndroid="transparent"
                    />
                </View>

                <View ref={dateFieldRef} collapsable={false} style={styles.dateFieldMeasureBox}>
                    <TouchableOpacity style={styles.dateBtn} activeOpacity={0.85} onPress={openDatePicker}>
                        <Icon name="calendar-outline" size={20} color={PILL_ICON} style={styles.dateIcon} />
                        <Text style={styles.dateBtnText}>{dateLabel}</Text>
                    </TouchableOpacity>
                </View>

                <TableBookingDatePickerModal
                    visible={datePickerOpen && datePickerAnchor != null}
                    anchor={datePickerAnchor}
                    value={selectedDate}
                    onClose={closeDatePicker}
                    onChange={setSelectedDate}
                />

                <View style={styles.segmentRow}>
                    <TouchableOpacity
                        style={[styles.segmentBtn, segment === 'tables' && styles.segmentBtnOn]}
                        onPress={() => setSegment('tables')}
                        activeOpacity={0.85}
                    >
                        <Icon
                            name="grid-outline"
                            size={18}
                            color={segment === 'tables' ? '#111827' : VP.text}
                        />
                        <Text style={[styles.segmentLabel, segment === 'tables' && styles.segmentLabelOn]}>
                            Tables
                        </Text>
                        <View style={styles.segmentBadge}>
                            <Text style={styles.segmentBadgeText}>{tablesBadgeCount}</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentBtn, segment === 'guest_lists' && styles.segmentBtnOn]}
                        onPress={() => setSegment('guest_lists')}
                        activeOpacity={0.85}
                    >
                        <Icon
                            name="list-outline"
                            size={18}
                            color={segment === 'guest_lists' ? '#111827' : VP.text}
                        />
                        <Text style={[styles.segmentLabel, segment === 'guest_lists' && styles.segmentLabelOn]}>
                            Guest Lists
                        </Text>
                        <View style={styles.segmentBadge}>
                            <Text style={styles.segmentBadgeText}>{guestBadgeCount}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {segment === 'tables' ? (
                    <FlatList<TableBookingRow>
                        data={filteredTables}
                        keyExtractor={(item) => item.id}
                        extraData={`${dateStr}-${search}`}
                        refreshControl={listRefresh}
                        contentContainerStyle={styles.listPad}
                        ListEmptyComponent={emptyTables}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.card}
                                onPress={() => onOpenBooking(item.id)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.cardTop}>
                                    <Text style={styles.guest}>{item.guest_name}</Text>
                                    <Text style={[styles.status, pillColor(item.status)]}>{item.status}</Text>
                                </View>
                                <Text style={styles.meta}>
                                    Table {item.table_number} · {item.party_size} guests · {item.booking_date}{' '}
                                    {(item.booking_time || '').slice(0, 5)}
                                </Text>
                                {item.price != null ? (
                                    <Text style={styles.price}>${Number(item.price).toFixed(0)}</Text>
                                ) : null}
                            </TouchableOpacity>
                        )}
                    />
                ) : (
                    <FlatList<GuestListEntryRow>
                        data={filteredGuests}
                        keyExtractor={(item) => item.id}
                        extraData={`${dateStr}-${search}`}
                        refreshControl={listRefresh}
                        contentContainerStyle={styles.listPad}
                        ListEmptyComponent={emptyGuests}
                        renderItem={({ item }) => (
                            <View style={styles.card}>
                                <View style={styles.cardTop}>
                                    <Text style={styles.guest}>{item.guest_name}</Text>
                                    <Text style={[styles.status, listTypeBadge(item.list_type)]}>{item.list_type}</Text>
                                </View>
                                <Text style={styles.meta}>
                                    {item.event_date} · +{item.plus_guests ?? 0} · {item.status}
                                </Text>
                            </View>
                        )}
                    />
                )}
            </View>
        );
    }

    return (
        <View style={styles.wrap}>
            <Text style={styles.screenTitle}>Table Booking</Text>
            <Text style={styles.screenSub}>Same data as your web dashboard · table_bookings</Text>
            <View style={styles.chips}>
                {chips.map((c) => (
                    <TouchableOpacity
                        key={c.key}
                        onPress={() => setFilter(c.key)}
                        style={[styles.chip, filter === c.key && styles.chipOn]}
                    >
                        <Text style={[styles.chipText, filter === c.key && styles.chipTextOn]}>{c.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <FlatList
                data={filteredLegacy}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={VP.gold} />}
                contentContainerStyle={styles.listPad}
                ListEmptyComponent={
                    !venueId ? (
                        <Text style={[styles.muted, styles.legacyEmpty]}>
                            Link a venue to see bookings. Pull down to refresh.
                        </Text>
                    ) : (
                        <Text style={[styles.muted, styles.legacyEmpty]}>No bookings in this view.</Text>
                    )
                }
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.card} onPress={() => onOpenBooking(item.id)} activeOpacity={0.8}>
                        <View style={styles.cardTop}>
                            <Text style={styles.guest}>{item.guest_name}</Text>
                            <Text style={[styles.status, pillColor(item.status)]}>{item.status}</Text>
                        </View>
                        <Text style={styles.meta}>
                            Table {item.table_number} · {item.party_size} guests · {item.booking_date}{' '}
                            {(item.booking_time || '').slice(0, 5)}
                        </Text>
                        {item.price != null ? <Text style={styles.price}>${Number(item.price).toFixed(0)}</Text> : null}
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

function pillColor(status: string) {
    switch (status) {
        case 'confirmed':
            return { backgroundColor: 'rgba(45,212,191,0.2)', color: VP.teal };
        case 'pending':
            return { backgroundColor: 'rgba(251,191,36,0.2)', color: VP.gold };
        case 'cancelled':
        case 'declined':
            return { backgroundColor: 'rgba(248,113,113,0.15)', color: VP.coral };
        default:
            return { backgroundColor: 'rgba(255,255,255,0.08)', color: VP.muted };
    }
}

function listTypeBadge(t: string) {
    const x = (t || '').toLowerCase();
    if (x === 'vip') return { backgroundColor: 'rgba(251,191,36,0.2)', color: VP.gold };
    if (x === 'aa') return { backgroundColor: 'rgba(167,139,250,0.2)', color: VP.purple };
    return { backgroundColor: 'rgba(45,212,191,0.15)', color: VP.teal };
}

const H_PAD = 20;
/** Tight offset under parent SafeAreaView — keeps title + search stack compact like the reference UI. */
const REQUESTS_TOP_EXTRA = 10;

/** Shared pill fields (search + date): same size, charcoal fill, bright type. */
const PILL_H = 54;
const PILL_R = PILL_H / 2;
const PILL_BG = '#15151A';
const PILL_BORDER = 'rgba(255,255,255,0.16)';
const PILL_ICON = '#F9FAFB';
const PILL_TEXT = '#FFFFFF';
const PILL_PLACEHOLDER = '#D1D5DB';

const styles = StyleSheet.create({
    wrap: { flex: 1, backgroundColor: VP.bg },
    requestsWrap: { paddingTop: REQUESTS_TOP_EXTRA },
    center: { flex: 1, backgroundColor: VP.bg, justifyContent: 'center', alignItems: 'center' },
    reqHeadRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: H_PAD,
        paddingTop: 4,
    },
    reqBackBtn: {
        width: 40,
        height: 40,
        marginLeft: -6,
        marginRight: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    reqHeadTitles: { flex: 1, minWidth: 0 },
    reqTitle: {
        color: VP.text,
        fontSize: 26,
        fontWeight: '800',
    },
    reqSub: {
        color: VP.muted,
        fontSize: 14,
        marginTop: 6,
        fontWeight: '500',
    },
    headerRule: {
        ...VP_PARTITION_LINE,
        marginTop: 12,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: H_PAD,
        marginTop: 16,
        height: PILL_H,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: PILL_BORDER,
        borderRadius: PILL_R,
        backgroundColor: PILL_BG,
        paddingHorizontal: 18,
        overflow: 'visible',
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        minWidth: 0,
        flexShrink: 1,
        height: PILL_H,
        color: PILL_TEXT,
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.2,
        paddingVertical: 0,
        margin: 0,
        backgroundColor: 'transparent',
        ...(Platform.OS === 'android' ? { textAlignVertical: 'center' as const } : {}),
    },
    dateFieldMeasureBox: {
        alignSelf: 'stretch',
        marginHorizontal: H_PAD,
    },
    dateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
        paddingHorizontal: 18,
        marginTop: 12,
        height: PILL_H,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: PILL_BORDER,
        borderRadius: PILL_R,
        backgroundColor: PILL_BG,
    },
    dateIcon: {
        marginRight: 10,
    },
    dateBtnText: {
        color: PILL_TEXT,
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.15,
    },
    segmentRow: {
        flexDirection: 'row',
        gap: 10,
        marginHorizontal: H_PAD,
        marginTop: 16,
        marginBottom: 4,
    },
    segmentBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    segmentBtnOn: {
        backgroundColor: '#FACC15',
        borderColor: '#FACC15',
    },
    segmentLabel: {
        color: VP.text,
        fontSize: 14,
        fontWeight: '800',
    },
    segmentLabelOn: {
        color: '#111827',
    },
    segmentBadge: {
        minWidth: 22,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: 'rgba(45,212,191,0.35)',
        alignItems: 'center',
    },
    segmentBadgeText: {
        color: '#5EEAD4',
        fontSize: 12,
        fontWeight: '800',
    },
    emptyBlock: {
        paddingTop: 48,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 16,
        color: VP.muted,
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 22,
    },
    screenTitle: { color: VP.text, fontSize: 28, fontWeight: '800', paddingHorizontal: 20, paddingTop: 8 },
    screenSub: { color: VP.muted, fontSize: 13, paddingHorizontal: 20, marginBottom: 12 },
    chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: VP.surface,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    chipOn: { borderColor: VP.goldDim, backgroundColor: 'rgba(251,191,36,0.12)' },
    chipText: { color: VP.muted, fontSize: 13, fontWeight: '600' },
    chipTextOn: { color: VP.gold },
    listPad: { paddingHorizontal: H_PAD, paddingBottom: 100, flexGrow: 1 },
    card: {
        backgroundColor: VP.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: VP.cardBorder,
        padding: 14,
        marginBottom: 10,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    guest: { color: VP.text, fontSize: 16, fontWeight: '700', flex: 1 },
    status: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    meta: { color: VP.muted, fontSize: 13, marginTop: 6 },
    price: { color: VP.gold, fontSize: 14, fontWeight: '700', marginTop: 6 },
    muted: { color: VP.muted, fontSize: 14, paddingHorizontal: 20 },
    legacyEmpty: { marginTop: 24, textAlign: 'center', lineHeight: 22 },
});
