/**
 * MemberCard — React Native port of the Lovable MemberIdCard component.
 * Colours are converted 1-to-1 from the original HSL values.
 * Tap the card to flip and reveal the QR code on the back.
 */
import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableWithoutFeedback,
    Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

export type LoyaltyLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

interface MemberCardProps {
    name: string;
    userId: string;
    status: LoyaltyLevel;
    avatarUrl?: string;
}

// ── Exact colours from Lovable HSL definitions ────────────────────────────────
// hsl(45,50%,25%) → #60501F   hsl(50,45%,35%) → #857236   hsl(45,55%,20%) → #4E3D14
const TIER: Record<LoyaltyLevel, {
    gradients: string[];
    ring: string;
    accent: string;
    orb: boolean;
}> = {
    gold: {
        gradients: ['#60501F', '#857236', '#4E3D14'],
        ring:      '#eab308',
        accent:    '#eab308',
        orb:       false,
    },
    bronze: {
        gradients: ['#4A2A18', '#6B3D22', '#3D2010'],
        ring:      '#d97706',
        accent:    '#f97316',
        orb:       false,
    },
    silver: {
        gradients: ['#3A3D42', '#4D5258', '#303438'],
        ring:      '#9ca3af',   // zinc-400
        accent:    '#d4d4d8',
        orb:       false,
    },
    platinum: {
        gradients: ['#2E1F4A', '#3D2B6A', '#241838'],
        ring:      '#a855f7',   // purple-500
        accent:    '#c084fc',
        orb:       false,
    },
};

const MemberCard: React.FC<MemberCardProps> = ({ name, userId, status, avatarUrl }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const anim = useRef(new Animated.Value(0)).current;

    const flip = () => {
        Animated.spring(anim, {
            toValue: isFlipped ? 0 : 1,
            friction: 8,
            tension: 10,
            useNativeDriver: true,
        }).start();
        setIsFlipped(f => !f);
    };

    const frontRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
    const backRotate  = anim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
    const frontOpacity = anim.interpolate({ inputRange: [0, 0.5, 0.5, 1], outputRange: [1, 1, 0, 0] });
    const backOpacity  = anim.interpolate({ inputRange: [0, 0.5, 0.5, 1], outputRange: [0, 0, 1, 1] });

    const tier     = TIER[status] ?? TIER.gold;
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const qrUrl    = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=NITEWAYS-MEMBER:${encodeURIComponent(userId)}`;
    const label    = status.charAt(0).toUpperCase() + status.slice(1);

    const CardFace = ({ children }: { children: React.ReactNode }) => (
        <>
            {/* Base gradient */}
            <LinearGradient
                colors={tier.gradients}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />
            {/* Diagonal sheen — matches Lovable bg-white/5 */}
            <LinearGradient
                colors={['rgba(255,255,255,0.06)', 'transparent', 'rgba(0,0,0,0.18)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />
            {/* Decorative glow orbs (gold & bronze only) — mirrors Lovable blur circles */}
            {tier.orb && (
                <>
                    <View style={styles.orbTopRight} />
                    <View style={styles.orbBottomLeft} />
                </>
            )}
            {children}
        </>
    );

    return (
        <TouchableWithoutFeedback onPress={flip}>
            <View style={styles.wrapper}>

                {/* ── FRONT ─────────────────────────────────────────────── */}
                <Animated.View style={[
                    styles.card, styles.front,
                    { transform: [{ rotateY: frontRotate }], opacity: frontOpacity },
                ]}>
                    <CardFace>
                        {/* Top row */}
                        <View style={styles.topRow}>
                            {/* Avatar */}
                            <View style={[styles.avatar, { borderColor: tier.ring }]}>
                                <LinearGradient
                                    colors={['#52525b', '#3f3f46']}
                                    style={[StyleSheet.absoluteFillObject, { borderRadius: 40 }]}
                                />
                                {avatarUrl ? (
                                    <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                                ) : (
                                    <Text style={styles.initials}>{initials}</Text>
                                )}
                            </View>

                            {/* Member status */}
                            <View style={styles.statusBlock}>
                                <Text style={styles.statusLabel}>Member Status</Text>
                                <Text style={[styles.statusValue, { color: tier.accent }]}>{label}</Text>
                            </View>
                        </View>

                        {/* Bottom row */}
                        <View style={styles.bottomRow}>
                            <Text style={styles.name}>{name}</Text>
                            <View style={styles.footerRow}>
                                <Text style={styles.userId}>{userId}</Text>
                                <Text style={styles.logo}>NITEWAYS</Text>
                            </View>
                        </View>
                    </CardFace>
                </Animated.View>

                {/* ── BACK (QR) ─────────────────────────────────────────── */}
                <Animated.View style={[
                    styles.card, styles.back,
                    { transform: [{ rotateY: backRotate }], opacity: backOpacity },
                ]}>
                    <CardFace>
                        <View style={styles.qrContainer}>
                            <View style={styles.qrBox}>
                                <Image source={{ uri: qrUrl }} style={styles.qrImg} resizeMode="contain" />
                            </View>
                            <Text style={styles.backUserId}>{userId}</Text>
                            <Text style={styles.backLogo}>NITEWAYS</Text>
                        </View>
                    </CardFace>
                </Animated.View>

            </View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        height: 240,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 14,
    },
    card: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 240,
        borderRadius: 22,
        overflow: 'hidden',
        backfaceVisibility: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        padding: 24,
    },
    front: { justifyContent: 'space-between', zIndex: 2 },
    back:  { justifyContent: 'center', alignItems: 'center', zIndex: 1 },

    // Decorative orbs (bg-white/5 blur circles from Lovable)
    orbTopRight: {
        position: 'absolute',
        top: 28, right: 28,
        width: 120, height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    orbBottomLeft: {
        position: 'absolute',
        bottom: -10, left: 60,
        width: 90, height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },

    // Top row
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 3,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImg: { width: '100%', height: '100%' },
    initials: {
        color: '#a1a1aa',
        fontSize: 30,
        fontWeight: '600',
        zIndex: 2,
    },
    statusBlock: { alignItems: 'flex-end' },
    statusLabel: {
        color: '#a1a1aa',
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 3,
    },
    statusValue: {
        fontSize: 26,
        fontWeight: '700',
        letterSpacing: 0.3,
    },

    // Bottom rows
    bottomRow: { gap: 5 },
    name: {
        color: '#ffffff',
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 2,
    },
    userId: {
        color: '#a1a1aa',
        fontSize: 13,
        fontFamily: 'monospace',
        letterSpacing: 0.5,
    },
    logo: {
        color: '#71717a',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },

    // Back / QR
    qrContainer: { alignItems: 'center', zIndex: 2 },
    qrBox: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 10,
        marginBottom: 12,
    },
    qrImg:      { width: 120, height: 120 },
    backUserId: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 2, marginBottom: 3 },
    backLogo:   { color: '#a1a1aa', fontSize: 10, fontWeight: '600', letterSpacing: 2.5, textTransform: 'uppercase' },
});

export default MemberCard;
