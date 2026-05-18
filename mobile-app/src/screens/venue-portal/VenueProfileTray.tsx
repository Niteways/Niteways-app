import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Pressable,
    Platform,
    Dimensions,
    Image,
} from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../services/auth';
import { fetchProfileSummary } from '../../services/venuePortal';
import { VP } from './venuePortalTheme';
import type { VenuePortalStackParamList } from './venuePortalTypes';

const AVATAR_KEY = '@venue_owner_avatar_v1';

export const VENUE_PROFILE_STORAGE_KEY = '@venue_owner_profile_v1';

type Nav = StackNavigationProp<VenuePortalStackParamList, 'VenueMain'>;

function initialsFromUser(user: any): string {
    const fn = user?.user_metadata?.first_name || user?.first_name || '';
    const ln = user?.user_metadata?.last_name || user?.last_name || '';
    const parts = `${fn} ${ln}`.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    const email = user?.email || '';
    return email.slice(0, 2).toUpperCase() || 'GU';
}

function displayName(user: any): string {
    const fn = user?.user_metadata?.first_name || '';
    const ln = user?.user_metadata?.last_name || '';
    const n = `${fn} ${ln}`.trim();
    if (n) return n;
    return user?.email?.split('@')[0] || 'Guest User';
}

const MENU_GAP = 8;

type MenuAnchor = { top: number; right: number };

/** Bell + avatar + account dropdown (e.g. More hub header). */
export function VenueProfileTray({
    navigation,
    onOpenVenueSettings,
    onSignOut,
    notificationUnreadCount = 0,
    /** Ticketing screen: red badge always (incl. 0), gold avatar + black initials. */
    variant = 'default',
}: {
    navigation: Nav;
    onOpenVenueSettings: () => void;
    onSignOut: () => Promise<void>;
    notificationUnreadCount?: number;
    variant?: 'default' | 'ticketing';
}) {
    const avatarRef = useRef<View>(null);
    const [user, setUser] = useState<any>(null);
    const [roleLabel, setRoleLabel] = useState('Venue owner');
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
    const [avatarUri, setAvatarUri] = useState<string>('');

    const refreshUser = useCallback(async () => {
        const u = await authService.getStoredUser();
        setUser(u);
        const raw = await AsyncStorage.getItem(VENUE_PROFILE_STORAGE_KEY);
        if (raw) {
            try {
                const p = JSON.parse(raw);
                if (typeof p.role === 'string' && p.role) setRoleLabel(p.role);
            } catch {
                /* ignore */
            }
        }

        // Local cached URI shows instantly while Supabase round-trip runs
        const cached = await AsyncStorage.getItem(AVATAR_KEY);
        if (cached) setAvatarUri(cached);

        if (u?.id) {
            try {
                const sum = await fetchProfileSummary(u.id);
                const dbUrl = (sum.avatar_url || '').trim();
                if (dbUrl) {
                    setAvatarUri(dbUrl);
                    await AsyncStorage.setItem(AVATAR_KEY, dbUrl);
                } else if (cached && /^https?:\/\//i.test(cached)) {
                    // DB cleared but cache had a URL — drop stale cache
                    setAvatarUri('');
                    await AsyncStorage.removeItem(AVATAR_KEY);
                }
                // Same label rules as web (`formatRoleLabel`) so portal & app match.
                const dbRole = (sum.role || '').trim();
                if (dbRole === 'venue_owner' || dbRole === 'owner') setRoleLabel('Venue owner');
                else if (dbRole === 'guest') setRoleLabel('Guest');
                else if (dbRole) setRoleLabel(dbRole.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
            } catch {
                /* network/RLS issues: keep cached value */
            }
        }
    }, []);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    const closeMenu = () => {
        setMenuOpen(false);
        setMenuAnchor(null);
    };

    const openMenuUnderAvatar = useCallback(() => {
        requestAnimationFrame(() => {
            avatarRef.current?.measureInWindow((x, y, w, h) => {
                const sw = Dimensions.get('window').width;
                setMenuAnchor({
                    top: y + h + MENU_GAP,
                    right: Math.max(8, sw - x - w),
                });
                setMenuOpen(true);
            });
        });
    }, []);

    const goProfile = (t: 'profile' | 'card' | 'menu' | 'security') => {
        closeMenu();
        navigation.navigate('VenueUserProfile', { initialTab: t });
    };

    const handleSignOut = async () => {
        closeMenu();
        await onSignOut();
    };

    const ini = user ? initialsFromUser(user) : 'GU';
    const name = user ? displayName(user) : 'Guest User';
    const isTicketing = variant === 'ticketing';
    const showBadge = isTicketing || notificationUnreadCount > 0;

    return (
        <>
            <View style={styles.right}>
                <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => {
                        navigation.push('VenueNotifications');
                    }}
                    hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                    accessibilityLabel="Notifications"
                    activeOpacity={0.75}
                >
                    <Icon name="notifications-outline" size={22} color={VP.text} />
                    {showBadge ? (
                        <View style={[styles.badge, isTicketing && styles.badgeTicketing]}>
                            <Text style={[styles.badgeText, isTicketing && styles.badgeTextTicketing]}>
                                {notificationUnreadCount > 99 ? '99+' : String(notificationUnreadCount)}
                            </Text>
                        </View>
                    ) : null}
                </TouchableOpacity>
                <View ref={avatarRef} collapsable={false} style={styles.avatarOuter}>
                    <TouchableOpacity
                        onPress={() => {
                            refreshUser();
                            openMenuUnderAvatar();
                        }}
                        hitSlop={8}
                        accessibilityLabel="Account menu"
                        activeOpacity={0.85}
                    >
                        <View style={[styles.avatar, isTicketing && styles.avatarTicketing]}>
                            {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                            ) : (
                                <Text style={[styles.avatarText, isTicketing && styles.avatarTextTicketing]}>{ini}</Text>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <Modal
                visible={menuOpen && menuAnchor != null}
                transparent
                animationType="fade"
                onRequestClose={closeMenu}
            >
                <View style={styles.modalRoot}>
                    <Pressable style={styles.modalBackdrop} onPress={closeMenu} />
                    <View
                        style={[
                            styles.menuWrap,
                            menuAnchor && {
                                top: menuAnchor.top,
                                right: menuAnchor.right,
                            },
                        ]}
                        pointerEvents="box-none"
                    >
                        <View style={styles.menuPanel}>
                            <View style={styles.menuHeader}>
                                <Text style={styles.menuName} numberOfLines={1}>
                                    {name}
                                </Text>
                                <Text style={styles.menuRole}>{roleLabel}</Text>
                            </View>
                            <View style={styles.menuDivider} />
                            <TouchableOpacity
                                style={styles.menuRow}
                                onPress={() => goProfile('profile')}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.menuRowText}>Profile</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.menuRow}
                                onPress={() => goProfile('menu')}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.menuRowText}>Profile Settings</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.menuRow}
                                onPress={() => {
                                    closeMenu();
                                    onOpenVenueSettings();
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.menuRowText}>Settings</Text>
                            </TouchableOpacity>
                            <View style={styles.menuDivider} />
                            <TouchableOpacity
                                style={styles.menuRow}
                                onPress={handleSignOut}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.menuSignOut}>Sign out</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    right: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconBtn: {
        position: 'relative',
        padding: 4,
        zIndex: 50,
        elevation: 50,
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -4,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#F472B6',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeTicketing: {
        backgroundColor: '#DC2626',
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        top: -4,
        right: -6,
    },
    badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
    badgeTextTicketing: { fontSize: 10, fontWeight: '800' },
    avatarOuter: { marginLeft: 2 },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#4A3F2E',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.35)',
    },
    avatarText: {
        color: VP.gold,
        fontSize: 14,
        fontWeight: '800',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    avatarTicketing: {
        backgroundColor: '#FFD700',
        borderColor: 'rgba(0,0,0,0.15)',
    },
    avatarTextTicketing: {
        color: '#000000',
    },
    modalRoot: { flex: 1 },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    menuWrap: {
        position: 'absolute',
        alignItems: 'flex-end',
    },
    menuPanel: {
        width: 220,
        minWidth: 200,
        backgroundColor: '#1A1A1E',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.35,
                shadowRadius: 16,
            },
            android: { elevation: 12 },
        }),
    },
    menuHeader: {
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 10,
    },
    menuName: {
        color: VP.text,
        fontSize: 16,
        fontWeight: '800',
    },
    menuRole: {
        color: VP.muted,
        fontSize: 13,
        fontWeight: '600',
        marginTop: 4,
    },
    menuDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    menuRow: {
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    menuRowText: {
        color: VP.text,
        fontSize: 15,
        fontWeight: '600',
    },
    menuSignOut: {
        color: '#F87171',
        fontSize: 15,
        fontWeight: '700',
    },
});
