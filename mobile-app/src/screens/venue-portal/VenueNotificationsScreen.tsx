import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Platform,
    ActivityIndicator,
    FlatList,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import type { StackScreenProps } from '@react-navigation/stack';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../config/supabase';
import {
    fetchVenueUserNotifications,
    markAllVenueNotificationsRead,
    markVenueNotificationRead,
    subscribeVenueUserNotifications,
    type VenueUserNotification,
} from '../../services/venueNotifications';
import { VP } from './venuePortalTheme';
import type { VenuePortalStackParamList } from './venuePortalTypes';
import { venuePortalSafeGoBack } from './venuePortalNavigation';

type Props = StackScreenProps<VenuePortalStackParamList, 'VenueNotifications'>;

export default function VenueNotificationsScreen({ navigation }: Props) {
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [rows, setRows] = useState<VenueUserNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [marking, setMarking] = useState(false);

    const load = useCallback(async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            setRows([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const list = await fetchVenueUserNotifications(user.id, user.email ?? null);
        setRows(list);
        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            void load();
        }, [load])
    );

    useEffect(() => {
        let cancelled = false;
        let unsubscribe: (() => void) | undefined;

        (async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user || cancelled) return;
            unsubscribe = subscribeVenueUserNotifications(user.id, user.email ?? null, () => {
                void load();
            });
        })();

        return () => {
            cancelled = true;
            unsubscribe?.();
        };
    }, [load]);

    const unreadCount = useMemo(() => rows.filter((n) => !n.is_read).length, [rows]);

    const visible = useMemo(() => {
        if (filter === 'unread') return rows.filter((n) => !n.is_read);
        return rows;
    }, [filter, rows]);

    const markAllRead = async () => {
        if (unreadCount === 0) return;
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        setMarking(true);
        const { ok, error } = await markAllVenueNotificationsRead(user.id, user.email ?? null);
        setMarking(false);
        if (!ok) {
            Alert.alert('Could not update', error || 'Try again.');
            return;
        }
        setRows((prev) => prev.map((n) => ({ ...n, is_read: true })));
    };

    const onPressRow = async (item: VenueUserNotification) => {
        if (item.is_read) return;
        const { ok } = await markVenueNotificationRead(item.id);
        if (ok) {
            setRows((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)));
        }
    };

    const renderItem = ({ item }: { item: VenueUserNotification }) => (
        <TouchableOpacity
            style={[styles.card, !item.is_read && styles.cardUnread]}
            onPress={() => void onPressRow(item)}
            activeOpacity={0.85}
        >
            <View style={[styles.iconCircle, iconStyleForType(item.type)]}>
                <Icon name={iconNameForType(item.type)} size={22} color={iconColorForType(item.type)} />
            </View>
            <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                </Text>
                <Text style={styles.cardDesc} numberOfLines={3}>
                    {item.message}
                </Text>
                <View style={styles.timeRow}>
                    <Icon name="time-outline" size={14} color="#6B7280" />
                    <Text style={styles.timeText}>
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </Text>
                </View>
            </View>
            {!item.is_read ? <View style={styles.unreadDot} /> : null}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={VP.bg} />
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => venuePortalSafeGoBack(navigation)} hitSlop={12} accessibilityLabel="Back">
                    <Icon name="chevron-back" size={28} color={VP.gold} />
                </TouchableOpacity>
                <View style={{ width: 28 }} />
            </View>

            {loading ? (
                <View style={[styles.loadingRoot, styles.listArea]}>
                    <Text style={styles.title}>Notifications</Text>
                    <View style={styles.loadingBox}>
                        <ActivityIndicator color={VP.gold} size="large" />
                    </View>
                </View>
            ) : (
                <FlatList
                    style={styles.listFlex}
                    data={visible}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListHeaderComponent={
                        <View style={styles.listHeader}>
                            <Text style={styles.title}>Notifications</Text>
                            <Text style={styles.subtitle}>
                                {unreadCount === 1
                                    ? '1 unread notification'
                                    : `${unreadCount} unread notifications`}
                            </Text>
                            <View style={styles.toolbar}>
                                <View style={styles.segmentWrap}>
                                    <TouchableOpacity
                                        style={[styles.segmentBtn, filter === 'all' && styles.segmentBtnActive]}
                                        onPress={() => setFilter('all')}
                                        activeOpacity={0.85}
                                    >
                                        <Text
                                            style={[
                                                styles.segmentText,
                                                filter === 'all' && styles.segmentTextActive,
                                            ]}
                                        >
                                            All
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.segmentBtn,
                                            filter === 'unread' && styles.segmentBtnActive,
                                        ]}
                                        onPress={() => setFilter('unread')}
                                        activeOpacity={0.85}
                                    >
                                        <Text
                                            style={[
                                                styles.segmentText,
                                                filter === 'unread' && styles.segmentTextActive,
                                            ]}
                                        >
                                            Unread ({unreadCount})
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    onPress={() => void markAllRead()}
                                    disabled={unreadCount === 0 || marking}
                                    activeOpacity={0.7}
                                    style={unreadCount === 0 && styles.markAllDisabled}
                                >
                                    <Text style={[styles.markAll, unreadCount === 0 && styles.markAllMuted]}>
                                        {marking ? '…' : 'Mark all read'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <View style={styles.emptyIconCircle}>
                                <Icon name="notifications-outline" size={36} color={VP.muted} />
                            </View>
                            <Text style={styles.emptyTitle}>
                                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                            </Text>
                            <Text style={styles.emptyBody}>
                                {filter === 'unread'
                                    ? 'You are all caught up.'
                                    : 'Booking alerts and updates will show up here.'}
                            </Text>
                        </View>
                    }
                    ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                    contentContainerStyle={styles.listPad}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

function iconNameForType(type: string): string {
    switch (type) {
        case 'booking':
            return 'calendar-outline';
        case 'ticket':
            return 'sparkles-outline';
        case 'guestlist':
            return 'people-outline';
        case 'security':
            return 'shield-outline';
        default:
            return 'notifications-outline';
    }
}

function iconColorForType(type: string): string {
    switch (type) {
        case 'booking':
            return VP.teal;
        case 'ticket':
            return VP.gold;
        case 'guestlist':
            return VP.teal;
        case 'security':
            return VP.coral;
        default:
            return VP.muted;
    }
}

function iconStyleForType(type: string) {
    switch (type) {
        case 'booking':
            return { backgroundColor: 'rgba(45, 212, 191, 0.18)' };
        case 'ticket':
        case 'vip':
            return { backgroundColor: 'rgba(251, 191, 36, 0.2)' };
        case 'guestlist':
            return { backgroundColor: 'rgba(45, 212, 191, 0.15)' };
        case 'security':
            return { backgroundColor: 'rgba(251, 113, 133, 0.2)' };
        default:
            return { backgroundColor: 'rgba(255,255,255,0.08)' };
    }
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: VP.bg,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingTop: Platform.OS === 'android' ? 4 : 0,
        paddingBottom: 4,
    },
    loadingRoot: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 32,
    },
    listHeader: {
        paddingHorizontal: 20,
    },
    title: {
        color: VP.text,
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginTop: 4,
    },
    subtitle: {
        color: '#8B7355',
        fontSize: 15,
        fontWeight: '600',
        marginTop: 8,
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 22,
        marginBottom: 20,
    },
    segmentWrap: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 999,
        padding: 3,
    },
    segmentBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 999,
    },
    segmentBtnActive: {
        backgroundColor: '#2A2A30',
    },
    segmentText: {
        color: VP.muted,
        fontSize: 16,
        fontWeight: '700',
    },
    segmentTextActive: {
        color: VP.text,
        fontWeight: '800',
    },
    markAll: {
        color: VP.text,
        fontSize: 17,
        fontWeight: '800',
    },
    markAllMuted: {
        color: '#5C5C66',
        fontSize: 17,
        fontWeight: '800',
    },
    markAllDisabled: {
        opacity: 0.85,
    },
    listArea: {
        flex: 1,
        minHeight: 280,
    },
    listFlex: {
        flex: 1,
    },
    listPad: {
        paddingHorizontal: 20,
        paddingBottom: 32,
    },
    loadingBox: {
        paddingTop: 64,
        alignItems: 'center',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#1E1E24',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 14,
        paddingLeft: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    cardUnread: {
        borderLeftWidth: 3,
        borderLeftColor: VP.gold,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cardBody: {
        flex: 1,
        minWidth: 0,
    },
    cardTitle: {
        color: VP.text,
        fontSize: 16,
        fontWeight: '700',
    },
    cardDesc: {
        color: VP.muted,
        fontSize: 14,
        marginTop: 4,
        lineHeight: 20,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
    },
    timeText: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '500',
    },
    unreadDot: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: VP.gold,
    },
    empty: {
        alignItems: 'center',
        paddingTop: 48,
        paddingHorizontal: 24,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        color: VP.text,
        fontSize: 18,
        fontWeight: '700',
    },
    emptyBody: {
        color: VP.muted,
        fontSize: 15,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 22,
    },
});
