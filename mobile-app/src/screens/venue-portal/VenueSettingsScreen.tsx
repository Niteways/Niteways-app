import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Modal,
    Pressable,
    FlatList,
    TextInput,
    ActivityIndicator,
    Animated,
    useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VP } from './venuePortalTheme';
import { useVenuePortal } from '../../context/VenuePortalContext';
import { fetchVenueInfo, updateVenueInfo } from '../../services/venuePortal';
import { supabase } from '../../config/supabase';
import {
    DEFAULT_NOTIFICATION_PREFS,
    fetchNotificationPrefs,
    loadCachedNotificationPrefs,
    saveNotificationPrefs,
    type NotificationPrefs,
} from '../../services/venueNotificationPrefs';
import {
    VENUE_MENU_STORAGE_KEY,
    VENUE_MENU_ITEMS,
    DEFAULT_MENU_SLOTS,
    normalizeMenuSlots,
    getVenueMenuItem,
    type VenueMenuSlotId,
} from './venueMenuConfig';
import {
    VENUE_QUICK_ACTIONS_STORAGE_KEY,
    VENUE_QUICK_ACTION_ITEMS,
    DEFAULT_QUICK_ACTION_SLOTS,
    normalizeQuickActionSlots,
    getVenueQuickActionItem,
    type VenueQuickActionId,
} from './venueQuickActionsConfig';

/**
 * Venue Settings screen — opened from the More tab.
 * Tabs: Menu (customize bottom nav) / Quick Actions / Venue / Notifications.
 * Only the "Menu" tab is functional for now; the others show a placeholder
 * until product specs for those areas are provided.
 */

const REF_BG = '#000000';
const REF_CARD = '#1A1A1F';
const REF_GOLD = '#FFCC00';

type SettingsTab = 'menu' | 'quick' | 'venue' | 'notifications';

type Props = {
    onBack: () => void;
    onMenuSaved?: () => void | Promise<void>;
    onQuickActionsSaved?: () => void | Promise<void>;
    /** Parent (VenuePortalProvider consumer) refreshes cached venue name after edit. */
    onVenueInfoSaved?: () => void | Promise<void>;
};

type PickerContext = 'menu' | 'quick';

/** Premium pill toggle that actually matches the gold/black theme. */
function GoldToggle({
    value,
    onChange,
    disabled,
}: {
    value: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(anim, {
            toValue: value ? 1 : 0,
            duration: 180,
            useNativeDriver: false,
        }).start();
    }, [value, anim]);

    const trackWidth = 50;
    const trackHeight = 28;
    const pad = 3;
    const thumbSize = trackHeight - pad * 2;

    const bg = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255,255,255,0.12)', '#FFCC00'],
    });
    const borderCol = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255,255,255,0.18)', '#FFCC00'],
    });
    const translateX = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, trackWidth - thumbSize - pad * 2],
    });

    return (
        <Pressable
            onPress={() => !disabled && onChange(!value)}
            hitSlop={10}
            disabled={disabled}
            style={{ opacity: disabled ? 0.55 : 1 }}
        >
            <Animated.View
                style={{
                    width: trackWidth,
                    height: trackHeight,
                    borderRadius: trackHeight / 2,
                    backgroundColor: bg,
                    borderWidth: 1,
                    borderColor: borderCol,
                    padding: pad,
                    justifyContent: 'center',
                }}
            >
                <Animated.View
                    style={{
                        width: thumbSize,
                        height: thumbSize,
                        borderRadius: thumbSize / 2,
                        backgroundColor: value ? '#111111' : '#E5E7EB',
                        transform: [{ translateX }],
                        shadowColor: '#000',
                        shadowOpacity: 0.28,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 3,
                    }}
                />
            </Animated.View>
        </Pressable>
    );
}

function NotificationRow({
    icon,
    iconTint,
    iconBg,
    title,
    subtitle,
    value,
    onChange,
    disabled,
    showDivider,
}: {
    icon: string;
    iconTint: string;
    iconBg: string;
    title: string;
    subtitle: string;
    value: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
    showDivider?: boolean;
}) {
    return (
        <View style={[notifStyles.row, showDivider && notifStyles.rowBorder]}>
            <View style={[notifStyles.iconWrap, { backgroundColor: iconBg }]}>
                <Icon name={icon} size={18} color={iconTint} />
            </View>
            <View style={notifStyles.textCol}>
                <Text style={notifStyles.title}>{title}</Text>
                <Text style={notifStyles.subtitle}>{subtitle}</Text>
            </View>
            <GoldToggle value={value} onChange={onChange} disabled={disabled} />
        </View>
    );
}

const notifStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 12,
    },
    rowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textCol: { flex: 1, minWidth: 0 },
    title: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
    subtitle: { color: '#9CA3AF', fontSize: 12, marginTop: 3, lineHeight: 16 },
});

function MenuDragHandle() {
    return (
        <View style={dragStyles.handleWrap}>
            {[0, 1, 2, 3, 4, 5].map((k) => (
                <View key={k} style={dragStyles.dot} />
            ))}
        </View>
    );
}

const dragStyles = StyleSheet.create({
    handleWrap: {
        width: 18,
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginRight: 12,
        justifyContent: 'space-between',
        alignContent: 'center',
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: 'rgba(156,163,175,0.85)',
        marginBottom: 3,
    },
});

type MenuAnchorRect = { left: number; top: number; width: number };

export default function VenueSettingsScreen({
    onBack,
    onMenuSaved,
    onQuickActionsSaved,
    onVenueInfoSaved,
}: Props) {
    const insets = useSafeAreaInsets();
    const { height: windowHeight, width: windowWidth } = useWindowDimensions();
    const { venueId, refresh: refreshVenueCtx } = useVenuePortal();

    const [tab, setTab] = useState<SettingsTab>('menu');
    const [menuSlots, setMenuSlots] = useState<VenueMenuSlotId[]>([...DEFAULT_MENU_SLOTS]);
    const [quickSlots, setQuickSlots] = useState<VenueQuickActionId[]>([
        ...DEFAULT_QUICK_ACTION_SLOTS,
    ]);
    const menuDropdownRefs = useRef<(View | null)[]>([null, null, null, null]);
    const quickDropdownRefs = useRef<(View | null)[]>([null, null, null, null, null, null]);
    const [pickerCtx, setPickerCtx] = useState<PickerContext | null>(null);
    const [pickerSlotIdx, setPickerSlotIdx] = useState<number | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<MenuAnchorRect | null>(null);

    const [venueName, setVenueName] = useState('');
    const [venueEmail, setVenueEmail] = useState('');
    const [venuePhone, setVenuePhone] = useState('');
    const [venueInfoLoading, setVenueInfoLoading] = useState(false);
    const [venueInfoSaving, setVenueInfoSaving] = useState(false);

    const [notifUserId, setNotifUserId] = useState<string | null>(null);
    const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
        ...DEFAULT_NOTIFICATION_PREFS,
    });
    const [notifLoading, setNotifLoading] = useState(false);

    const loadVenueInfo = useCallback(async () => {
        if (!venueId) return;
        setVenueInfoLoading(true);
        try {
            const info = await fetchVenueInfo(venueId);
            setVenueName(info?.name ?? '');
            setVenueEmail(info?.email ?? '');
            setVenuePhone(info?.phone ?? '');
        } finally {
            setVenueInfoLoading(false);
        }
    }, [venueId]);

    useEffect(() => {
        if (tab === 'venue') {
            void loadVenueInfo();
        }
    }, [tab, loadVenueInfo]);

    const loadNotificationPrefs = useCallback(async () => {
        setNotifLoading(true);
        try {
            const { data } = await supabase.auth.getUser();
            const uid = data.user?.id ?? null;
            setNotifUserId(uid);
            if (!uid) {
                setNotifPrefs({ ...DEFAULT_NOTIFICATION_PREFS });
                return;
            }
            const cached = await loadCachedNotificationPrefs(uid);
            if (cached) setNotifPrefs(cached);
            const fresh = await fetchNotificationPrefs(uid);
            setNotifPrefs(fresh);
        } finally {
            setNotifLoading(false);
        }
    }, []);

    useEffect(() => {
        if (tab === 'notifications') {
            void loadNotificationPrefs();
        }
    }, [tab, loadNotificationPrefs]);

    const notifOnCount =
        (notifPrefs.newBookingAlerts ? 1 : 0) +
        (notifPrefs.vipGuestArrivals ? 1 : 0) +
        (notifPrefs.securityAlerts ? 1 : 0);
    const notifAllOn = notifOnCount === 3;

    const toggleNotifPref = useCallback(
        (key: keyof NotificationPrefs, value: boolean) => {
            setNotifPrefs((prev) => {
                const next = { ...prev, [key]: value };
                if (notifUserId) {
                    void saveNotificationPrefs(notifUserId, next).then((res) => {
                        if (!res.ok && res.error) {
                            Alert.alert('Could not save', res.error);
                        }
                    });
                }
                return next;
            });
        },
        [notifUserId]
    );

    const saveVenueInfo = useCallback(async () => {
        if (!venueId) {
            Alert.alert('No venue linked', 'Link this account to a venue before saving.');
            return;
        }
        const trimmedName = venueName.trim();
        if (!trimmedName) {
            Alert.alert('Venue name required', 'Please enter a venue name.');
            return;
        }
        setVenueInfoSaving(true);
        try {
            const res = await updateVenueInfo(venueId, {
                name: trimmedName,
                email: venueEmail,
                phone: venuePhone,
            });
            if (!res.ok) {
                Alert.alert('Could not save', res.error || 'Please try again.');
                return;
            }
            Alert.alert('Saved', 'Venue info updated.');
            void refreshVenueCtx().catch(() => {});
            if (onVenueInfoSaved) {
                await onVenueInfoSaved();
            }
        } finally {
            setVenueInfoSaving(false);
        }
    }, [venueId, venueName, venueEmail, venuePhone, onVenueInfoSaved]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [rawMenu, rawQuick] = await Promise.all([
                AsyncStorage.getItem(VENUE_MENU_STORAGE_KEY),
                AsyncStorage.getItem(VENUE_QUICK_ACTIONS_STORAGE_KEY),
            ]);
            if (cancelled) return;
            if (rawMenu) {
                try {
                    setMenuSlots(normalizeMenuSlots(JSON.parse(rawMenu)));
                } catch {
                    /* keep defaults */
                }
            }
            if (rawQuick) {
                try {
                    setQuickSlots(normalizeQuickActionSlots(JSON.parse(rawQuick)));
                } catch {
                    /* keep defaults */
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const closePicker = useCallback(() => {
        setPickerCtx(null);
        setPickerSlotIdx(null);
        setMenuAnchor(null);
    }, []);

    const openPickerForSlot = useCallback(
        (ctx: PickerContext, index: number) => {
            const node =
                ctx === 'menu'
                    ? menuDropdownRefs.current[index]
                    : quickDropdownRefs.current[index];
            const fallbackW = Math.max(200, windowWidth - 32);
            if (!node) {
                setMenuAnchor({
                    left: 16,
                    top: windowHeight * 0.25,
                    width: fallbackW,
                });
                setPickerCtx(ctx);
                setPickerSlotIdx(index);
                return;
            }
            node.measureInWindow((x, y, w, h) => {
                const width = w > 8 ? w : fallbackW;
                const left = Math.max(12, Math.min(x, windowWidth - width - 12));
                const top = y + h;
                setMenuAnchor({ left, top, width });
                setPickerCtx(ctx);
                setPickerSlotIdx(index);
            });
        },
        [windowHeight, windowWidth]
    );

    const saveMenu = useCallback(async () => {
        await AsyncStorage.setItem(VENUE_MENU_STORAGE_KEY, JSON.stringify(menuSlots));
        Alert.alert('Saved', 'Menu preferences stored on this device.');
        if (onMenuSaved) {
            await onMenuSaved();
        }
    }, [menuSlots, onMenuSaved]);

    const saveQuickActions = useCallback(async () => {
        await AsyncStorage.setItem(
            VENUE_QUICK_ACTIONS_STORAGE_KEY,
            JSON.stringify(quickSlots)
        );
        Alert.alert('Saved', 'Quick Actions updated on the dashboard.');
        if (onQuickActionsSaved) {
            await onQuickActionsSaved();
        }
    }, [quickSlots, onQuickActionsSaved]);

    const TABS: { key: SettingsTab; label: string }[] = [
        { key: 'menu', label: 'Menu' },
        { key: 'quick', label: 'Quick Actions' },
        { key: 'venue', label: 'Venue' },
        { key: 'notifications', label: 'Notifications' },
    ];

    return (
        <View style={styles.root}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backWrap}>
                    <Icon name="chevron-back" size={26} color={VP.gold} />
                </TouchableOpacity>
                <View style={styles.topTitles}>
                    <Text style={styles.pageTitle} numberOfLines={1}>
                        Settings
                    </Text>
                    <Text style={styles.pageSub} numberOfLines={1}>
                        Configure your preferences
                    </Text>
                </View>
                <View style={styles.topBarSpacer} />
            </View>

            <View style={styles.tabBarOuter}>
                <View style={styles.tabBarInner}>
                    {TABS.map((t) => (
                        <TouchableOpacity
                            key={t.key}
                            onPress={() => setTab(t.key)}
                            style={[styles.tabChip, tab === t.key && styles.tabChipOn]}
                            activeOpacity={0.85}
                        >
                            <Text
                                style={[styles.tabChipText, tab === t.key && styles.tabChipTextOn]}
                                numberOfLines={1}
                            >
                                {t.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <ScrollView
                style={styles.body}
                contentContainerStyle={styles.bodyContent}
                showsVerticalScrollIndicator={false}
            >
                {tab === 'menu' && (
                    <View style={styles.menuCard}>
                        <Text style={styles.menuCardTitle}>Customize Main Menu</Text>
                        <Text style={styles.menuCardSub}>
                            Choose which items appear in your bottom navigation
                        </Text>
                        {[0, 1, 2, 3].map((i) => {
                            const sid = menuSlots[i];
                            const item = getVenueMenuItem(sid);
                            return (
                                <View key={i} style={styles.menuPositionBlock}>
                                    <View style={styles.menuPositionLabelRow}>
                                        <MenuDragHandle />
                                        <Text style={styles.menuPositionLabel}>
                                            Position {i + 1}
                                        </Text>
                                    </View>
                                    <View
                                        ref={(r) => {
                                            menuDropdownRefs.current[i] = r;
                                        }}
                                        collapsable={false}
                                    >
                                        <TouchableOpacity
                                            style={styles.menuDropdownRow}
                                            onPress={() => openPickerForSlot('menu', i)}
                                            activeOpacity={0.85}
                                        >
                                            <Icon
                                                name={item?.icon ?? 'ellipse-outline'}
                                                size={22}
                                                color={VP.text}
                                            />
                                            <Text style={styles.menuDropdownText} numberOfLines={1}>
                                                {item?.label ?? sid}
                                            </Text>
                                            <Icon name="chevron-down" size={20} color={VP.muted} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={() => void saveMenu()}
                            activeOpacity={0.88}
                        >
                            <Icon
                                name="save-outline"
                                size={20}
                                color="#111"
                                style={styles.saveBtnIcon}
                            />
                            <Text style={styles.saveBtnText}>Save Menu</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {tab === 'quick' && (
                    <View style={styles.menuCard}>
                        <Text style={styles.menuCardTitle}>Customize Quick Actions</Text>
                        <Text style={styles.menuCardSub}>
                            Choose which actions appear on your dashboard
                        </Text>
                        {[0, 1, 2, 3, 4, 5].map((i) => {
                            const sid = quickSlots[i];
                            const item = getVenueQuickActionItem(sid);
                            return (
                                <View key={i} style={styles.menuPositionBlock}>
                                    <View style={styles.menuPositionLabelRow}>
                                        <MenuDragHandle />
                                        <Text style={styles.menuPositionLabel}>
                                            Action {i + 1}
                                        </Text>
                                    </View>
                                    <View
                                        ref={(r) => {
                                            quickDropdownRefs.current[i] = r;
                                        }}
                                        collapsable={false}
                                    >
                                        <TouchableOpacity
                                            style={styles.menuDropdownRow}
                                            onPress={() => openPickerForSlot('quick', i)}
                                            activeOpacity={0.85}
                                        >
                                            <Icon
                                                name={item?.icon ?? 'ellipse-outline'}
                                                size={22}
                                                color={VP.text}
                                            />
                                            <Text style={styles.menuDropdownText} numberOfLines={1}>
                                                {item?.label ?? sid}
                                            </Text>
                                            <Icon name="chevron-down" size={20} color={VP.muted} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={() => void saveQuickActions()}
                            activeOpacity={0.88}
                        >
                            <Icon
                                name="save-outline"
                                size={20}
                                color="#111"
                                style={styles.saveBtnIcon}
                            />
                            <Text style={styles.saveBtnText}>Save Quick Actions</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {tab === 'venue' && (
                    <View style={styles.menuCard}>
                        <Text style={styles.menuCardTitle}>Venue Info</Text>

                        <View style={styles.venueField}>
                            <Text style={styles.venueFieldLabel}>Venue Name</Text>
                            <TextInput
                                style={styles.venueInput}
                                value={venueName}
                                onChangeText={setVenueName}
                                placeholder="NightFlow Club"
                                placeholderTextColor="rgba(156,163,175,0.55)"
                                editable={!venueInfoLoading && !venueInfoSaving}
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={styles.venueField}>
                            <Text style={styles.venueFieldLabel}>Contact Email</Text>
                            <TextInput
                                style={styles.venueInput}
                                value={venueEmail}
                                onChangeText={setVenueEmail}
                                placeholder="info@nightflow.com"
                                placeholderTextColor="rgba(156,163,175,0.55)"
                                editable={!venueInfoLoading && !venueInfoSaving}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <View style={styles.venueField}>
                            <Text style={styles.venueFieldLabel}>Phone</Text>
                            <TextInput
                                style={styles.venueInput}
                                value={venuePhone}
                                onChangeText={setVenuePhone}
                                placeholder="+1 (555) 123-4567"
                                placeholderTextColor="rgba(156,163,175,0.55)"
                                editable={!venueInfoLoading && !venueInfoSaving}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.saveBtn,
                                (venueInfoSaving || venueInfoLoading || !venueId) &&
                                    styles.saveBtnDisabled,
                            ]}
                            onPress={() => void saveVenueInfo()}
                            disabled={venueInfoSaving || venueInfoLoading || !venueId}
                            activeOpacity={0.88}
                        >
                            {venueInfoSaving ? (
                                <ActivityIndicator
                                    size="small"
                                    color="#111"
                                    style={styles.saveBtnIcon}
                                />
                            ) : (
                                <Icon
                                    name="save-outline"
                                    size={20}
                                    color="#111"
                                    style={styles.saveBtnIcon}
                                />
                            )}
                            <Text style={styles.saveBtnText}>
                                {venueInfoSaving ? 'Saving…' : 'Save Venue Info'}
                            </Text>
                        </TouchableOpacity>

                        {!venueId && (
                            <Text style={styles.venueWarning}>
                                No venue linked to this account yet — sign in as a venue owner to
                                edit.
                            </Text>
                        )}
                    </View>
                )}

                {tab === 'notifications' && (
                    <View style={styles.menuCard}>
                        <View style={styles.notifHeaderRow}>
                            <View style={styles.notifHeaderIcon}>
                                <Icon name="notifications-outline" size={18} color="#FFCC00" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.menuCardTitle}>Notifications</Text>
                                <Text style={styles.notifHeaderSub}>
                                    Choose what you want to be alerted about
                                </Text>
                            </View>
                            <View
                                style={[
                                    styles.notifCountPill,
                                    notifAllOn && styles.notifCountPillOn,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.notifCountText,
                                        notifAllOn && styles.notifCountTextOn,
                                    ]}
                                >
                                    {notifOnCount}/3
                                </Text>
                            </View>
                        </View>

                        <View style={styles.notifDivider} />

                        <NotificationRow
                            icon="calendar-outline"
                            iconTint="#FFCC00"
                            iconBg="rgba(255,204,0,0.15)"
                            title="New Booking Alerts"
                            subtitle="Get notified on new bookings"
                            value={notifPrefs.newBookingAlerts}
                            onChange={(v) => toggleNotifPref('newBookingAlerts', v)}
                            disabled={notifLoading || !notifUserId}
                            showDivider
                        />
                        <NotificationRow
                            icon="star-outline"
                            iconTint="#F472B6"
                            iconBg="rgba(244,114,182,0.15)"
                            title="VIP Guest Arrivals"
                            subtitle="Alert on VIP check-ins"
                            value={notifPrefs.vipGuestArrivals}
                            onChange={(v) => toggleNotifPref('vipGuestArrivals', v)}
                            disabled={notifLoading || !notifUserId}
                            showDivider
                        />
                        <NotificationRow
                            icon="shield-checkmark-outline"
                            iconTint="#4DB6AC"
                            iconBg="rgba(77,182,172,0.15)"
                            title="Security Alerts"
                            subtitle="High-priority alerts"
                            value={notifPrefs.securityAlerts}
                            onChange={(v) => toggleNotifPref('securityAlerts', v)}
                            disabled={notifLoading || !notifUserId}
                        />

                        {!notifUserId && !notifLoading && (
                            <Text style={styles.venueWarning}>
                                Sign in to save notification preferences across devices.
                            </Text>
                        )}
                    </View>
                )}

                <View style={{ height: 16 }} />
            </ScrollView>

            <Modal
                visible={pickerCtx !== null && pickerSlotIdx !== null && menuAnchor !== null}
                transparent
                animationType="fade"
                onRequestClose={closePicker}
            >
                <View style={styles.menuPickerModalFill}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closePicker} />
                    {menuAnchor && pickerCtx && pickerSlotIdx !== null ? (
                        <View
                            style={[
                                styles.menuPickerPopover,
                                {
                                    left: menuAnchor.left,
                                    top: menuAnchor.top,
                                    width: menuAnchor.width,
                                    maxHeight: Math.max(
                                        160,
                                        windowHeight - menuAnchor.top - insets.bottom - 12
                                    ),
                                },
                            ]}
                        >
                            {pickerCtx === 'menu' ? (
                                <FlatList
                                    data={VENUE_MENU_ITEMS}
                                    keyExtractor={(item) => item.id}
                                    style={{
                                        maxHeight: Math.max(
                                            160,
                                            windowHeight - menuAnchor.top - insets.bottom - 12
                                        ),
                                    }}
                                    contentContainerStyle={styles.menuPickerListContent}
                                    nestedScrollEnabled
                                    keyboardShouldPersistTaps="handled"
                                    showsVerticalScrollIndicator
                                    bounces={false}
                                    renderItem={({ item: opt }) => {
                                        const slotIdx = pickerSlotIdx;
                                        const selected = menuSlots[slotIdx] === opt.id;
                                        return (
                                            <TouchableOpacity
                                                style={[
                                                    styles.menuPickerRow,
                                                    selected && styles.menuPickerRowOn,
                                                ]}
                                                onPress={() => {
                                                    setMenuSlots((prev) => {
                                                        const next = [
                                                            ...prev,
                                                        ] as VenueMenuSlotId[];
                                                        next[slotIdx] = opt.id;
                                                        return next;
                                                    });
                                                    closePicker();
                                                }}
                                                activeOpacity={0.85}
                                            >
                                                <View style={styles.menuPickerCheckWrap}>
                                                    {selected ? (
                                                        <Icon
                                                            name="checkmark"
                                                            size={18}
                                                            color={VP.text}
                                                        />
                                                    ) : null}
                                                </View>
                                                <Icon
                                                    name={opt.icon}
                                                    size={20}
                                                    color={VP.text}
                                                />
                                                <Text style={styles.menuPickerLabel}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            ) : (
                                <FlatList
                                    data={VENUE_QUICK_ACTION_ITEMS}
                                    keyExtractor={(item) => item.id}
                                    style={{
                                        maxHeight: Math.max(
                                            160,
                                            windowHeight - menuAnchor.top - insets.bottom - 12
                                        ),
                                    }}
                                    contentContainerStyle={styles.menuPickerListContent}
                                    nestedScrollEnabled
                                    keyboardShouldPersistTaps="handled"
                                    showsVerticalScrollIndicator
                                    bounces={false}
                                    renderItem={({ item: opt }) => {
                                        const slotIdx = pickerSlotIdx;
                                        const currentAtSlot = quickSlots[slotIdx];
                                        const selected = currentAtSlot === opt.id;
                                        const dupIdx = quickSlots.findIndex(
                                            (v, i) => v === opt.id && i !== slotIdx
                                        );
                                        return (
                                            <TouchableOpacity
                                                style={[
                                                    styles.menuPickerRow,
                                                    selected && styles.menuPickerRowOn,
                                                ]}
                                                onPress={() => {
                                                    setQuickSlots((prev) => {
                                                        const next = [
                                                            ...prev,
                                                        ] as VenueQuickActionId[];
                                                        if (dupIdx >= 0) {
                                                            next[dupIdx] = currentAtSlot;
                                                        }
                                                        next[slotIdx] = opt.id;
                                                        return next;
                                                    });
                                                    closePicker();
                                                }}
                                                activeOpacity={0.85}
                                            >
                                                <View style={styles.menuPickerCheckWrap}>
                                                    {selected ? (
                                                        <Icon
                                                            name="checkmark"
                                                            size={18}
                                                            color={VP.text}
                                                        />
                                                    ) : null}
                                                </View>
                                                <Icon
                                                    name={opt.icon}
                                                    size={20}
                                                    color={VP.text}
                                                />
                                                <Text style={styles.menuPickerLabel}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            )}
                        </View>
                    ) : null}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: REF_BG },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingTop: 2,
        paddingBottom: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    backWrap: { width: 40, justifyContent: 'center' },
    topBarSpacer: { width: 40 },
    topTitles: { flex: 1, minWidth: 0, paddingRight: 4 },
    pageTitle: { color: VP.text, fontSize: 22, fontWeight: '800' },
    pageSub: { color: VP.muted, fontSize: 13, marginTop: 2, lineHeight: 18 },
    tabBarOuter: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 6,
    },
    tabBarInner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: 4,
    },
    tabChip: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 4,
        marginHorizontal: 2,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0,
    },
    tabChipOn: {
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    tabChipText: { color: VP.muted, fontSize: 12, fontWeight: '700' },
    tabChipTextOn: { color: VP.text },
    body: { flex: 1 },
    bodyContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 120 },
    menuCard: {
        backgroundColor: REF_CARD,
        borderRadius: 16,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    menuCardTitle: { color: VP.text, fontSize: 18, fontWeight: '800' },
    menuCardSub: {
        color: VP.muted,
        fontSize: 13,
        marginTop: 6,
        marginBottom: 18,
        lineHeight: 18,
    },
    menuPositionBlock: { marginBottom: 16 },
    menuPositionLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    menuPositionLabel: { color: VP.muted, fontSize: 12, fontWeight: '600' },
    menuDropdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: VP.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    menuDropdownText: {
        flex: 1,
        marginLeft: 12,
        color: VP.text,
        fontSize: 16,
        fontWeight: '700',
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: REF_GOLD,
        borderRadius: 14,
        paddingVertical: 14,
        marginTop: 18,
    },
    saveBtnDisabled: { opacity: 0.55 },
    saveBtnIcon: { marginRight: 8 },
    saveBtnText: { color: '#111', fontSize: 16, fontWeight: '800' },
    venueField: { marginTop: 14 },
    venueFieldLabel: {
        color: VP.text,
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
    },
    venueInput: {
        backgroundColor: VP.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 12,
        paddingHorizontal: 14,
        color: VP.text,
        fontSize: 15,
        fontWeight: '600',
    },
    venueWarning: {
        marginTop: 12,
        color: VP.coral,
        fontSize: 12,
        textAlign: 'center',
    },
    notifHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 4,
    },
    notifHeaderIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,204,0,0.15)',
    },
    notifHeaderSub: {
        color: VP.muted,
        fontSize: 12,
        marginTop: 3,
        lineHeight: 16,
    },
    notifCountPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    notifCountPillOn: {
        backgroundColor: 'rgba(255,204,0,0.15)',
        borderColor: 'rgba(255,204,0,0.55)',
    },
    notifCountText: {
        color: VP.muted,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    notifCountTextOn: {
        color: '#FFCC00',
    },
    notifDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginTop: 14,
        marginBottom: 2,
    },
    placeholderCard: {
        backgroundColor: REF_CARD,
        borderRadius: 16,
        padding: 22,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
    },
    placeholderIcon: { marginBottom: 10 },
    placeholderTitle: {
        color: VP.text,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 6,
    },
    placeholderBody: {
        color: VP.muted,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    menuPickerModalFill: { flex: 1 },
    menuPickerPopover: {
        position: 'absolute',
        backgroundColor: REF_CARD,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
        zIndex: 2,
    },
    menuPickerListContent: { paddingBottom: 6 },
    menuPickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    menuPickerRowOn: { backgroundColor: 'rgba(255,255,255,0.04)' },
    menuPickerCheckWrap: { width: 24, alignItems: 'center', marginRight: 2 },
    menuPickerLabel: {
        color: VP.text,
        fontSize: 15,
        fontWeight: '700',
        marginLeft: 4,
    },
});
