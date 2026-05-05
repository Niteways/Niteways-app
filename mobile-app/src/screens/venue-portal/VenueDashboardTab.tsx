import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Pressable,
    Dimensions,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { VP } from './venuePortalTheme';
import {
    DEFAULT_QUICK_ACTION_SLOTS,
    getVenueQuickActionItem,
    type VenueQuickActionId,
} from './venueQuickActionsConfig';

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 20;
const QA_COL_GAP = 10;
const QA_ROW_GAP = 10;
const QA_INNER_W = SCREEN_W - H_PAD * 2;
/** Extra shrink on grid width; 0 = use full content width (only screen H_PAD) */
const QA_GRID_SIDE_INSET = 0;
/** Tile width÷height; higher = shorter tile for same column width */
const QA_TILE_ASPECT = 1.38;
const QA_GRID_W = QA_INNER_W - QA_GRID_SIDE_INSET * 2;
/** 3 columns × 2 rows (matches venue dashboard mock) */
const QA_CELL_W = Math.floor((QA_GRID_W - QA_COL_GAP * 2) / 3);
/** Stat cards leave side “peek” of adjacent slides */
const STAT_CARD_W = Math.round(SCREEN_W * 0.82);
const STAT_CARD_GAP = 12;
/** Horizontal scroll delta per stat slide (card + gap) for peek carousel */
const STAT_PAGE_W = STAT_CARD_W + STAT_CARD_GAP;

const STAT_CARDS = [
    {
        key: 'rev',
        bg: '#FFC107',
        icon: 'cash-outline' as const,
        title: "Tonight's Revenue",
        value: '—',
        sub: '—',
    },
    {
        key: 'guests',
        bg: '#4DB6AC',
        icon: 'people-outline' as const,
        title: 'Guests',
        value: '—',
        sub: '—',
    },
    {
        key: 'book',
        bg: '#F472B6',
        icon: 'calendar-outline' as const,
        title: 'Table Bookings',
        value: '—',
        sub: '—',
    },
    {
        key: 'occ',
        bg: '#A78BFA',
        icon: 'trending-up-outline' as const,
        title: 'Occupancy Rate',
        value: '—',
        sub: '—',
    },
];

/**
 * Per-action accent (tied to the action itself, not the slot position):
 *  - "New Booking" is always yellow wherever it appears
 *  - "Add Guest" is always teal wherever it appears
 *  - Every other action renders as outline
 */
function qaModeForAction(id: VenueQuickActionId): 'yellow' | 'teal' | 'outline' {
    if (id === 'new_booking') return 'yellow';
    if (id === 'add_guest') return 'teal';
    return 'outline';
}

const ACTIVITY_ROWS = [
    { icon: 'checkmark', tone: '#22C55E', bg: 'rgba(34,197,94,0.2)' },
    { icon: 'checkmark', tone: '#22C55E', bg: 'rgba(34,197,94,0.2)' },
    { icon: 'alert', tone: '#FFB800', bg: 'rgba(251,191,36,0.2)' },
    { icon: 'person-add', tone: '#2DD4BF', bg: 'rgba(45,212,191,0.2)' },
    { icon: 'warning', tone: '#EF4444', bg: 'rgba(239,68,68,0.2)' },
];

const EVENT_CARDS = [
    { badge: 'live', badgeBg: 'rgba(45,212,191,0.25)', badgeColor: '#2DD4BF' },
    { badge: 'upcoming', badgeBg: 'rgba(251,191,36,0.25)', badgeColor: '#FFB800' },
    { badge: 'planning', badgeBg: 'rgba(107,114,128,0.35)', badgeColor: '#9CA3AF' },
];

export type VenueDashboardNavAction =
    | 'bookings'
    | 'guests'
    | 'bookings_pending'
    | 'more'
    | 'tickets'
    | 'team'
    | 'scan_qr'
    | 'settings'
    | 'analytics'
    | 'security'
    | 'dashboard';

export function VenueDashboardTab({
    onNavigateTab,
    quickActionSlots,
}: {
    onNavigateTab: (t: VenueDashboardNavAction) => void;
    quickActionSlots?: VenueQuickActionId[];
}) {
    const slots =
        quickActionSlots && quickActionSlots.length === 6
            ? quickActionSlots
            : DEFAULT_QUICK_ACTION_SLOTS;
    const [statPage, setStatPage] = useState(0);
    const statScrollRef = useRef<ScrollView>(null);

    const onStatScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const x = e.nativeEvent.contentOffset.x;
        const page = Math.round(x / STAT_PAGE_W);
        setStatPage(Math.min(STAT_CARDS.length - 1, Math.max(0, page)));
    };

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            <ScrollView
                ref={statScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onStatScrollEnd}
                decelerationRate="fast"
                snapToInterval={STAT_PAGE_W}
                snapToAlignment="start"
                disableIntervalMomentum
                style={styles.statCarousel}
                contentContainerStyle={styles.statCarouselContent}
            >
                {STAT_CARDS.map((c, idx) => (
                    <View
                        key={c.key}
                        style={[
                            { width: STAT_CARD_W },
                            idx < STAT_CARDS.length - 1 && styles.statPageGap,
                        ]}
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

            <View style={styles.dotsRow}>
                {STAT_CARDS.map((_, i) => (
                    <View
                        key={i}
                        style={[styles.dot, i === statPage ? styles.dotActive : styles.dotIdle]}
                    />
                ))}
            </View>

            <View style={styles.qaSection}>
                <Text style={styles.qaSectionTitle}>Quick Actions</Text>
                <View style={styles.qaGrid}>
                    {slots.map((slotId, slotIdx) => {
                        const item = getVenueQuickActionItem(slotId);
                        const a = {
                            label: item?.label ?? String(slotId),
                            icon: item?.icon ?? 'ellipse-outline',
                            mode: qaModeForAction(slotId),
                            nav: (item?.nav ?? 'dashboard') as VenueDashboardNavAction,
                        } as const;
                        return (
                        <View key={`${slotId}-${slotIdx}`} style={[styles.qaCellWrap, { width: QA_CELL_W }]}>
                            <Pressable
                                onPress={() => onNavigateTab(a.nav)}
                                android_ripple={
                                    a.mode === 'outline'
                                        ? { color: 'rgba(244, 114, 182, 0.35)' }
                                        : { color: 'rgba(0,0,0,0.12)' }
                                }
                                style={({ pressed }) => [
                                    styles.qaCell,
                                    a.mode === 'yellow' && styles.qaYellow,
                                    a.mode === 'teal' && styles.qaTeal,
                                    a.mode === 'outline' && styles.qaOutline,
                                    a.mode === 'outline' && pressed && styles.qaOutlinePressed,
                                    (a.mode === 'yellow' || a.mode === 'teal') &&
                                        pressed &&
                                        styles.qaPrimaryPressed,
                                ]}
                            >
                                {({ pressed }) => {
                                    const outlineActive = a.mode === 'outline' && pressed;
                                    const iconColor =
                                        a.mode === 'outline'
                                            ? outlineActive
                                                ? '#111111'
                                                : '#FFFFFF'
                                            : '#111111';
                                    return (
                                        <>
                                            <Icon name={a.icon} size={20} color={iconColor} />
                                            <Text
                                                style={[
                                                    styles.qaLabel,
                                                    (a.mode !== 'outline' || outlineActive) &&
                                                        styles.qaLabelDark,
                                                ]}
                                                numberOfLines={2}
                                            >
                                                {a.label}
                                            </Text>
                                        </>
                                    );
                                }}
                            </Pressable>
                        </View>
                        );
                    })}
                </View>
            </View>

            <View style={styles.sectionHeadRow}>
                <Text style={styles.sectionTitle}>Table Status</Text>
            </View>
            <View style={styles.tableEmptyCard}>
                <Icon name="grid-outline" size={30} color="rgba(255,255,255,0.28)" />
                <Text style={styles.tableEmptyTitle}>No tables yet</Text>
                <Text style={styles.tableEmptySub}>
                    Add your floor layout and tables from venue settings so status shows here.
                </Text>
            </View>

            <View style={styles.sectionHeadRow}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <TouchableOpacity activeOpacity={0.7}>
                    <Text style={styles.viewAll}>View all</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.activityCard}>
                {ACTIVITY_ROWS.map((row, idx) => (
                    <View key={idx} style={[styles.activityRow, idx < ACTIVITY_ROWS.length - 1 && styles.activityRowBorder]}>
                        <View style={[styles.activityIconCircle, { backgroundColor: row.bg }]}>
                            {row.icon === 'checkmark' ? (
                                <Icon name="checkmark" size={16} color={row.tone} />
                            ) : row.icon === 'alert' ? (
                                <Icon name="alert-circle-outline" size={16} color={row.tone} />
                            ) : row.icon === 'person-add' ? (
                                <Icon name="person-add-outline" size={16} color={row.tone} />
                            ) : (
                                <Icon name="warning-outline" size={16} color={row.tone} />
                            )}
                        </View>
                        <View style={styles.activityTextCol}>
                            <Text style={styles.activityMain}>—</Text>
                            <View style={styles.activityTimeRow}>
                                <Icon name="time-outline" size={12} color={VP.muted} />
                                <Text style={styles.activityTime}>—</Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.sectionHeadRow}>
                <Text style={styles.sectionTitle}>Events</Text>
                <TouchableOpacity activeOpacity={0.7}>
                    <Text style={styles.viewAll}>View all</Text>
                </TouchableOpacity>
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eventsRow}
            >
                {EVENT_CARDS.map((ev, idx) => (
                    <View key={idx} style={styles.eventCard}>
                        <View style={styles.eventTop}>
                            <Text style={styles.eventTitle} numberOfLines={2}>
                                —
                            </Text>
                            <View style={[styles.eventBadge, { backgroundColor: ev.badgeBg }]}>
                                <Text style={[styles.eventBadgeText, { color: ev.badgeColor }]}>{ev.badge}</Text>
                            </View>
                        </View>
                        <View style={styles.eventMeta}>
                            <View style={styles.eventMetaItem}>
                                <Icon name="calendar-outline" size={14} color={VP.muted} />
                                <Text style={styles.eventMetaText}>—</Text>
                            </View>
                            <View style={styles.eventMetaItem}>
                                <Icon name="location-outline" size={14} color={VP.muted} />
                                <Text style={styles.eventMetaText}>—</Text>
                            </View>
                            <View style={styles.eventMetaItem}>
                                <Icon name="people-outline" size={14} color={VP.muted} />
                                <Text style={styles.eventMetaText}>—</Text>
                            </View>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={{ height: 24 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1, backgroundColor: '#121212' },
    scrollContent: { paddingTop: 14, paddingBottom: 32, paddingHorizontal: H_PAD },
    statCarousel: { marginHorizontal: -H_PAD },
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
    statTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
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
    dotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 14,
        marginBottom: 22,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    dotIdle: { backgroundColor: 'rgba(255,255,255,0.22)' },
    dotActive: { backgroundColor: 'rgba(255,255,255,0.65)' },
    sectionHeadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
        paddingHorizontal: 0,
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
    },
    viewAll: {
        color: '#FFB800',
        fontSize: 14,
        fontWeight: '700',
    },
    qaSection: {
        marginBottom: 28,
    },
    qaSectionTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 14,
    },
    qaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: QA_GRID_W,
        alignSelf: 'center',
        columnGap: QA_COL_GAP,
        rowGap: QA_ROW_GAP,
    },
    qaCellWrap: {
        flexShrink: 0,
    },
    qaCell: {
        width: '100%',
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 2,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        aspectRatio: QA_TILE_ASPECT,
    },
    qaYellow: { backgroundColor: '#FFC107' },
    qaTeal: { backgroundColor: '#4DB6AC' },
    qaOutline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
    },
    qaOutlinePressed: {
        backgroundColor: '#F472B6',
        borderColor: '#F472B6',
    },
    qaPrimaryPressed: {
        opacity: 0.88,
    },
    qaLabel: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
    },
    qaLabelDark: { color: '#111111' },
    tableEmptyCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 28,
        paddingHorizontal: 20,
        marginBottom: 28,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        gap: 10,
    },
    tableEmptyTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    tableEmptySub: {
        color: VP.muted,
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 19,
        maxWidth: 280,
    },
    activityCard: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingVertical: 6,
        paddingHorizontal: 14,
        marginBottom: 28,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 12,
    },
    activityRowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    activityIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityTextCol: { flex: 1 },
    activityMain: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    activityTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    activityTime: { color: VP.muted, fontSize: 12 },
    eventsRow: { gap: 12, paddingRight: 8 },
    eventCard: {
        width: 260,
        borderRadius: 18,
        backgroundColor: '#161616',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        padding: 16,
    },
    eventTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 14,
    },
    eventTitle: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
    },
    eventBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    eventBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'lowercase',
    },
    eventMeta: { gap: 8 },
    eventMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    eventMetaText: { color: VP.muted, fontSize: 13 },
});
