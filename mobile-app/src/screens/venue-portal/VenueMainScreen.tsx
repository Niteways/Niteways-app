import React, { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { fetchVenueUnreadNotificationCount } from '../../services/venueNotifications';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    StatusBar,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type { StackNavigationProp } from '@react-navigation/stack';
import { CommonActions } from '@react-navigation/native';
import { authService } from '../../services/auth';
import { VenueDashboardTab } from './VenueDashboardTab';
import { VenueTeamTab } from './VenueTeamTab';
import { VenueBookingsTab } from './VenueBookingsTab';
import { VenueTableBookingPanel } from './VenueTableBookingPanel';
import { VenueGuestListTab } from './VenueGuestListTab';
import { VenueMoreTab } from './VenueMoreTab';
import { VenueHubMenu, HUB_MENU_BG, type VenueHubAction } from './VenueHubMenu';
import { VenuePlaceholderTab } from './VenuePlaceholderTab';
import { VenueTicketingScreen } from './VenueTicketingScreen';
import { VenueCheckInScreen } from './VenueCheckInScreen';
import { VenueSecurityScreen } from './VenueSecurityScreen';
import { VenueAnalyticsScreen } from './VenueAnalyticsScreen';
import { VenueReportsScreen } from './VenueReportsScreen';
import VenueSettingsScreen from './VenueSettingsScreen';
import VenueVenueInfoScreen from './VenueVenueInfoScreen';
import { VP, VP_PARTITION_LINE } from './venuePortalTheme';
import { VenueProfileTray } from './VenueProfileTray';
import type { VenuePortalStackParamList } from './venuePortalTypes';
import {
    VENUE_MENU_STORAGE_KEY,
    normalizeMenuSlots,
    getVenueMenuItem,
    DEFAULT_MENU_SLOTS,
} from './venueMenuConfig';
import {
    VENUE_QUICK_ACTIONS_STORAGE_KEY,
    normalizeQuickActionSlots,
    DEFAULT_QUICK_ACTION_SLOTS,
    type VenueQuickActionId,
} from './venueQuickActionsConfig';

export type { VenuePortalStackParamList } from './venuePortalTypes';

type Nav = StackNavigationProp<VenuePortalStackParamList, 'VenueMain'>;

/** Bottom bar matches web-style venue shell: Guests · Requests · Tickets · Team · More (menu hub). */
type TabKey = 'guests' | 'requests' | 'tickets' | 'team' | 'more';

type MorePanel =
    | 'hub'
    | 'dashboard'
    | 'analytics'
    | 'reports'
    | 'bookings_all'
    | 'settings'
    | 'check_in'
    | 'security'
    | 'venue_info';

export default function VenueMainScreen({ navigation }: { navigation: Nav }) {
    const [tab, setTab] = useState<TabKey>('more');
    const [morePanel, setMorePanel] = useState<MorePanel>('hub');
    const [barSlots, setBarSlots] = useState<string[]>([...DEFAULT_MENU_SLOTS]);
    const [quickActionSlots, setQuickActionSlots] = useState<VenueQuickActionId[]>([
        ...DEFAULT_QUICK_ACTION_SLOTS,
    ]);
    const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

    const reloadBarSlots = useCallback(async () => {
        const raw = await AsyncStorage.getItem(VENUE_MENU_STORAGE_KEY);
        if (!raw) {
            setBarSlots([...DEFAULT_MENU_SLOTS]);
            return;
        }
        try {
            setBarSlots(normalizeMenuSlots(JSON.parse(raw)));
        } catch {
            setBarSlots([...DEFAULT_MENU_SLOTS]);
        }
    }, []);

    const reloadQuickActionSlots = useCallback(async () => {
        const raw = await AsyncStorage.getItem(VENUE_QUICK_ACTIONS_STORAGE_KEY);
        if (!raw) {
            setQuickActionSlots([...DEFAULT_QUICK_ACTION_SLOTS]);
            return;
        }
        try {
            setQuickActionSlots(normalizeQuickActionSlots(JSON.parse(raw)));
        } catch {
            setQuickActionSlots([...DEFAULT_QUICK_ACTION_SLOTS]);
        }
    }, []);

    useEffect(() => {
        void reloadBarSlots().catch(() => setBarSlots([...DEFAULT_MENU_SLOTS]));
        void reloadQuickActionSlots().catch(() =>
            setQuickActionSlots([...DEFAULT_QUICK_ACTION_SLOTS])
        );
    }, [reloadBarSlots, reloadQuickActionSlots]);

    const refreshNotificationUnread = useCallback(async () => {
        const u = await authService.getStoredUser();
        if (!u?.id) {
            setNotificationUnreadCount(0);
            return;
        }
        const n = await fetchVenueUnreadNotificationCount(u.id, u.email ?? null);
        setNotificationUnreadCount(n);
    }, []);

    useFocusEffect(
        useCallback(() => {
            void reloadBarSlots().catch(() => setBarSlots([...DEFAULT_MENU_SLOTS]));
            void reloadQuickActionSlots().catch(() =>
                setQuickActionSlots([...DEFAULT_QUICK_ACTION_SLOTS])
            );
            void refreshNotificationUnread();
        }, [reloadBarSlots, reloadQuickActionSlots, refreshNotificationUnread])
    );

    useEffect(() => {
        if (tab !== 'more') {
            setMorePanel('hub');
        }
    }, [tab]);

    const openBooking = (id: string) => {
        navigation.navigate('VenueBookingDetail', { bookingId: id });
    };

    const signOutToWelcome = useCallback(async () => {
        await authService.logout();
        navigation.getParent()?.dispatch(
            CommonActions.reset({ index: 0, routes: [{ name: 'Welcome' }] })
        );
    }, [navigation]);

    const comingSoon = useCallback((name: string) => {
        Alert.alert(name, 'This screen will be added in the next step.');
    }, []);

    const onNavigateFromDashboard = useCallback(
        (
            t:
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
                | 'dashboard'
        ) => {
            if (t === 'scan_qr') {
                comingSoon('Scan QR');
                return;
            }
            if (t === 'more') {
                setMorePanel('settings');
                return;
            }
            if (t === 'guests') {
                setMorePanel('hub');
                setTab('guests');
                return;
            }
            if (t === 'bookings_pending') {
                setMorePanel('hub');
                setTab('requests');
                return;
            }
            if (t === 'tickets') {
                setMorePanel('hub');
                setTab('tickets');
                return;
            }
            if (t === 'team') {
                setMorePanel('hub');
                setTab('team');
                return;
            }
            if (t === 'settings') {
                setMorePanel('settings');
                return;
            }
            if (t === 'analytics') {
                setMorePanel('analytics');
                return;
            }
            if (t === 'security') {
                setMorePanel('security');
                return;
            }
            if (t === 'dashboard') {
                setMorePanel('dashboard');
                return;
            }
            setMorePanel('bookings_all');
        },
        [comingSoon]
    );

    const handleHubAction = useCallback(
        (action: VenueHubAction) => {
            switch (action) {
                case 'dashboard':
                    setMorePanel('dashboard');
                    break;
                case 'table_booking':
                    setMorePanel('bookings_all');
                    break;
                case 'booking_requests':
                    setTab('requests');
                    break;
                case 'guest_list':
                    setTab('guests');
                    break;
                case 'ticketing':
                    setTab('tickets');
                    break;
                case 'team':
                case 'team_statistics':
                    setTab('team');
                    break;
                case 'check_in':
                    setMorePanel('check_in');
                    break;
                case 'security':
                    setMorePanel('security');
                    break;
                case 'analytics':
                    setMorePanel('analytics');
                    break;
                case 'reports':
                    setMorePanel('reports');
                    break;
                case 'settings':
                    setMorePanel('settings');
                    break;
                case 'venue_info':
                    setMorePanel('venue_info');
                    break;
                default:
                    break;
            }
        },
        [comingSoon]
    );

    const openVenueSettings = useCallback(() => {
        setTab('more');
        setMorePanel('settings');
    }, []);

    const onBarSlotPress = useCallback(
        (slotId: string) => {
            switch (slotId) {
                case 'guests':
                    setTab('guests');
                    setMorePanel('hub');
                    break;
                case 'requests':
                    setTab('requests');
                    setMorePanel('hub');
                    break;
                case 'ticketing':
                    setTab('tickets');
                    setMorePanel('hub');
                    break;
                case 'team':
                    setTab('team');
                    setMorePanel('hub');
                    break;
                case 'home':
                    setTab('more');
                    setMorePanel('dashboard');
                    break;
                case 'analytics':
                    setTab('more');
                    setMorePanel('analytics');
                    break;
                case 'tables':
                    setTab('more');
                    setMorePanel('bookings_all');
                    break;
                case 'settings':
                    setTab('more');
                    setMorePanel('settings');
                    break;
                case 'check_in':
                    setTab('more');
                    setMorePanel('check_in');
                    break;
                case 'security':
                    setTab('more');
                    setMorePanel('security');
                    break;
                case 'chat':
                    comingSoon('Chat');
                    break;
                default:
                    break;
            }
        },
        [comingSoon]
    );

    const barSlotActive = useCallback(
        (slotId: string) => {
            switch (slotId) {
                case 'guests':
                    return tab === 'guests';
                case 'requests':
                    return tab === 'requests';
                case 'ticketing':
                    return tab === 'tickets';
                case 'team':
                    return tab === 'team';
                case 'home':
                    return tab === 'more' && morePanel === 'dashboard';
                case 'analytics':
                    return tab === 'more' && morePanel === 'analytics';
                case 'tables':
                    return tab === 'more' && morePanel === 'bookings_all';
                case 'settings':
                    return tab === 'more' && morePanel === 'settings';
                case 'check_in':
                    return tab === 'more' && morePanel === 'check_in';
                case 'security':
                    return tab === 'more' && morePanel === 'security';
                default:
                    return false;
            }
        },
        [tab, morePanel]
    );

    const renderMoreStack = () => {
        if (morePanel === 'hub') {
            return (
                <VenueHubMenu
                    onAction={handleHubAction}
                    profileTray={
                        <VenueProfileTray
                            navigation={navigation}
                            onOpenVenueSettings={openVenueSettings}
                            onSignOut={signOutToWelcome}
                            notificationUnreadCount={notificationUnreadCount}
                        />
                    }
                />
            );
        }
        if (morePanel === 'check_in') {
            return (
                <View style={styles.flex}>
                    <VenueCheckInScreen navigation={navigation} onBack={() => setMorePanel('hub')} />
                </View>
            );
        }
        if (morePanel === 'security') {
            return (
                <View style={styles.flex}>
                    <VenueSecurityScreen onBack={() => setMorePanel('hub')} />
                </View>
            );
        }
        if (morePanel === 'analytics') {
            return (
                <View style={styles.flex}>
                    <VenueAnalyticsScreen onBack={() => setMorePanel('hub')} />
                </View>
            );
        }
        if (morePanel === 'reports') {
            return (
                <View style={styles.flex}>
                    <VenueReportsScreen onBack={() => setMorePanel('hub')} />
                </View>
            );
        }
        if (morePanel === 'dashboard') {
            return (
                <View style={styles.flex}>
                    <BackHeader
                        title="Dashboard"
                        onBack={() => setMorePanel('hub')}
                        showPartition
                    />
                    <VenueDashboardTab
                        onNavigateTab={onNavigateFromDashboard}
                        quickActionSlots={quickActionSlots}
                    />
                </View>
            );
        }
        if (morePanel === 'bookings_all') {
            return (
                <View style={styles.flex}>
                    <BackHeader
                        title="Table Booking"
                        onBack={() => setMorePanel('hub')}
                        showPartition
                    />
                    <VenueTableBookingPanel onOpenBooking={openBooking} />
                </View>
            );
        }
        if (morePanel === 'venue_info') {
            return (
                <View style={styles.flex}>
                    <VenueVenueInfoScreen onBack={() => setMorePanel('hub')} />
                </View>
            );
        }
        if (morePanel === 'settings') {
            return (
                <View style={styles.flex}>
                    <VenueSettingsScreen
                        onBack={() => setMorePanel('hub')}
                        onMenuSaved={reloadBarSlots}
                        onQuickActionsSaved={reloadQuickActionSlots}
                    />
                </View>
            );
        }
        return (
            <View style={styles.flex}>
                <BackHeader title="Venue & account" onBack={() => setMorePanel('hub')} />
                <VenueMoreTab onSignOut={signOutToWelcome} />
            </View>
        );
    };

    const ticketsBlack = tab === 'tickets';
    const checkInBlack = tab === 'more' && morePanel === 'check_in';
    const securityBlack = tab === 'more' && morePanel === 'security';
    const analyticsBlack = tab === 'more' && morePanel === 'analytics';
    const reportsBlack = tab === 'more' && morePanel === 'reports';
    const settingsBlack = tab === 'more' && morePanel === 'settings';
    const venueInfoBlack = tab === 'more' && morePanel === 'venue_info';
    const shellBlack =
        ticketsBlack ||
        checkInBlack ||
        securityBlack ||
        analyticsBlack ||
        reportsBlack ||
        settingsBlack ||
        venueInfoBlack;

    return (
        <SafeAreaView
            style={[
                styles.safe,
                tab === 'more' && morePanel === 'hub' && { backgroundColor: HUB_MENU_BG },
                shellBlack && { backgroundColor: '#000000' },
            ]}
            edges={['top']}
        >
            <StatusBar
                barStyle="light-content"
                backgroundColor={
                    tab === 'more' && morePanel === 'hub'
                        ? HUB_MENU_BG
                        : shellBlack
                          ? '#000000'
                          : VP.bg
                }
            />
            <View
                style={[
                    styles.body,
                    tab === 'more' && morePanel === 'hub' && { backgroundColor: HUB_MENU_BG },
                    shellBlack && { backgroundColor: '#000000' },
                ]}
            >
                {tab === 'guests' && (
                    <VenueGuestListTab
                        navigation={navigation}
                        onBack={() => {
                            setTab('more');
                            setMorePanel('hub');
                        }}
                    />
                )}
                {tab === 'requests' && (
                    <VenueBookingsTab
                        initialFilter="pending"
                        onOpenBooking={openBooking}
                        onBack={() => {
                            setTab('more');
                            setMorePanel('hub');
                        }}
                    />
                )}
                {tab === 'tickets' && (
                    <VenueTicketingScreen
                        navigation={navigation}
                        onBack={() => {
                            setTab('more');
                            setMorePanel('hub');
                        }}
                    />
                )}
                {tab === 'team' && (
                    <VenueTeamTab
                        onBack={() => {
                            setTab('more');
                            setMorePanel('hub');
                        }}
                    />
                )}
                {tab === 'more' && renderMoreStack()}
            </View>

            <View
                style={[
                    styles.tabBar,
                    { paddingBottom: Platform.OS === 'ios' ? 20 : 10 },
                    tab === 'more' && morePanel === 'hub' && {
                        backgroundColor: HUB_MENU_BG,
                        borderTopColor: 'rgba(255,255,255,0.06)',
                    },
                    shellBlack && {
                        backgroundColor: '#000000',
                        borderTopColor: 'rgba(255,255,255,0.08)',
                    },
                ]}
            >
                {barSlots.map((slotId) => {
                    const item = getVenueMenuItem(slotId);
                    if (!item) return null;
                    return (
                        <TabItem
                            key={slotId}
                            label={item.label}
                            icon={item.icon}
                            iconOn={item.iconOn}
                            active={barSlotActive(slotId)}
                            onPress={() => onBarSlotPress(slotId)}
                        />
                    );
                })}
                <TabItem
                    label="More"
                    icon="menu-outline"
                    iconOn="menu"
                    active={tab === 'more'}
                    onPress={() => setTab('more')}
                />
            </View>
        </SafeAreaView>
    );
}

function BackHeader({
    title,
    onBack,
    showPartition,
}: {
    title?: string;
    onBack: () => void;
    /** Full-width rule under the header row (Table Booking — matches Guest list partition). */
    showPartition?: boolean;
}) {
    return (
        <View>
            <View style={[styles.backHeader, showPartition && styles.backHeaderNoBottomBorder]}>
                <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backBtn}>
                    <Icon name="chevron-back" size={26} color={VP.gold} />
                </TouchableOpacity>
                {title ? (
                    <Text style={styles.backTitle} numberOfLines={1}>
                        {title}
                    </Text>
                ) : (
                    <View style={styles.backTitleFlex} />
                )}
                <View style={styles.backSpacer} />
            </View>
            {showPartition ? <View style={VP_PARTITION_LINE} /> : null}
        </View>
    );
}

function TabItem({
    label,
    icon,
    iconOn,
    active,
    onPress,
}: {
    label: string;
    icon: string;
    iconOn: string;
    active: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.75}>
            <Icon
                name={active ? iconOn : icon}
                size={active ? 22 : 20}
                color={active ? '#FFD700' : VP.muted}
            />
            <Text style={[styles.tabLabel, active && styles.tabLabelOn]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: VP.bg },
    flex: { flex: 1 },
    body: { flex: 1 },
    backHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.12)',
        backgroundColor: VP.bg,
    },
    backHeaderNoBottomBorder: {
        borderBottomWidth: 0,
    },
    backBtn: { width: 40, justifyContent: 'center', alignItems: 'flex-start' },
    backTitle: { flex: 1, color: VP.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
    backTitleFlex: { flex: 1 },
    backSpacer: { width: 40 },
    tabBar: {
        flexDirection: 'row',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255,255,255,0.08)',
        backgroundColor: VP.bg,
        paddingTop: 8,
    },
    tabItem: { flex: 1, alignItems: 'center', gap: 4 },
    tabLabel: { fontSize: 10, color: VP.muted, fontWeight: '600' },
    tabLabelOn: { color: '#FFD700' },
});
