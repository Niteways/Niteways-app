import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    FlatList,
    TouchableOpacity,
    TextInput,
    Alert,
    Platform,
    Switch,
    Image,
    Modal,
    Pressable,
    useWindowDimensions,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { authService } from '../../services/auth';
import { fetchProfileSummary } from '../../services/venuePortal';
import { VP } from './venuePortalTheme';
import type { VenuePortalStackParamList, VenueProfileTab } from './venuePortalTypes';
import { venuePortalSafeGoBack } from './venuePortalNavigation';
import { VENUE_PROFILE_STORAGE_KEY } from './VenueProfileTray';
import MemberCard, { type LoyaltyLevel } from '../../components/MemberCard';
import {
    VENUE_MENU_STORAGE_KEY,
    VENUE_MENU_ITEMS,
    DEFAULT_MENU_SLOTS,
    normalizeMenuSlots,
    getVenueMenuItem,
} from './venueMenuConfig';

const AVATAR_KEY = '@venue_owner_avatar_v1';

/** Reference mock — near-black shell + vivid gold CTA */
const REF_BG = '#121212';
const REF_GOLD = '#FFCC00';
const AVATAR_OLIVE = '#4A3F2E';

function MenuDragHandle() {
    return (
        <View style={menuDragStyles.handleWrap}>
            {[0, 1, 2, 3, 4, 5].map((k) => (
                <View key={k} style={menuDragStyles.dot} />
            ))}
        </View>
    );
}

const menuDragStyles = StyleSheet.create({
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

type PhoneCountry = {
    id: string;
    name: string;
    dial: string;
    nationalLen: number;
};

/** Ten major markets — must be defined before helpers that reference it */
const PHONE_COUNTRIES: PhoneCountry[] = [
    { id: 'US', name: 'United States', dial: '+1', nationalLen: 10 },
    { id: 'GB', name: 'United Kingdom', dial: '+44', nationalLen: 10 },
    { id: 'IN', name: 'India', dial: '+91', nationalLen: 10 },
    { id: 'AU', name: 'Australia', dial: '+61', nationalLen: 9 },
    { id: 'DE', name: 'Germany', dial: '+49', nationalLen: 11 },
    { id: 'FR', name: 'France', dial: '+33', nationalLen: 9 },
    { id: 'BR', name: 'Brazil', dial: '+55', nationalLen: 11 },
    { id: 'JP', name: 'Japan', dial: '+81', nationalLen: 10 },
    { id: 'CN', name: 'China', dial: '+86', nationalLen: 11 },
    { id: 'MX', name: 'Mexico', dial: '+52', nationalLen: 10 },
];

type Props = {
    navigation: StackNavigationProp<VenuePortalStackParamList, 'VenueUserProfile'>;
    route: RouteProp<VenuePortalStackParamList, 'VenueUserProfile'>;
};

type UserForm = {
    name: string;
    email: string;
    phone: string;
    phoneCountryId: string;
    role: string;
    id: string;
    loyaltyLevel: string;
    totalCheckIns: number;
    totalGuestsAdded: number;
};

function initials(name: string): string {
    const p = name.trim().split(/\s+/).filter(Boolean);
    if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
    if (p.length === 1 && p[0].length >= 2) return p[0].slice(0, 2).toUpperCase();
    return 'GU';
}

function roleDisplayLabel(
    profileRole: string | null,
    appRole: string | undefined
): string {
    const r = profileRole || appRole;
    if (r === 'venue_owner') return 'Manager';
    if (r === 'guest') return 'Guest';
    return 'Member';
}

function digitsOnly(s: string): string {
    return s.replace(/\D/g, '');
}

function getPhoneCountry(id: string): PhoneCountry {
    return PHONE_COUNTRIES.find((c) => c.id === id) ?? PHONE_COUNTRIES[0];
}

/**
 * Parse full mobile string into country + national digits using dial-code prefix match,
 * then saved country preference, then US-style 11-digit fallback.
 */
function parseStoredMobile(
    raw: string | undefined,
    savedCountryId?: string
): { countryId: string; national: string } {
    const d = digitsOnly(raw || '');
    if (!d) {
        return {
            countryId:
                savedCountryId && PHONE_COUNTRIES.some((x) => x.id === savedCountryId)
                    ? savedCountryId
                    : 'US',
            national: '',
        };
    }
    const sorted = [...PHONE_COUNTRIES].sort(
        (a, b) => digitsOnly(b.dial).length - digitsOnly(a.dial).length
    );
    for (const c of sorted) {
        const cc = digitsOnly(c.dial);
        if (d.startsWith(cc) && d.length > cc.length) {
            let national = d.slice(cc.length);
            national = national.slice(0, c.nationalLen);
            return { countryId: c.id, national };
        }
    }
    if (savedCountryId && PHONE_COUNTRIES.some((x) => x.id === savedCountryId)) {
        const c = getPhoneCountry(savedCountryId);
        return {
            countryId: c.id,
            national: d.replace(/^0+/, '').slice(0, c.nationalLen),
        };
    }
    if (d.length === 11 && d[0] === '1') {
        return { countryId: 'US', national: d.slice(1, 11) };
    }
    const us = getPhoneCountry('US');
    return { countryId: 'US', national: d.slice(0, us.nationalLen) };
}

function clampNationalInput(text: string, maxLen: number): string {
    return digitsOnly(text).slice(0, maxLen);
}

function parseLoyaltyLevel(raw: string): LoyaltyLevel {
    const l = raw.trim().toLowerCase();
    if (l === 'bronze' || l === 'silver' || l === 'gold' || l === 'platinum') return l;
    return 'gold';
}

/** Same idea as guest ProfileScreen: short USR-XXXXXX token for UUIDs */
function formatVenueMemberDisplayId(id: string): string {
    if (!id) return 'USR-000';
    const s = String(id).trim();
    if (/^USR-/i.test(s)) return s.toUpperCase();
    const compact = s.replace(/-/g, '');
    if (compact.length >= 6) return `USR-${compact.slice(-6).toUpperCase()}`;
    return `USR-${compact.toUpperCase()}`;
}

/** Compact E.164-style string for Supabase user_metadata (digits only with + prefix). */
function formatMobileForMetadata(country: PhoneCountry, nationalDigits: string): string {
    const cc = digitsOnly(country.dial);
    return `+${cc}${nationalDigits}`;
}

type MenuAnchorRect = { left: number; top: number; width: number };

export default function VenueUserProfileScreen({ navigation, route }: Props) {
    const { height: windowHeight, width: windowWidth } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const menuDropdownRefs = useRef<(View | null)[]>([null, null, null, null]);
    const initialTab = route.params?.initialTab ?? 'profile';
    const [tab, setTab] = useState<VenueProfileTab>(initialTab);
    const [avatarUri, setAvatarUri] = useState<string>('');
    const [menuSlots, setMenuSlots] = useState<string[]>([...DEFAULT_MENU_SLOTS]);
    const [menuPickerSlot, setMenuPickerSlot] = useState<number | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<MenuAnchorRect | null>(null);

    const closeMenuPicker = useCallback(() => {
        setMenuPickerSlot(null);
        setMenuAnchor(null);
    }, []);

    const openMenuPickerForSlot = useCallback(
        (index: number) => {
            const node = menuDropdownRefs.current[index];
            const fallbackW = Math.max(200, windowWidth - 32);
            if (!node) {
                setMenuAnchor({
                    left: 16,
                    top: windowHeight * 0.25,
                    width: fallbackW,
                });
                setMenuPickerSlot(index);
                return;
            }
            node.measureInWindow((x, y, w, h) => {
                const width = w > 8 ? w : fallbackW;
                const left = Math.max(12, Math.min(x, windowWidth - width - 12));
                const top = y + h;
                setMenuAnchor({ left, top, width });
                setMenuPickerSlot(index);
            });
        },
        [windowHeight, windowWidth]
    );
    const [userData, setUserData] = useState<UserForm>({
        id: 'USR-001',
        name: 'John Doe',
        email: 'john@nightflow.com',
        phone: '5550123456',
        phoneCountryId: 'US',
        role: 'Manager',
        loyaltyLevel: 'gold',
        totalCheckIns: 0,
        totalGuestsAdded: 0,
    });
    const [fa2, setFa2] = useState(false);
    const [countryPickerOpen, setCountryPickerOpen] = useState(false);

    useEffect(() => {
        setTab(route.params?.initialTab ?? 'profile');
    }, [route.params?.initialTab]);

    const hydrate = useCallback(async () => {
        const u = await authService.getStoredUser();
        const fn = u?.user_metadata?.first_name || '';
        const ln = u?.user_metadata?.last_name || '';
        const name = `${fn} ${ln}`.trim() || u?.email?.split('@')[0] || 'Guest User';
        const authEmail = (u?.email || '').trim();
        const metaPhone = (u?.user_metadata?.mobile as string | undefined)?.trim();

        let profileRole: string | null = null;
        if (u?.id) {
            const sum = await fetchProfileSummary(u.id);
            profileRole = sum.role;
        }

        const rawP = await AsyncStorage.getItem(VENUE_PROFILE_STORAGE_KEY);
        let extra: Partial<UserForm> = {};
        if (rawP) {
            try {
                extra = JSON.parse(rawP);
            } catch {
                /* ignore */
            }
        }

        const resolvedRole = roleDisplayLabel(profileRole, u?.app_role);
        const savedCountry =
            extra.phoneCountryId && PHONE_COUNTRIES.some((c) => c.id === extra.phoneCountryId)
                ? extra.phoneCountryId
                : undefined;
        const phoneRaw = extra.phone ?? metaPhone ?? '';
        const parsed = parseStoredMobile(
            typeof phoneRaw === 'string' ? phoneRaw : String(phoneRaw ?? ''),
            savedCountry
        );

        setUserData((prev) => ({
            ...prev,
            name: extra.name ?? name,
            email: authEmail || extra.email || '',
            phoneCountryId: parsed.countryId,
            phone: parsed.national || prev.phone,
            role: resolvedRole,
            id: u?.id || extra.id || prev.id,
        }));

        const pic = await AsyncStorage.getItem(AVATAR_KEY);
        if (pic) setAvatarUri(pic);

        const rawM = await AsyncStorage.getItem(VENUE_MENU_STORAGE_KEY);
        if (rawM) {
            try {
                setMenuSlots(normalizeMenuSlots(JSON.parse(rawM)));
            } catch {
                /* ignore */
            }
        }
    }, []);

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    const saveProfile = async () => {
        const country = getPhoneCountry(userData.phoneCountryId);
        const phoneDigits = digitsOnly(userData.phone);
        if (phoneDigits.length !== country.nationalLen) {
            Alert.alert(
                'Phone',
                `Enter exactly ${country.nationalLen} digits for ${country.name} (${country.dial}).`
            );
            return;
        }
        const mobileMeta = formatMobileForMetadata(country, phoneDigits);
        const toSave = { ...userData, phone: phoneDigits, phoneCountryId: country.id };
        try {
            await AsyncStorage.setItem(VENUE_PROFILE_STORAGE_KEY, JSON.stringify(toSave));
            if (avatarUri) await AsyncStorage.setItem(AVATAR_KEY, avatarUri);
            const parts = userData.name.trim().split(/\s+/);
            const firstName = parts[0] || '';
            const lastName = parts.slice(1).join(' ') || '';
            await authService.updateProfile({
                firstName,
                lastName,
                email: toSave.email,
                mobile: mobileMeta,
            });
            await hydrate();
            Alert.alert('Saved', 'Profile updated.');
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Could not save profile.');
        }
    };

    const pickPhoto = () => {
        launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (res) => {
            const a = res.assets?.[0];
            if (a?.uri) {
                setAvatarUri(a.uri);
                AsyncStorage.setItem(AVATAR_KEY, a.uri);
            }
        });
    };

    const saveMenu = async () => {
        await AsyncStorage.setItem(VENUE_MENU_STORAGE_KEY, JSON.stringify(menuSlots));
        Alert.alert('Saved', 'Menu preferences stored on this device.');
    };

    const tabs: { key: VenueProfileTab; label: string }[] = [
        { key: 'profile', label: 'Profile' },
        { key: 'card', label: 'My Card' },
        { key: 'menu', label: 'Menu' },
        { key: 'security', label: 'Security' },
    ];

    const selectedPhoneCountry = getPhoneCountry(userData.phoneCountryId);

    return (
        <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => venuePortalSafeGoBack(navigation)} hitSlop={12} style={styles.backWrap}>
                    <Icon name="chevron-back" size={26} color={VP.gold} />
                </TouchableOpacity>
                <View style={styles.topTitles}>
                    <Text style={styles.pageTitle} numberOfLines={1}>
                        Profile
                    </Text>
                    <Text style={styles.pageSub} numberOfLines={2}>
                        Manage your account settings
                    </Text>
                </View>
                <View style={styles.topBarSpacer} />
            </View>

            <View style={styles.tabBarOuter}>
                <View style={styles.tabBarInner}>
                    {tabs.map((t) => (
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
                <View style={styles.tabDots}>
                    {tabs.map((t) => (
                        <View
                            key={t.key}
                            style={[styles.tabDot, tab === t.key && styles.tabDotOn]}
                        />
                    ))}
                </View>
            </View>

            <ScrollView
                style={styles.body}
                contentContainerStyle={[
                    styles.bodyContent,
                    { paddingBottom: Math.max(32, insets.bottom + 24) },
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {tab === 'profile' && (
                    <>
                        <View style={styles.card}>
                            <View style={styles.avatarBlock}>
                                <View style={styles.bigAvatar}>
                                    {avatarUri ? (
                                        <Image
                                            source={{ uri: avatarUri }}
                                            style={styles.bigAvatarImg}
                                        />
                                    ) : (
                                        <Text style={styles.bigAvatarText}>{initials(userData.name)}</Text>
                                    )}
                                </View>
                                <TouchableOpacity style={styles.camBtn} onPress={pickPhoto}>
                                    <Icon name="camera" size={16} color={VP.text} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.profileName}>{userData.name}</Text>
                            <View style={styles.rolePill}>
                                <Text style={styles.rolePillText}>{userData.role}</Text>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.cardHead}>
                                <Icon
                                    name="person-outline"
                                    size={18}
                                    color={VP.gold}
                                    style={styles.cardHeadIcon}
                                />
                                <Text style={styles.cardTitle}>Personal Info</Text>
                            </View>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                value={userData.name}
                                onChangeText={(name) => setUserData((s) => ({ ...s, name }))}
                                placeholderTextColor={VP.muted}
                                placeholder="Name"
                            />
                            <View style={styles.labelRow}>
                                <Icon
                                    name="mail-outline"
                                    size={16}
                                    color={VP.gold}
                                    style={styles.labelRowIcon}
                                />
                                <Text style={styles.labelInline}>Email</Text>
                            </View>
                            <TextInput
                                style={styles.input}
                                value={userData.email}
                                onChangeText={(email) => setUserData((s) => ({ ...s, email }))}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholderTextColor={VP.muted}
                                placeholder="you@example.com"
                            />
                            <View style={styles.labelRow}>
                                <Icon
                                    name="call-outline"
                                    size={16}
                                    color={VP.gold}
                                    style={styles.labelRowIcon}
                                />
                                <Text style={styles.labelInline}>Phone</Text>
                            </View>
                            <View style={styles.phoneRow}>
                                <TouchableOpacity
                                    style={styles.countryCodeBtn}
                                    onPress={() => setCountryPickerOpen(true)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.countryCodeBtnText} numberOfLines={1}>
                                        {selectedPhoneCountry.dial}
                                    </Text>
                                    <Icon name="chevron-down" size={18} color={REF_GOLD} />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.phoneNationalInput}
                                    value={userData.phone}
                                    onChangeText={(text) =>
                                        setUserData((s) => ({
                                            ...s,
                                            phone: clampNationalInput(
                                                text,
                                                getPhoneCountry(s.phoneCountryId).nationalLen
                                            ),
                                        }))
                                    }
                                    keyboardType="number-pad"
                                    maxLength={selectedPhoneCountry.nationalLen}
                                    placeholderTextColor={VP.muted}
                                    placeholder={
                                        selectedPhoneCountry.id === 'US'
                                            ? '5551234567'
                                            : '0'.repeat(
                                                  Math.min(3, selectedPhoneCountry.nationalLen)
                                              ) + '…'
                                    }
                                />
                            </View>
                            <Text style={styles.phoneHint}>
                                {selectedPhoneCountry.name} · {selectedPhoneCountry.nationalLen}{' '}
                                digits (no country code)
                            </Text>
                            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile}>
                                <Icon name="save-outline" size={20} color="#111" style={styles.saveBtnIcon} />
                                <Text style={styles.saveBtnText}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                {tab === 'card' && (
                    <>
                        <MemberCard
                            name={userData.name}
                            userId={formatVenueMemberDisplayId(userData.id)}
                            status={parseLoyaltyLevel(userData.loyaltyLevel)}
                            avatarUrl={avatarUri || undefined}
                        />
                        <Text style={styles.cardFlipHint}>Tap the card to show your member QR code</Text>
                        <View style={styles.rowStats}>
                            <View style={styles.statBox}>
                                <Text style={styles.statNum}>{userData.totalCheckIns}</Text>
                                <Text style={styles.statCap}>Total Check-ins</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={[styles.statNum, { color: VP.teal }]}>
                                    {userData.totalGuestsAdded}
                                </Text>
                                <Text style={styles.statCap}>Guests Added</Text>
                            </View>
                        </View>
                    </>
                )}

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
                                        <Text style={styles.menuPositionLabel}>Position {i + 1}</Text>
                                    </View>
                                    <View
                                        ref={(r) => {
                                            menuDropdownRefs.current[i] = r;
                                        }}
                                        collapsable={false}
                                    >
                                        <TouchableOpacity
                                            style={styles.menuDropdownRow}
                                            onPress={() => openMenuPickerForSlot(i)}
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
                        <TouchableOpacity style={styles.saveBtn} onPress={saveMenu}>
                            <Icon name="save-outline" size={20} color="#111" style={styles.saveBtnIcon} />
                            <Text style={styles.saveBtnText}>Save Menu</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {tab === 'security' && (
                    <>
                        <View style={styles.card}>
                            <View style={styles.cardHead}>
                                <Icon name="lock-closed-outline" size={18} color={VP.gold} />
                                <Text style={styles.cardTitle}>Change Password</Text>
                            </View>
                            <Text style={styles.label}>Current Password</Text>
                            <TextInput style={styles.input} secureTextEntry placeholderTextColor={VP.muted} />
                            <Text style={styles.label}>New Password</Text>
                            <TextInput style={styles.input} secureTextEntry placeholderTextColor={VP.muted} />
                            <Text style={styles.label}>Confirm New Password</Text>
                            <TextInput style={styles.input} secureTextEntry placeholderTextColor={VP.muted} />
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={() => Alert.alert('Password', 'Use Supabase reset flow from login for now.')}
                            >
                                <Text style={styles.saveBtnText}>Update Password</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.card}>
                            <View style={styles.rowBetween}>
                                <View>
                                    <Text style={styles.cardTitle}>Two-Factor Authentication</Text>
                                    <Text style={styles.hint}>Add extra security</Text>
                                </View>
                                <Switch value={fa2} onValueChange={setFa2} />
                            </View>
                        </View>
                        <View style={styles.card}>
                            <View style={styles.cardHead}>
                                <Icon
                                    name="shield-checkmark-outline"
                                    size={18}
                                    color={VP.gold}
                                    style={styles.cardHeadIcon}
                                />
                                <Text style={styles.cardTitle}>Your access</Text>
                            </View>
                            <Text style={styles.hint}>View-only — contact admin to change.</Text>
                            <View style={styles.permGrid}>
                                {['Dashboard', 'Guest lists', 'Check-in', 'Bookings'].map((p) => (
                                    <View key={p} style={styles.permOn}>
                                        <Text style={styles.permOnText}>✓ {p}</Text>
                                    </View>
                                ))}
                                {['Analytics', 'Venue settings'].map((p) => (
                                    <View key={p} style={styles.permOff}>
                                        <Text style={styles.permOffText}>✗ {p}</Text>
                                    </View>
                                ))}
                            </View>
                            <Text style={styles.roleLine}>
                                Role: <Text style={{ color: VP.text }}>{userData.role}</Text>
                            </Text>
                        </View>
                    </>
                )}

                <View style={{ height: 16 }} />
            </ScrollView>

            <Modal
                visible={countryPickerOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setCountryPickerOpen(false)}
            >
                <View style={styles.modalRoot}>
                    <Pressable
                        style={styles.modalBackdrop}
                        onPress={() => setCountryPickerOpen(false)}
                    />
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Country code</Text>
                        <ScrollView
                            style={styles.modalList}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {PHONE_COUNTRIES.map((c) => {
                                const on = userData.phoneCountryId === c.id;
                                return (
                                    <TouchableOpacity
                                        key={c.id}
                                        style={[styles.modalRow, on && styles.modalRowOn]}
                                        onPress={() => {
                                            setUserData((s) => ({
                                                ...s,
                                                phoneCountryId: c.id,
                                                phone: digitsOnly(s.phone).slice(0, c.nationalLen),
                                            }));
                                            setCountryPickerOpen(false);
                                        }}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.modalRowName} numberOfLines={1}>
                                            {c.name}
                                        </Text>
                                        <Text style={styles.modalRowDial}>{c.dial}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={menuPickerSlot !== null && menuAnchor !== null}
                transparent
                animationType="fade"
                onRequestClose={closeMenuPicker}
            >
                <View style={styles.menuPickerModalFill}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeMenuPicker} />
                    {menuAnchor ? (
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
                                    const slotIdx = menuPickerSlot ?? 0;
                                    const selected = menuSlots[slotIdx] === opt.id;
                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.menuPickerRow,
                                                selected && styles.menuPickerRowOn,
                                            ]}
                                            onPress={() => {
                                                setMenuSlots((prev) => {
                                                    const next = [...prev];
                                                    next[slotIdx] = opt.id;
                                                    return next;
                                                });
                                                closeMenuPicker();
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
                                            <Icon name={opt.icon} size={20} color={VP.text} />
                                            <Text style={styles.menuPickerLabel}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        </View>
                    ) : null}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: REF_BG },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    backWrap: { width: 40, justifyContent: 'center' },
    topBarSpacer: { width: 40 },
    topTitles: { flex: 1, minWidth: 0, paddingRight: 4 },
    pageTitle: { color: VP.text, fontSize: 22, fontWeight: '800' },
    pageSub: { color: VP.muted, fontSize: 13, marginTop: 4, lineHeight: 18 },
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
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    tabChipText: { color: VP.muted, fontSize: 12, fontWeight: '700' },
    tabChipTextOn: { color: VP.text },
    tabDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    tabDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginHorizontal: 3,
    },
    tabDotOn: {
        backgroundColor: 'rgba(255,255,255,0.45)',
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    body: { flex: 1 },
    bodyContent: { paddingHorizontal: 16, paddingTop: 12 },
    card: {
        backgroundColor: VP.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardHeadIcon: { marginRight: 8 },
    cardTitle: { color: VP.text, fontSize: 16, fontWeight: '800' },
    avatarBlock: { alignSelf: 'center', marginBottom: 12 },
    bigAvatar: {
        width: 104,
        height: 104,
        borderRadius: 52,
        backgroundColor: AVATAR_OLIVE,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: REF_GOLD,
        overflow: 'hidden',
    },
    bigAvatarImg: { width: 104, height: 104, borderRadius: 52 },
    bigAvatarText: { color: REF_GOLD, fontSize: 34, fontWeight: '800' },
    camBtn: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: VP.surface,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileName: {
        color: VP.text,
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
    },
    rolePill: {
        alignSelf: 'center',
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: 'rgba(251, 191, 36, 0.12)',
    },
    rolePillText: { color: VP.gold, fontSize: 12, fontWeight: '800' },
    label: { color: VP.muted, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'nowrap',
        marginTop: 12,
        marginBottom: 6,
    },
    labelRowIcon: { marginRight: 8 },
    labelInline: { color: VP.muted, fontSize: 12, fontWeight: '600' },
    phoneRow: { flexDirection: 'row', alignItems: 'center' },
    countryCodeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
        backgroundColor: VP.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 10,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        maxWidth: 108,
    },
    countryCodeBtnText: {
        color: VP.text,
        fontSize: 15,
        fontWeight: '800',
        marginRight: 4,
        flexShrink: 1,
    },
    phoneNationalInput: {
        flex: 1,
        minWidth: 0,
        backgroundColor: VP.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        color: VP.text,
        fontSize: 15,
    },
    phoneHint: { color: VP.muted, fontSize: 11, marginTop: 6 },
    modalRoot: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    modalCard: {
        width: '100%',
        maxWidth: 400,
        maxHeight: 400,
        borderRadius: 16,
        backgroundColor: VP.card,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        zIndex: 1,
    },
    modalTitle: {
        color: VP.text,
        fontSize: 17,
        fontWeight: '800',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    modalList: { maxHeight: 320 },
    modalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    modalRowOn: { backgroundColor: 'rgba(255,204,0,0.08)' },
    modalRowName: {
        color: VP.text,
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
        marginRight: 12,
    },
    modalRowDial: { color: REF_GOLD, fontSize: 15, fontWeight: '800' },
    input: {
        backgroundColor: VP.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        color: VP.text,
        fontSize: 15,
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
    saveBtnIcon: { marginRight: 8 },
    saveBtnText: { color: '#111', fontSize: 16, fontWeight: '800' },
    cardFlipHint: {
        color: VP.muted,
        fontSize: 12,
        textAlign: 'center',
        marginTop: -12,
        marginBottom: 18,
        paddingHorizontal: 8,
    },
    rowStats: { flexDirection: 'row', gap: 12 },
    statBox: {
        flex: 1,
        backgroundColor: VP.card,
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    statNum: { color: VP.gold, fontSize: 22, fontWeight: '800' },
    statCap: { color: VP.muted, fontSize: 11, marginTop: 6, textAlign: 'center' },
    hint: { color: VP.muted, fontSize: 12, marginBottom: 12 },
    menuCard: {
        backgroundColor: VP.card,
        borderRadius: 16,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    menuCardTitle: { color: VP.text, fontSize: 18, fontWeight: '800' },
    menuCardSub: { color: VP.muted, fontSize: 13, marginTop: 6, marginBottom: 18, lineHeight: 18 },
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
    menuPickerModalFill: { flex: 1 },
    menuPickerPopover: {
        position: 'absolute',
        backgroundColor: REF_BG,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
        zIndex: 2,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
    },
    menuPickerListContent: { paddingBottom: 6 },
    menuPickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    menuPickerRowOn: { backgroundColor: 'rgba(255,255,255,0.04)' },
    menuPickerCheckWrap: { width: 24, alignItems: 'center', marginRight: 2 },
    menuPickerLabel: {
        color: VP.text,
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 10,
        flex: 1,
    },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    permGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    permOn: {
        width: '48%',
        padding: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(45, 212, 191, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(45, 212, 191, 0.25)',
    },
    permOnText: { color: VP.teal, fontSize: 11, fontWeight: '700' },
    permOff: {
        width: '48%',
        padding: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    permOffText: { color: VP.muted, fontSize: 11, fontWeight: '700' },
    roleLine: { color: VP.muted, fontSize: 12, marginTop: 14 },
});
