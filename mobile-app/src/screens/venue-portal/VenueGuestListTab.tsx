import React, { useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SectionList,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Share,
    Platform,
    Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useVenuePortal } from '../../context/VenuePortalContext';
import { useRealtimeGuestLists, type GuestList } from '../../hooks/useRealtimeGuestLists';
import { authService } from '../../services/auth';
import { seedDevTestVenueAndSampleGuestList } from '../../services/venuePortal';
import { VP, VP_PARTITION_LINE } from './venuePortalTheme';
import type { VenuePortalStackParamList } from './venuePortalTypes';

type Nav = StackNavigationProp<VenuePortalStackParamList, 'VenueMain'>;

type Section = { title: string; data: GuestList[] };

export function VenueGuestListTab({ navigation, onBack }: { navigation: Nav; onBack?: () => void }) {
    const {
        venueId,
        authUserId,
        loading: venuePortalLoading,
        error: venuePortalError,
        refresh: refreshVenuePortal,
    } = useVenuePortal();
    const { recurringLists, oneDayLists, loading, refetch } = useRealtimeGuestLists({ venueId });

    useFocusEffect(
        useCallback(() => {
            void refetch();
        }, [refetch])
    );

    const sections: Section[] = useMemo(
        () => [
            { title: 'Recurring', data: recurringLists },
            { title: 'One-day events', data: oneDayLists },
        ],
        [recurringLists, oneDayLists]
    );

    const [refreshing, setRefreshing] = React.useState(false);
    const [devSeeding, setDevSeeding] = React.useState(false);
    const onRefresh = async () => {
        setRefreshing(true);
        await refreshVenuePortal();
        await refetch();
        setRefreshing(false);
    };

    const totalLists = recurringLists.length + oneDayLists.length;

    if (venuePortalLoading && !venueId) {
        return (
            <View style={styles.fillCol}>
                {onBack ? (
                    <TouchableOpacity
                        onPress={onBack}
                        hitSlop={12}
                        style={styles.topBackRow}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Icon name="chevron-back" size={26} color={VP.gold} />
                    </TouchableOpacity>
                ) : null}
                <View style={styles.center}>
                    <ActivityIndicator color={VP.gold} size="large" />
                    <Text style={[styles.muted, { marginTop: 16 }]}>Loading venue…</Text>
                </View>
            </View>
        );
    }

    if (!venueId) {
        const onShareUserId = () => {
            if (!authUserId) return;
            void Share.share({
                message: `My Supabase auth user id (use for venues.owner_id & profiles.id):\n${authUserId}`,
            });
        };

        const onDevSeed = async () => {
            if (!authUserId || devSeeding) return;
            setDevSeeding(true);
            try {
                const result = await seedDevTestVenueAndSampleGuestList(authUserId);
                if (!result.ok) {
                    Alert.alert('Dev seed failed', result.error);
                    return;
                }
                await authService.refreshUserCache().catch(() => {});
                await refreshVenuePortal();
                await refetch();
                Alert.alert(
                    'Dev test data ready',
                    result.reusedVenue
                        ? 'Linked your profile to an existing owned venue and ensured a sample list exists.'
                        : 'Created a test venue, linked your profile, and added a sample recurring list.'
                );
            } finally {
                setDevSeeding(false);
            }
        };

        return (
            <ScrollView
                contentContainerStyle={styles.noVenueWrap}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={VP.gold} />
                }
            >
                {onBack ? (
                    <TouchableOpacity
                        onPress={onBack}
                        hitSlop={12}
                        style={styles.noVenueBackRow}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Icon name="chevron-back" size={26} color={VP.gold} />
                    </TouchableOpacity>
                ) : null}
                <Icon name="business-outline" size={56} color="rgba(156,163,175,0.35)" />
                <Text style={styles.noVenueTitle}>No venue linked</Text>
                <Text style={styles.noVenueBody}>
                    The app resolves your venue from Supabase: either profiles.venue_id or a venues row whose
                    owner_id matches your login. Until that exists, guest lists cannot load.
                </Text>
                <Text style={styles.noVenueStepsTitle}>Fix once in Supabase</Text>
                <Text style={styles.noVenueSteps}>
                    1. Table Editor → venues → your venue → set owner_id to your Auth user UUID.{'\n'}
                    2. Copy that venue row id (primary key).{'\n'}
                    3. Table profiles → row where id equals the same Auth user UUID → set venue_id to the venue
                    id.{'\n'}
                    4. Pull down here to refresh.
                </Text>
                {authUserId ? (
                    <>
                        <Text style={styles.noVenueIdLabel}>Your Auth user id</Text>
                        <Text selectable style={styles.noVenueIdValue}>
                            {authUserId}
                        </Text>
                        <TouchableOpacity style={styles.noVenueShareBtn} onPress={onShareUserId} activeOpacity={0.85}>
                            <Icon name="share-outline" size={18} color="#111827" />
                            <Text style={styles.noVenueShareBtnText}>Share / copy via share sheet</Text>
                        </TouchableOpacity>
                    </>
                ) : null}
                {venuePortalError ? <Text style={styles.noVenueHint}>{venuePortalError}</Text> : null}

                {__DEV__ && authUserId ? (
                    <View style={styles.devBox}>
                        <Text style={styles.devLabel}>Developer</Text>
                        <Text style={styles.devHint}>
                            Creates a test venue (if needed), links your profile, and adds “Sample recurring list
                            (dev)” so you can confirm guest lists load.
                        </Text>
                        <TouchableOpacity
                            style={[styles.devBtn, devSeeding && styles.devBtnOff]}
                            onPress={() => void onDevSeed()}
                            disabled={devSeeding}
                            activeOpacity={0.85}
                        >
                            {devSeeding ? (
                                <ActivityIndicator color="#111827" />
                            ) : (
                                <Text style={styles.devBtnText}>Seed test venue + sample list</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : null}
            </ScrollView>
        );
    }

    if (loading && !refreshing) {
        return (
            <View style={styles.fillCol}>
                {onBack ? (
                    <TouchableOpacity
                        onPress={onBack}
                        hitSlop={12}
                        style={styles.topBackRow}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Icon name="chevron-back" size={26} color={VP.gold} />
                    </TouchableOpacity>
                ) : null}
                <View style={styles.center}>
                    <ActivityIndicator color={VP.gold} size="large" />
                </View>
            </View>
        );
    }

    const renderItem = ({ item }: { item: GuestList }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.88}
            onPress={() =>
                navigation.navigate('VenueGuestListDetail', { listId: item.id, listType: item.type })
            }
        >
            <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.name}
                </Text>
                <View style={[styles.pill, item.isActive ? styles.pillOn : styles.pillOff]}>
                    <Text style={[styles.pillText, item.isActive ? styles.pillTextOn : styles.pillTextOff]}>
                        {item.isActive ? 'Active' : 'Off'}
                    </Text>
                </View>
            </View>
            <Text style={styles.cardMeta}>
                {item.guestCount} guest{item.guestCount === 1 ? '' : 's'}
            </Text>
            {item.type === 'recurring' ? (
                <Text style={styles.cardSub}>
                    Every {item.dayOfWeek} · Reset {item.resetTime}
                </Text>
            ) : (
                <Text style={styles.cardSub}>Event {item.eventDate}</Text>
            )}
        </TouchableOpacity>
    );

    const renderSectionFooter = ({ section }: { section: Section }) =>
        section.data.length === 0 ? (
            <Text style={styles.sectionEmpty}>No lists yet</Text>
        ) : null;

    return (
        <View style={styles.wrap}>
            <View style={styles.headerBlock}>
                <View style={styles.headerTitleRow}>
                    {onBack ? (
                        <TouchableOpacity
                            onPress={onBack}
                            hitSlop={12}
                            style={styles.glBackBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Go back"
                        >
                            <Icon name="chevron-back" size={26} color={VP.gold} />
                        </TouchableOpacity>
                    ) : null}
                    <Text style={styles.screenTitle}>Guest List</Text>
                </View>
                <View style={VP_PARTITION_LINE} />
                <View style={styles.actionRow}>
                    <Text style={styles.actionSubtitle}>Manage your guest lists</Text>
                    <TouchableOpacity
                        style={styles.createBtn}
                        onPress={() => navigation.navigate('VenueCreateGuestList')}
                        activeOpacity={0.85}
                    >
                        <Icon name="add" size={20} color="#111827" />
                        <Text style={styles.createBtnText}>Create</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {totalLists === 0 ? (
                <ScrollView
                    contentContainerStyle={styles.emptyWrap}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={VP.gold} />
                    }
                >
                    <Icon name="people-outline" size={56} color="rgba(156,163,175,0.35)" />
                    <Text style={styles.emptyTitle}>No guest lists yet</Text>
                    <Text style={styles.emptyBody}>
                        Tap + Create above to add a recurring weekly list or a one-day list. Guest counts appear after
                        you add names on each list.
                    </Text>
                </ScrollView>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    renderItem={renderItem}
                    renderSectionHeader={({ section: { title } }) => (
                        <Text style={styles.sectionHeader}>{title}</Text>
                    )}
                    renderSectionFooter={renderSectionFooter}
                    contentContainerStyle={styles.listPad}
                    stickySectionHeadersEnabled={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={VP.gold} />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flex: 1, backgroundColor: VP.bg },
    fillCol: { flex: 1, backgroundColor: VP.bg },
    topBackRow: {
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 4,
        alignSelf: 'flex-start',
    },
    noVenueBackRow: {
        alignSelf: 'flex-start',
        marginBottom: 8,
        marginLeft: -4,
        paddingVertical: 4,
    },
    center: { flex: 1, backgroundColor: VP.bg, justifyContent: 'center', alignItems: 'center' },
    muted: { color: VP.muted, fontSize: 15, paddingHorizontal: 24, textAlign: 'center' },
    noVenueWrap: {
        flexGrow: 1,
        backgroundColor: VP.bg,
        paddingHorizontal: 28,
        paddingTop: 48,
        paddingBottom: 120,
        alignItems: 'center',
    },
    noVenueTitle: { color: VP.text, fontSize: 20, fontWeight: '800', marginTop: 20, textAlign: 'center' },
    noVenueBody: {
        color: VP.muted,
        fontSize: 15,
        lineHeight: 22,
        marginTop: 12,
        textAlign: 'center',
    },
    noVenueHint: {
        color: VP.muted,
        fontSize: 13,
        lineHeight: 20,
        marginTop: 20,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    noVenueStepsTitle: {
        color: VP.text,
        fontSize: 15,
        fontWeight: '800',
        marginTop: 22,
        alignSelf: 'stretch',
    },
    noVenueSteps: {
        color: VP.muted,
        fontSize: 14,
        lineHeight: 22,
        marginTop: 10,
        alignSelf: 'stretch',
    },
    noVenueIdLabel: {
        color: VP.muted,
        fontSize: 12,
        fontWeight: '700',
        marginTop: 20,
        alignSelf: 'stretch',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    noVenueIdValue: {
        color: VP.gold,
        fontSize: 12,
        marginTop: 8,
        alignSelf: 'stretch',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    noVenueShareBtn: {
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: VP.gold,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 12,
        alignSelf: 'stretch',
    },
    noVenueShareBtnText: { color: '#111827', fontWeight: '800', fontSize: 14 },
    devBox: {
        marginTop: 28,
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.35)',
        backgroundColor: 'rgba(251,191,36,0.06)',
        alignSelf: 'stretch',
    },
    devLabel: { color: VP.gold, fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
    devHint: { color: VP.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
    devBtn: {
        marginTop: 12,
        backgroundColor: VP.gold,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    devBtnOff: { opacity: 0.6 },
    devBtnText: { color: '#111827', fontWeight: '800', fontSize: 14 },
    headerBlock: { paddingBottom: 4 },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 12,
        gap: 4,
    },
    glBackBtn: {
        width: 40,
        height: 40,
        marginLeft: -6,
        marginRight: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    screenTitle: { color: VP.text, fontSize: 28, fontWeight: '800', flex: 1, minWidth: 0 },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 10,
        gap: 12,
    },
    actionSubtitle: {
        color: VP.text,
        fontSize: 17,
        fontWeight: '800',
        flex: 1,
    },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: VP.gold,
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 999,
    },
    createBtnText: { color: '#111827', fontSize: 16, fontWeight: '800' },
    listPad: { paddingHorizontal: 20, paddingBottom: 100 },
    sectionHeader: {
        color: VP.muted,
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginTop: 16,
        marginBottom: 10,
    },
    sectionEmpty: {
        color: VP.muted,
        fontSize: 14,
        fontStyle: 'italic',
        marginBottom: 8,
        paddingLeft: 4,
    },
    card: {
        backgroundColor: VP.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: VP.cardBorder,
        padding: 14,
        marginBottom: 10,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    cardTitle: { color: VP.text, fontSize: 17, fontWeight: '800', flex: 1 },
    cardMeta: { color: VP.text, fontSize: 15, fontWeight: '700', marginTop: 8 },
    cardSub: { color: VP.muted, fontSize: 13, marginTop: 4 },
    pill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    pillOn: { backgroundColor: 'rgba(45,212,191,0.2)' },
    pillOff: { backgroundColor: 'rgba(255,255,255,0.08)' },
    pillText: { fontSize: 11, fontWeight: '800' },
    pillTextOn: { color: VP.teal },
    pillTextOff: { color: VP.muted },
    emptyWrap: {
        flexGrow: 1,
        paddingHorizontal: 32,
        paddingTop: 48,
        paddingBottom: 100,
        alignItems: 'center',
    },
    emptyTitle: { color: VP.text, fontSize: 20, fontWeight: '800', marginTop: 20, textAlign: 'center' },
    emptyBody: {
        color: VP.muted,
        fontSize: 15,
        lineHeight: 22,
        marginTop: 12,
        textAlign: 'center',
    },
});
