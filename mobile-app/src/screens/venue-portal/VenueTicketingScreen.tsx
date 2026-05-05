import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    Pressable,
    Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useVenuePortal } from '../../context/VenuePortalContext';
import { useVenueTicketTypes, type VenueTicketType } from '../../hooks/useVenueTicketTypes';
import { useRealtimeTicketPurchases, type TicketPurchaseRow } from '../../hooks/useRealtimeTicketPurchases';
import { VP, VP_PARTITION_LINE } from './venuePortalTheme';
import type { VenuePortalStackParamList } from './venuePortalTypes';
import { VenueTicketManualOrderPanel } from './VenueTicketManualOrderPanel';

type Nav = StackNavigationProp<VenuePortalStackParamList>;

type Segment = 'types' | 'orders';

/** Stats: revenue & pending from `ticket_purchases`; sold totals & active type count from `venue_tickets`. */
function formatDayPill(d: string) {
    const s = d.trim().toLowerCase();
    if (!s) return d;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function statusLabel(s: VenueTicketType['status']) {
    if (s === 'soldout') return 'Sold out';
    if (s === 'hidden') return 'Hidden';
    return 'Active';
}

function orderStatusLabel(s: string) {
    const m: Record<string, string> = {
        active: 'Active',
        confirmed: 'Confirmed',
        pending: 'Pending',
        used: 'Used',
        cancelled: 'Cancelled',
        refunded: 'Refunded',
    };
    return m[s] ?? s;
}

/** High-fidelity mock: true black canvas + gold accents. */
const TICKETING_BG = '#000000';
const MOCKUP_GOLD = '#FFD700';
/** Muted gold for “Active Days:” label + day pill outlines (reference). */
const ACTIVE_DAYS_GOLD = '#C5A059';
/** Day pill fill — dark olive/brown (same family as Regular type tag reference). */
const ACTIVE_DAY_PILL_BG = '#3D3B1A';

/** Sold row (reference: muted label + white count, pill progress, remaining). */
const SOLD_MUTED = '#A0A0A0';
const PROGRESS_TRACK_BG = '#2A2A2A';
/** Segmented control (reference: charcoal track, black active pill, outline icons). */
const SEGMENT_TRACK = '#252525';
const SEGMENT_ACTIVE_PILL = '#000000';
const SEGMENT_INACTIVE_FG = '#8E8E93';

export function VenueTicketingScreen({
    navigation,
    onBack,
}: {
    navigation: Nav;
    /** Returns to hub (More) when user leaves Tickets tab header. */
    onBack?: () => void;
}) {
    const { venueId, loading: venueLoading, error: venueError, refresh: refreshVenue } = useVenuePortal();
    const {
        allTickets,
        isLoading: ticketsLoading,
        refetch: refetchTickets,
        deleteTicket,
    } = useVenueTicketTypes({ venueId });
    const {
        purchases,
        isLoading: purchasesLoading,
        refetch: refetchPurchases,
    } = useRealtimeTicketPurchases({ venueId });

    const [segment, setSegment] = useState<Segment>('types');
    const [typeFilter, setTypeFilter] = useState<'all' | 'regular' | 'special'>('all');
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [filterMenuLayout, setFilterMenuLayout] = useState<{
        top: number;
        left: number;
        width: number;
    } | null>(null);
    const filterAnchorRef = useRef<View>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [orderSearchQuery, setOrderSearchQuery] = useState('');
    const [manualOrderOpen, setManualOrderOpen] = useState(false);

    const openTypeFilterMenu = useCallback(() => {
        requestAnimationFrame(() => {
            filterAnchorRef.current?.measureInWindow((x, y, w, h) => {
                const width = w > 0 ? w : 248;
                const top = h > 0 ? y + h + 6 : 280;
                const left = x >= 0 ? x : 12;
                setFilterMenuLayout({ top, left, width });
                setFilterModalOpen(true);
            });
        });
    }, []);

    const closeTypeFilterMenu = useCallback(() => {
        setFilterModalOpen(false);
        setFilterMenuLayout(null);
    }, []);

    useFocusEffect(
        useCallback(() => {
            void refetchTickets();
            void refetchPurchases();
        }, [refetchTickets, refetchPurchases])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await refreshVenue();
        await refetchTickets();
        await refetchPurchases();
        setRefreshing(false);
    };

    const filteredTypes = useMemo(() => {
        let list = allTickets;
        if (typeFilter === 'regular') list = list.filter((t) => t.type === 'regular');
        if (typeFilter === 'special') list = list.filter((t) => t.type === 'special');
        return list;
    }, [allTickets, typeFilter]);

    const filteredOrders = useMemo(() => {
        const q = orderSearchQuery.trim().toLowerCase();
        if (!q) return purchases;
        return purchases.filter((o) => {
            const hay = [
                o.guest_name,
                o.guest_email,
                o.ticket_id,
                o.ticket_type,
                o.event_name,
                o.event_date,
                o.status,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return hay.includes(q);
        });
    }, [purchases, orderSearchQuery]);

    const stats = useMemo(() => {
        const countsTowardRevenue = (s: string) =>
            s === 'active' || s === 'confirmed' || s === 'used' || s === 'pending';
        const totalRevenue = purchases
            .filter((o) => countsTowardRevenue(o.status))
            .reduce((sum, o) => sum + Number(o.price) * (o.quantity || 1), 0);
        const totalSoldUnits = allTickets.reduce((sum, t) => sum + t.sold, 0);
        const activeTypes = allTickets.filter((t) => t.status === 'active').length;
        const pendingOrders = purchases.filter((o) => o.status === 'pending').length;
        return { totalRevenue, totalSoldUnits, activeTypes, pendingOrders };
    }, [purchases, allTickets]);

    const filterLabel =
        typeFilter === 'all' ? 'All Types' : typeFilter === 'regular' ? 'Regular' : 'Special';

    const confirmDelete = (t: VenueTicketType) => {
        Alert.alert('Delete ticket type', `Remove “${t.name}”? This cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteTicket(t.id);
                    } catch (e) {
                        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete');
                    }
                },
            },
        ]);
    };

    const renderTypeItem = ({ item }: { item: VenueTicketType }) => {
        const avail = Math.max(0, item.quantity - item.sold);
        const progressPct =
            item.quantity > 0 ? Math.min(100, (item.sold / item.quantity) * 100) : 0;
        const gradColors =
            item.type === 'special'
                ? (['rgba(251, 113, 133, 0.28)', 'rgba(251, 191, 36, 0.22)'] as const)
                : (['rgba(45, 212, 191, 0.18)', 'rgba(251, 191, 36, 0.12)'] as const);

        return (
            <TouchableOpacity
                style={styles.ticketCard}
                onPress={() => navigation.navigate('VenueTicketDetail', { ticketId: item.id })}
                activeOpacity={0.9}
            >
                <LinearGradient
                    colors={[...gradColors]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardHeaderGrad}
                >
                    <View style={styles.pillRow}>
                        <View
                            style={[
                                styles.typePill,
                                item.type === 'special' ? styles.typePillSpecial : styles.typePillRegular,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.typePillText,
                                    item.type === 'special' ? styles.typePillTextSpecial : styles.typePillTextRegular,
                                ]}
                            >
                                {item.type === 'special' ? 'Special' : 'Regular'}
                            </Text>
                        </View>
                        <View
                            style={[
                                styles.statusPill,
                                item.status === 'active' && styles.statusPillActive,
                                item.status === 'soldout' && styles.statusPillSold,
                                item.status === 'hidden' && styles.statusPillHidden,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.statusPillText,
                                    item.status === 'active' && styles.statusPillTextActive,
                                    item.status === 'soldout' && styles.statusPillTextSold,
                                    item.status === 'hidden' && styles.statusPillTextHidden,
                                ]}
                            >
                                {statusLabel(item.status)}
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.cardHeroTitle} numberOfLines={2}>
                        {item.name}
                    </Text>
                </LinearGradient>
                <View style={styles.cardBody}>
                    <Text style={styles.pricePerTicket}>
                        ${Number(item.price).toFixed(0)}{' '}
                        <Text style={styles.pricePerSuffix}>/ ticket</Text>
                    </Text>
                    {item.description ? (
                        <Text style={styles.cardDescription} numberOfLines={3}>
                            {item.description}
                        </Text>
                    ) : null}
                    {item.type === 'regular' && item.active_days && item.active_days.length > 0 ? (
                        <View style={styles.activeDaysBlock}>
                            <Text style={styles.activeDaysLabel}>Active Days:</Text>
                            <View style={styles.activeDaysPillsRow}>
                                {item.active_days.map((d) => (
                                    <View key={d} style={styles.dayPill}>
                                        <Text style={styles.dayPillText}>{formatDayPill(d)}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : null}
                    {item.type === 'special' && item.specific_dates && item.specific_dates.length > 0 ? (
                        <View style={styles.daysRow}>
                            {item.specific_dates.map((d) => (
                                <View key={d} style={styles.datePill}>
                                    <Icon name="calendar-outline" size={12} color={VP.gold} />
                                    <Text style={styles.datePillText}>{d}</Text>
                                </View>
                            ))}
                        </View>
                    ) : null}
                    <View style={styles.soldSection}>
                        <View style={styles.soldHeaderRow}>
                            <View style={styles.soldLabelGroup}>
                                <Icon name="person-outline" size={20} color={SOLD_MUTED} />
                                <Text style={styles.soldLabelText}>Sold</Text>
                            </View>
                            <Text style={styles.soldCountText}>
                                {item.sold} / {item.quantity}
                            </Text>
                        </View>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                        </View>
                        <Text style={styles.remainingText}>
                            {avail} remaining
                        </Text>
                    </View>
                    <View style={styles.cardFooterIcons}>
                        <TouchableOpacity
                            style={styles.iconHit}
                            onPress={() =>
                                navigation.navigate('VenueTicketTypeForm', { mode: 'edit', ticketId: item.id })
                            }
                            hitSlop={10}
                        >
                            <Icon name="create-outline" size={22} color={MOCKUP_GOLD} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconHit} onPress={() => confirmDelete(item)} hitSlop={10}>
                            <Icon name="trash-outline" size={22} color={VP.coral} />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderOrderItem = ({ item }: { item: TicketPurchaseRow }) => {
        const total = Number(item.price) * (item.quantity || 1);
        return (
            <View style={styles.orderCard}>
                <View style={styles.orderTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.orderName}>{item.guest_name}</Text>
                        <Text style={styles.orderMeta}>
                            {item.ticket_type} · {item.ticket_id}
                        </Text>
                    </View>
                    <View style={styles.orderStatusPill}>
                        <Text style={styles.orderStatusText}>{orderStatusLabel(item.status)}</Text>
                    </View>
                </View>
                <Text style={styles.orderMeta}>
                    {item.event_date}
                    {item.event_name ? ` · ${item.event_name}` : ''}
                </Text>
                <Text style={styles.orderTotal}>Qty {item.quantity ?? 1} · ${total.toFixed(2)}</Text>
            </View>
        );
    };

    if (venueLoading && !venueId) {
        return (
            <View style={styles.fill}>
                <TicketingBrandHeader onBack={onBack} />
                <View style={styles.center}>
                    <ActivityIndicator color={MOCKUP_GOLD} size="large" />
                    <Text style={styles.muted}>Loading venue…</Text>
                </View>
            </View>
        );
    }

    if (!venueId) {
        return (
            <View style={styles.fill}>
                <TicketingBrandHeader onBack={onBack} />
                <View style={styles.center}>
                    <Text style={styles.muted}>{venueError || 'No venue linked to this account.'}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => void refreshVenue()}>
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const loading = segment === 'types' ? ticketsLoading : purchasesLoading;

    return (
        <View style={styles.fill}>
            <TicketingBrandHeader onBack={onBack} />

            <View style={styles.statsGrid}>
                <View style={styles.statsRow}>
                    <StatCard
                        icon="cash"
                        iconColor={MOCKUP_GOLD}
                        iconWellBg="#3D3424"
                        label="Revenue"
                        value={`$${stats.totalRevenue.toFixed(0)}`}
                    />
                    <StatCard
                        icon="ticket"
                        iconColor={VP.teal}
                        iconWellBg="#0F2A26"
                        label="Sold"
                        value={String(stats.totalSoldUnits)}
                    />
                </View>
                <View style={styles.statsRow}>
                    <StatCard
                        icon="trending-up"
                        iconColor={MOCKUP_GOLD}
                        iconWellBg="#3D3424"
                        label="Active"
                        value={String(stats.activeTypes)}
                    />
                    <StatCard
                        icon="time"
                        iconColor="#F87171"
                        iconWellBg="#2E1A1F"
                        label="Pending"
                        value={String(stats.pendingOrders)}
                    />
                </View>
            </View>

            <View style={styles.segmentOuter}>
                <TouchableOpacity
                    style={[
                        styles.segInner,
                        segment === 'types' && styles.segInnerActive,
                        segment === 'types' && styles.segPillLeft,
                    ]}
                    onPress={() => setSegment('types')}
                    activeOpacity={0.92}
                >
                    <View style={styles.segTicketIconWrap}>
                        <Icon
                            name="ticket-outline"
                            size={22}
                            color={segment === 'types' ? '#FFFFFF' : SEGMENT_INACTIVE_FG}
                        />
                    </View>
                    <Text
                        style={[styles.segInnerText, segment === 'types' && styles.segInnerTextActive]}
                        numberOfLines={1}
                    >
                        Ticket Types
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.segInner,
                        segment === 'orders' && styles.segInnerActive,
                        segment === 'orders' && styles.segPillRight,
                    ]}
                    onPress={() => setSegment('orders')}
                    activeOpacity={0.92}
                >
                    <Icon
                        name="people-outline"
                        size={22}
                        color={segment === 'orders' ? '#FFFFFF' : SEGMENT_INACTIVE_FG}
                    />
                    <Text
                        style={[styles.segInnerText, segment === 'orders' && styles.segInnerTextActive]}
                        numberOfLines={1}
                    >
                        Orders
                    </Text>
                </TouchableOpacity>
            </View>

            {segment === 'types' ? (
                <View style={styles.typesToolbar}>
                    <View ref={filterAnchorRef} collapsable={false} style={styles.typeDropdownFlex}>
                        <TouchableOpacity
                            style={styles.typeDropdownPressable}
                            onPress={openTypeFilterMenu}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.typeDropdownText}>{filterLabel}</Text>
                            <Icon name="chevron-down" size={18} color={VP.muted} />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        style={styles.fabInline}
                        onPress={() => navigation.navigate('VenueTicketTypeForm', { mode: 'create' })}
                        activeOpacity={0.92}
                        accessibilityLabel="Add ticket type"
                    >
                        <Icon name="add" size={26} color="#000000" />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.ordersToolbar}>
                    <View style={styles.ordersSearchOuter}>
                        <Icon name="search-outline" size={21} color={VP.muted} style={styles.ordersSearchIcon} />
                        <View style={styles.ordersSearchInputWrap}>
                            <TextInput
                                style={styles.ordersSearchInput}
                                placeholder="Search orders..."
                                placeholderTextColor={VP.muted}
                                value={orderSearchQuery}
                                onChangeText={setOrderSearchQuery}
                                autoCapitalize="none"
                                autoCorrect={false}
                                clearButtonMode="while-editing"
                            />
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.ordersCartBtn}
                        onPress={() => setManualOrderOpen(true)}
                        activeOpacity={0.92}
                        accessibilityLabel="Manual order"
                    >
                        <Icon name="cart-outline" size={22} color="#000000" />
                    </TouchableOpacity>
                </View>
            )}

            {loading && !refreshing ? (
                <View style={styles.listLoading}>
                    <ActivityIndicator color={MOCKUP_GOLD} />
                </View>
            ) : segment === 'types' ? (
                <FlatList
                    data={filteredTypes}
                    keyExtractor={(i) => i.id}
                    renderItem={renderTypeItem}
                    contentContainerStyle={[
                        styles.listPad,
                        styles.listPadTypes,
                        filteredTypes.length === 0 && styles.listPadEmptyCenter,
                    ]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={MOCKUP_GOLD} />}
                    style={styles.listFlex}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <Text style={styles.mutedCenter}>No ticket types yet. Tap + to create one.</Text>
                    }
                />
            ) : (
                <FlatList
                    data={filteredOrders}
                    keyExtractor={(i) => i.id}
                    renderItem={renderOrderItem}
                    contentContainerStyle={[
                        styles.listPad,
                        styles.listPadOrders,
                        filteredOrders.length === 0 && styles.listPadEmptyCenter,
                    ]}
                    style={styles.listFlex}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={MOCKUP_GOLD} />}
                    ListEmptyComponent={
                        <Text style={styles.mutedCenter}>
                            {orderSearchQuery.trim()
                                ? 'No orders match your search.'
                                : 'No orders for this venue.'}
                        </Text>
                    }
                />
            )}

            <Modal visible={filterModalOpen} transparent animationType="fade" onRequestClose={closeTypeFilterMenu}>
                <View style={styles.modalRoot}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeTypeFilterMenu} />
                    {filterMenuLayout ? (
                        <View
                            style={[
                                styles.filterModalWrap,
                                {
                                    top: filterMenuLayout.top,
                                    left: filterMenuLayout.left,
                                    width: filterMenuLayout.width,
                                },
                            ]}
                            pointerEvents="box-none"
                        >
                            <View style={styles.filterModalCard}>
                            {(['all', 'regular', 'special'] as const).map((k) => (
                                <TouchableOpacity
                                    key={k}
                                    style={styles.filterModalRow}
                                    onPress={() => {
                                        setTypeFilter(k);
                                        closeTypeFilterMenu();
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.filterModalRowText,
                                            typeFilter === k && styles.filterModalRowTextOn,
                                        ]}
                                    >
                                        {k === 'all' ? 'All Types' : k === 'regular' ? 'Regular' : 'Special'}
                                    </Text>
                                    {typeFilter === k ? (
                                        <Icon name="checkmark-circle" size={22} color={MOCKUP_GOLD} />
                                    ) : null}
                                </TouchableOpacity>
                            ))}
                            </View>
                        </View>
                    ) : null}
                </View>
            </Modal>

            <Modal
                visible={manualOrderOpen}
                transparent
                animationType="fade"
                statusBarTranslucent={Platform.OS === 'android'}
                onRequestClose={() => setManualOrderOpen(false)}
            >
                <VenueTicketManualOrderPanel onClose={() => setManualOrderOpen(false)} />
            </Modal>
        </View>
    );
}

function TicketingBrandHeader({ onBack }: { onBack?: () => void }) {
    return (
        <View>
            <View style={styles.brandHeader}>
                <View style={styles.brandHeaderTopRow}>
                    {onBack ? (
                        <TouchableOpacity
                            onPress={onBack}
                            hitSlop={12}
                            style={styles.ticketingBackBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Back"
                        >
                            <Icon name="chevron-back" size={26} color={MOCKUP_GOLD} />
                        </TouchableOpacity>
                    ) : null}
                    <View style={styles.brandHeaderTitles}>
                        <Text style={styles.screenTitle}>Ticketing</Text>
                        <Text style={styles.screenSubtitle}>Manage ticket types and orders</Text>
                    </View>
                </View>
            </View>
            <View style={VP_PARTITION_LINE} />
        </View>
    );
}

function StatCard({
    icon,
    iconColor,
    iconWellBg,
    label,
    value,
}: {
    icon: string;
    iconColor: string;
    iconWellBg: string;
    label: string;
    value: string;
}) {
    return (
        <View style={styles.statCard}>
            <View style={styles.statCardRow}>
                <View style={[styles.statIconSquare, { backgroundColor: iconWellBg }]}>
                    <Icon name={icon} size={30} color={iconColor} />
                </View>
                <View style={styles.statCardTexts}>
                    <Text style={styles.statCardLabel}>{label}</Text>
                    <Text style={styles.statCardValue}>{value}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: TICKETING_BG },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    muted: { color: VP.muted, marginTop: 12, textAlign: 'center', paddingHorizontal: 24 },
    mutedCenter: { color: VP.muted, textAlign: 'center', marginTop: 32, paddingHorizontal: 24, fontSize: 15 },
    brandHeader: {
        paddingHorizontal: 12,
        paddingTop: 4,
        paddingBottom: 12,
        backgroundColor: TICKETING_BG,
    },
    brandHeaderTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    ticketingBackBtn: {
        width: 40,
        marginRight: 4,
        paddingTop: 2,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    brandHeaderTitles: {
        flex: 1,
        minWidth: 0,
    },
    screenTitle: {
        color: VP.text,
        fontSize: 22,
        fontWeight: '800',
    },
    screenSubtitle: {
        color: VP.muted,
        fontSize: 13,
        fontWeight: '500',
        marginTop: 4,
    },
    statsGrid: {
        paddingHorizontal: 12,
        paddingTop: 14,
        gap: 14,
        marginBottom: 14,
        backgroundColor: TICKETING_BG,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 14,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#141414',
        borderRadius: 20,
        paddingVertical: 18,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    statCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    statIconSquare: {
        width: 56,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statCardTexts: {
        flex: 1,
        justifyContent: 'center',
        minWidth: 0,
    },
    statCardLabel: {
        color: VP.muted,
        fontSize: 14,
        fontWeight: '600',
    },
    statCardValue: {
        color: VP.text,
        fontSize: 28,
        fontWeight: '800',
        marginTop: 4,
        letterSpacing: -0.3,
    },
    /** Compact grey track, left-aligned with stats (padding 12). */
    segmentOuter: {
        flexDirection: 'row',
        alignItems: 'stretch',
        alignSelf: 'flex-start',
        marginLeft: 12,
        marginBottom: 12,
        width: 288,
        padding: 2,
        borderRadius: 12,
        backgroundColor: SEGMENT_TRACK,
        overflow: 'hidden',
    },
    segInner: {
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 0,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        minHeight: 40,
        paddingVertical: 7,
        paddingHorizontal: 2,
        backgroundColor: 'transparent',
    },
    segInnerActive: {
        backgroundColor: SEGMENT_ACTIVE_PILL,
    },
    /** Active pill corners follow outer track (left vs right selection). */
    segPillLeft: {
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
    },
    segPillRight: {
        borderTopRightRadius: 10,
        borderBottomRightRadius: 10,
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,
    },
    segTicketIconWrap: {
        transform: [{ rotate: '-14deg' }],
    },
    segInnerText: {
        color: SEGMENT_INACTIVE_FG,
        fontSize: 16,
        fontWeight: '400',
    },
    segInnerTextActive: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    ordersToolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        width: '100%',
        gap: 10,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    ordersSearchOuter: {
        flex: 1,
        flexGrow: 1,
        flexShrink: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 9 : 6,
        borderRadius: 12,
        backgroundColor: TICKETING_BG,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    ordersSearchIcon: {
        flexShrink: 0,
        marginRight: 8,
    },
    ordersSearchInputWrap: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
    },
    ordersSearchInput: {
        width: '100%',
        color: VP.text,
        fontSize: 17,
        fontWeight: '600',
        padding: 0,
        margin: 0,
        ...(Platform.OS === 'android' ? { paddingVertical: 0 } : {}),
    },
    /** Wider, shorter than square — matches reference row proportions. */
    ordersCartBtn: {
        width: 52,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFCC33',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    typesToolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 10,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    typeDropdownFlex: {
        flexGrow: 0,
        flexShrink: 0,
        width: '36%',
        maxWidth: 154,
        minWidth: 118,
        minHeight: 44,
        backgroundColor: TICKETING_BG,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        overflow: 'hidden',
    },
    typeDropdownPressable: {
        flex: 1,
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    fabInline: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: MOCKUP_GOLD,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    typeDropdownText: {
        color: VP.text,
        fontSize: 16,
        fontWeight: '800',
    },
    listLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TICKETING_BG },
    listFlex: { flex: 1, backgroundColor: TICKETING_BG },
    listPad: {
        paddingHorizontal: 12,
        paddingTop: 4,
        flexGrow: 1,
        backgroundColor: TICKETING_BG,
    },
    listPadTypes: {
        paddingBottom: 32,
    },
    listPadOrders: {
        paddingBottom: 96,
    },
    listPadEmptyCenter: {
        flexGrow: 1,
        justifyContent: 'center',
        minHeight: 280,
    },
    ticketCard: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 14,
        borderWidth: 1,
        borderColor: VP.cardBorder,
        backgroundColor: VP.card,
        ...Platform.select({
            ios: {
                shadowColor: '#2DD4BF',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: { elevation: 6 },
        }),
    },
    cardHeaderGrad: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
    },
    pillRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 10,
    },
    typePill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 9999,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    /** Reference: deep olive-gold fill (#454020), bright gold rim + label, wider pill. */
    typePillRegular: {
        paddingHorizontal: 16,
        paddingVertical: 5,
        backgroundColor: '#454020',
        borderColor: '#D4AF37',
    },
    typePillSpecial: {
        backgroundColor: 'rgba(251, 113, 133, 0.18)',
        borderColor: 'rgba(251, 113, 133, 0.65)',
    },
    typePillText: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    typePillTextRegular: {
        fontSize: 12,
        color: MOCKUP_GOLD,
        letterSpacing: 0.5,
    },
    typePillTextSpecial: {
        color: '#FDA4AF',
    },
    statusPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 9999,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        alignSelf: 'flex-start',
    },
    statusPillActive: {
        backgroundColor: 'rgba(45, 212, 191, 0.28)',
        borderColor: 'rgba(45, 212, 191, 0.55)',
    },
    statusPillSold: {
        backgroundColor: 'rgba(251, 113, 133, 0.2)',
        borderColor: 'rgba(251, 113, 133, 0.45)',
    },
    statusPillHidden: {
        backgroundColor: 'rgba(156, 163, 175, 0.15)',
        borderColor: 'rgba(156, 163, 175, 0.3)',
    },
    statusPillText: {
        color: VP.text,
        fontSize: 13,
        fontWeight: '700',
    },
    statusPillTextActive: {
        color: VP.teal,
        fontWeight: '800',
    },
    statusPillTextSold: {
        color: VP.coral,
        fontWeight: '800',
    },
    statusPillTextHidden: {
        color: VP.muted,
        fontWeight: '800',
    },
    cardHeroTitle: {
        color: VP.text,
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'left',
        alignSelf: 'stretch',
    },
    cardBody: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
    },
    pricePerTicket: {
        color: VP.text,
        fontSize: 26,
        fontWeight: '800',
    },
    pricePerSuffix: {
        fontSize: 15,
        fontWeight: '600',
        color: VP.muted,
    },
    cardDescription: {
        color: VP.muted,
        fontSize: 14,
        lineHeight: 20,
        marginTop: 8,
    },
    daysRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
    },
    /** Reference: heading on its own line, pills row below. */
    activeDaysBlock: {
        marginTop: 12,
        width: '100%',
    },
    activeDaysLabel: {
        color: '#C4C4CA',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    activeDaysPillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 10,
    },
    dayPill: {
        paddingHorizontal: 16,
        paddingVertical: 5,
        borderRadius: 9999,
        backgroundColor: ACTIVE_DAY_PILL_BG,
        borderWidth: 1,
        borderColor: ACTIVE_DAYS_GOLD,
    },
    dayPillText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    datePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: 'rgba(251, 191, 36, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.3)',
    },
    datePillText: {
        color: VP.gold,
        fontSize: 11,
        fontWeight: '700',
    },
    soldSection: {
        marginTop: 14,
    },
    soldHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    soldLabelGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    soldLabelText: {
        color: SOLD_MUTED,
        fontSize: 16,
        fontWeight: '600',
    },
    soldCountText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
        lineHeight: 20,
    },
    remainingText: {
        alignSelf: 'flex-end',
        color: SOLD_MUTED,
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: 0.6,
        marginTop: 8,
    },
    progressTrack: {
        height: 8,
        borderRadius: 9999,
        backgroundColor: PROGRESS_TRACK_BG,
        marginTop: 12,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 9999,
        backgroundColor: MOCKUP_GOLD,
    },
    cardFooterIcons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 18,
        marginTop: 12,
        paddingTop: 4,
    },
    iconHit: { padding: 4 },
    orderCard: {
        backgroundColor: VP.card,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: VP.cardBorder,
    },
    orderTop: { flexDirection: 'row', alignItems: 'flex-start' },
    orderName: { color: VP.text, fontSize: 17, fontWeight: '700' },
    orderMeta: { color: VP.muted, fontSize: 12, marginTop: 4 },
    orderStatusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
    },
    orderStatusText: { color: VP.gold, fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
    orderTotal: { color: VP.text, fontSize: 14, fontWeight: '600', marginTop: 8 },
    modalRoot: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    filterModalWrap: {
        position: 'absolute',
    },
    filterModalCard: {
        backgroundColor: '#1E1E1E',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: MOCKUP_GOLD,
        overflow: 'hidden',
    },
    filterModalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    filterModalRowText: { color: VP.text, fontSize: 16, fontWeight: '600' },
    filterModalRowTextOn: { color: MOCKUP_GOLD },
    retryBtn: {
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#1C1C22',
    },
    retryText: { color: MOCKUP_GOLD, fontWeight: '700' },
});
