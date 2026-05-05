import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
    Alert,
    Platform,
    InteractionManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';
import { useVenuePortal } from '../../context/VenuePortalContext';
import { fetchBookingsForVenue, subscribeTableBookingsVenue, type TableBookingRow } from '../../services/venuePortal';
import { VP } from './venuePortalTheme';
import { VenueTableBookingFloorMap } from './VenueTableBookingFloorMap';
import { TableBookingDatePickerModal, type DatePickerAnchor } from './TableBookingDatePickerModal';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 20;
const STAT_CARD_W = Math.round(SCREEN_W * 0.82);
const STAT_CARD_GAP = 12;
const STAT_PAGE_W = STAT_CARD_W + STAT_CARD_GAP;

/** Same hex + icon order as `VenueDashboardTab` stat carousel */
type StatDef = {
    key: string;
    bg: string;
    icon: React.ComponentProps<typeof Icon>['name'];
    title: string;
    value: string;
    sub: string;
};

export function VenueTableBookingPanel({ onOpenBooking }: { onOpenBooking: (id: string) => void }) {
    const { venueId, loading: venueLoading, refresh: refreshVenue } = useVenuePortal();
    const [bookings, setBookings] = useState<TableBookingRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [datePickerAnchor, setDatePickerAnchor] = useState<DatePickerAnchor | null>(null);
    const dateFieldRef = useRef<View>(null);
    const statScrollRef = useRef<ScrollView>(null);

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

    const load = useCallback(async () => {
        if (!venueId) {
            setBookings([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const rows = await fetchBookingsForVenue(venueId);
        setBookings(rows);
        setLoading(false);
    }, [venueId]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!venueId) return () => {};
        return subscribeTableBookingsVenue(venueId, load);
    }, [venueId, load]);

    const onRefresh = async () => {
        setRefreshing(true);
        await refreshVenue();
        await load();
        setRefreshing(false);
    };

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dateLabel = format(selectedDate, 'MMMM do, yyyy');

    const stats = useMemo(() => {
        const active = bookings.filter((b) => !['cancelled', 'declined', 'blocked'].includes(b.status));
        const todayB = active.filter((b) => b.booking_date === todayStr);
        const confirmedToday = todayB.filter((b) => b.status === 'confirmed');
        const revenue = confirmedToday.reduce((s, b) => s + (Number(b.price) || 0), 0);
        const pending = active.filter((b) => b.status === 'pending').length;
        const vipCount = active.filter((b) => /vip/i.test(String(b.table_number || ''))).length;

        const list: StatDef[] = [
            {
                key: 'rev',
                bg: '#FFC107',
                icon: 'cash-outline',
                title: "Est. Revenue",
                value: `$${revenue.toLocaleString()}`,
                sub: "Tonight's bookings",
            },
            {
                key: 'tot',
                bg: '#4DB6AC',
                icon: 'people-outline',
                title: 'Total Bookings',
                value: String(todayB.length),
                sub: `${confirmedToday.length} confirmed`,
            },
            {
                key: 'pend',
                bg: '#F472B6',
                icon: 'calendar-outline',
                title: 'Pending Requests',
                value: String(pending),
                sub: 'Awaiting approval',
            },
            {
                key: 'vip',
                bg: '#A78BFA',
                icon: 'trending-up-outline',
                title: 'VIP Reservations',
                value: String(vipCount),
                sub: 'Premium tables',
            },
        ];
        return list;
    }, [bookings, todayStr]);

    const filteredBookings = useMemo(() => {
        const q = search.trim().toLowerCase();
        return bookings.filter((b) => {
            if (b.booking_date !== dateStr) return false;
            if (b.status === 'blocked') return false;
            if (!q) return true;
            const name = (b.guest_name || '').toLowerCase();
            const tbl = String(b.table_number || '').toLowerCase();
            return name.includes(q) || tbl.includes(q);
        });
    }, [bookings, dateStr, search]);

    if (venueLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={VP.gold} size="large" />
            </View>
        );
    }

    const showVenueBanner = !venueId;

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={VP.gold} />}
        >
            {showVenueBanner ? (
                <View style={styles.venueBanner}>
                    <Icon name="business-outline" size={20} color={VP.gold} />
                    <Text style={styles.venueBannerText}>
                        No venue linked to this account. Set{' '}
                        <Text style={styles.venueBannerMono}>profiles.venue_id</Text> or{' '}
                        <Text style={styles.venueBannerMono}>venues.owner_id</Text> in Supabase, then pull to refresh.
                    </Text>
                </View>
            ) : null}
            <ScrollView
                ref={statScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={STAT_PAGE_W}
                snapToAlignment="start"
                disableIntervalMomentum
                style={styles.statCarousel}
                contentContainerStyle={styles.statCarouselContent}
            >
                {stats.map((c, idx) => (
                    <View
                        key={c.key}
                        style={[{ width: STAT_CARD_W }, idx < stats.length - 1 && styles.statPageGap]}
                    >
                        <View style={[styles.statCard, { backgroundColor: c.bg }]}>
                            <View style={styles.statTopRow}>
                                <View style={styles.statIconBox}>
                                    <Icon name={c.icon} size={22} color="#171717" />
                                </View>
                                <Text style={styles.statCardTitle} numberOfLines={2}>
                                    {c.title}
                                </Text>
                            </View>
                            <Text style={styles.statValue}>{c.value}</Text>
                            <Text style={styles.statSub}>{c.sub}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.floorBlock}>
                <VenueTableBookingFloorMap
                    onTablePress={() => {
                        /* visual only for now */
                    }}
                />
            </View>

            <View style={styles.lowerSection}>
                <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
                    <Icon name="search-outline" size={22} color="#FFFFFF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by guest name or table..."
                        placeholderTextColor="#FFFFFF"
                        value={search}
                        onChangeText={setSearch}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        underlineColorAndroid="transparent"
                    />
                </View>

                <View ref={dateFieldRef} collapsable={false} style={styles.dateFieldMeasureBox}>
                    <TouchableOpacity style={styles.dateBtn} activeOpacity={0.85} onPress={openDatePicker}>
                        <Icon name="calendar-outline" size={20} color="#FFFFFF" />
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

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.blockBtn}
                        activeOpacity={0.85}
                        onPress={() => Alert.alert('Block Table', 'Coming soon.')}
                    >
                        <Icon name="close" size={22} color="#EF5350" />
                        <Text style={styles.blockBtnText}>Block Table</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.newBtn}
                        activeOpacity={0.85}
                        onPress={() => Alert.alert('New Booking', 'Coming soon.')}
                    >
                        <Icon name="add" size={24} color="#000000" />
                        <Text style={styles.newBtnText}>New Booking</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.tableWrap}>
                        <View style={styles.tableHead}>
                            <Text style={[styles.th, { width: 56 }]}>Guest</Text>
                            <Text style={[styles.th, { width: 54 }]}>Table</Text>
                            <Text style={[styles.th, { width: 82 }]}>Party Size</Text>
                            <Text style={[styles.th, { width: 50 }]}>Time</Text>
                            <Text style={[styles.th, { width: 50 }]}>Price</Text>
                            <Text style={[styles.th, { width: 60 }]}>Status</Text>
                            <Text style={[styles.th, { width: 64 }]}>Actions</Text>
                        </View>
                        {filteredBookings.length > 0 &&
                            filteredBookings.map((row) => (
                                <TouchableOpacity
                                    key={row.id}
                                    style={styles.tableRow}
                                    onPress={() => onOpenBooking(row.id)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.td, { width: 56 }]} numberOfLines={1}>
                                        {row.guest_name}
                                    </Text>
                                    <Text style={[styles.td, { width: 54 }]} numberOfLines={1}>
                                        {row.table_number}
                                    </Text>
                                    <Text style={[styles.td, { width: 82 }]}>{row.party_size}</Text>
                                    <Text style={[styles.td, { width: 50 }]} numberOfLines={1}>
                                        {(row.booking_time || '').slice(0, 5)}
                                    </Text>
                                    <Text style={[styles.td, { width: 50 }]} numberOfLines={1}>
                                        {row.price != null ? `$${Number(row.price).toFixed(0)}` : '—'}
                                    </Text>
                                    <Text style={[styles.tdStatus, { width: 60 }]} numberOfLines={1}>
                                        {row.status}
                                    </Text>
                                    <View style={[styles.tdActions, { width: 64 }]}>
                                        <TouchableOpacity onPress={() => onOpenBooking(row.id)} hitSlop={8}>
                                            <Text style={styles.viewLink}>View</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableOpacity>
                            ))}
                    </View>
                </ScrollView>
                {venueId && loading && !refreshing ? (
                    <View style={styles.tableLoading}>
                        <ActivityIndicator color={VP.gold} />
                        <Text style={styles.tableLoadingText}>Loading bookings…</Text>
                    </View>
                ) : filteredBookings.length === 0 ? (
                    <Text style={styles.emptyTable}>
                        {!venueId
                            ? 'Link a venue to load bookings for this date.'
                            : 'No bookings found for this date'}
                    </Text>
                ) : null}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: VP.bg },
    scrollContent: { paddingBottom: 120, paddingTop: 14, paddingHorizontal: H_PAD },
    center: { flex: 1, backgroundColor: VP.bg, justifyContent: 'center', alignItems: 'center' },
    muted: { color: VP.muted, fontSize: 14, paddingHorizontal: H_PAD },
    venueBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 14,
        padding: 14,
        borderRadius: 14,
        backgroundColor: 'rgba(251, 191, 36, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.35)',
    },
    venueBannerText: {
        flex: 1,
        color: VP.text,
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '600',
    },
    venueBannerMono: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 12,
        color: VP.gold,
        fontWeight: '700',
    },
    tableLoading: {
        paddingVertical: 28,
        alignItems: 'center',
        gap: 10,
    },
    tableLoadingText: {
        color: VP.muted,
        fontSize: 13,
        fontWeight: '600',
    },

    statCarousel: {
        marginTop: 4,
        marginHorizontal: -H_PAD,
    },
    statCarouselContent: {
        paddingHorizontal: H_PAD,
    },
    statPageGap: { marginRight: STAT_CARD_GAP },
    statCard: {
        borderRadius: 24,
        padding: 20,
        minHeight: 168,
        justifyContent: 'space-between',
    },
    statTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    statIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statCardTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        color: 'rgba(23,23,23,0.75)',
    },
    statValue: {
        fontSize: 40,
        fontWeight: '800',
        color: '#111111',
        marginTop: 8,
    },
    statSub: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(23,23,23,0.5)',
        marginTop: 4,
    },

    floorBlock: {
        marginTop: 16,
    },

    lowerSection: {
        marginTop: 20,
    },
    dateFieldMeasureBox: {
        alignSelf: 'stretch',
    },
    /** Same fill as screen (VP.bg) so boxes don’t read as a different panel — especially on Android TextInput */
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 0,
        gap: 12,
        height: 52,
        borderWidth: 2,
        borderColor: '#2A2A2A',
        borderRadius: 14,
        backgroundColor: VP.bg,
        overflow: 'hidden',
    },
    searchBoxFocused: {
        borderColor: '#FFCC33',
    },
    searchInput: {
        flex: 1,
        height: 52,
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
        paddingVertical: 0,
        margin: 0,
        backgroundColor: VP.bg,
        ...(Platform.OS === 'android' ? { textAlignVertical: 'center' as const } : {}),
    },
    dateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'stretch',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 0,
        marginTop: 11,
        height: 52,
        borderWidth: 2,
        borderColor: '#2A2A2A',
        borderRadius: 18,
        backgroundColor: VP.bg,
    },
    dateBtnText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 11,
    },
    blockBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        paddingVertical: 0,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#D32F2F',
        backgroundColor: VP.bg,
    },
    blockBtnText: {
        color: '#EF5350',
        fontSize: 15,
        fontWeight: '800',
    },
    newBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        paddingVertical: 0,
        borderRadius: 14,
        backgroundColor: '#FFCC33',
    },
    newBtnText: {
        color: '#000000',
        fontSize: 15,
        fontWeight: '800',
    },
    tableWrap: {
        marginTop: 20,
        minWidth: SCREEN_W - H_PAD * 2,
    },
    tableHead: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.15)',
    },
    th: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'capitalize',
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    td: {
        color: VP.text,
        fontSize: 12,
        fontWeight: '600',
    },
    tdStatus: {
        color: VP.teal,
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'capitalize',
    },
    tdActions: {
        justifyContent: 'center',
    },
    viewLink: {
        color: VP.gold,
        fontSize: 12,
        fontWeight: '800',
    },
    emptyTable: {
        color: VP.muted,
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 28,
        fontWeight: '600',
    },
});
