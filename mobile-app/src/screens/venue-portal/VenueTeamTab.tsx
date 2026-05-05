import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { VP, VP_PARTITION_LINE } from './venuePortalTheme';
import { useVenuePortal } from '../../context/VenuePortalContext';
import {
    fetchTeamMembers,
    subscribeTeamMembers,
    ROLES,
    type TeamMemberRow,
} from '../../services/venueTeam';
import { VenueAddTeamMemberModal } from './VenueAddTeamMemberModal';

const H_PAD = 16;

/**
 * Team tab — shows live staff count from Supabase. "Active Now" and
 * "Check-ins Today" remain 0 until a presence / check-in source is wired,
 * matching the user's intent to only display real data.
 */
const STAT_TILE_CONFIG: { key: 'total' | 'active' | 'checkins'; label: string; color: string }[] = [
    { key: 'total', label: 'Total Staff', color: VP.text },
    { key: 'active', label: 'Active Now', color: VP.teal },
    { key: 'checkins', label: 'Check-ins Today', color: VP.coral },
];

function roleLabel(value: string): string {
    return ROLES.find((r) => r.value === value)?.label ?? value;
}

function initialsFor(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function VenueTeamTab({ onBack }: { onBack?: () => void }) {
    const { venueId } = useVenuePortal();
    const [members, setMembers] = useState<TeamMemberRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [query, setQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [addOpen, setAddOpen] = useState(false);

    const load = useCallback(async () => {
        if (!venueId) {
            setMembers([]);
            setLoading(false);
            return;
        }
        const rows = await fetchTeamMembers(venueId);
        setMembers(rows);
        setLoading(false);
    }, [venueId]);

    useEffect(() => {
        setLoading(true);
        load();
    }, [load]);

    useEffect(() => {
        if (!venueId) return;
        return subscribeTeamMembers(venueId, () => {
            load();
        });
    }, [venueId, load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    const stats = useMemo(
        () => ({
            total: members.length,
            active: 0,
            checkins: 0,
        }),
        [members.length],
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return members;
        return members.filter(
            (m) =>
                m.name.toLowerCase().includes(q) ||
                m.email.toLowerCase().includes(q) ||
                m.role.toLowerCase().includes(q),
        );
    }, [members, query]);

    return (
        <View style={styles.wrap}>
            <View style={styles.headerRow}>
                {onBack ? (
                    <TouchableOpacity
                        onPress={onBack}
                        hitSlop={12}
                        style={styles.backBtn}
                        accessibilityLabel="Back"
                    >
                        <Icon name="chevron-back" size={26} color={VP.gold} />
                    </TouchableOpacity>
                ) : null}
                <Text style={styles.headerTitle}>Team</Text>
            </View>
            <View style={VP_PARTITION_LINE} />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={VP.gold}
                        colors={[VP.gold]}
                    />
                }
            >
                <View style={styles.statsRow}>
                    {STAT_TILE_CONFIG.map((s) => (
                        <View key={s.key} style={styles.statTile}>
                            <Text style={[styles.statValue, { color: s.color }]}>
                                {stats[s.key]}
                            </Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.statsLinkCard}
                    activeOpacity={0.85}
                    onPress={() => Alert.alert('Team Statistics', 'Coming soon.')}
                >
                    <Text style={styles.statsLinkText}>View Team Statistics</Text>
                    <Icon name="arrow-forward" size={20} color={VP.gold} />
                </TouchableOpacity>

                <View style={styles.searchRow}>
                    <View
                        style={[
                            styles.searchField,
                            searchFocused && styles.searchFieldFocused,
                        ]}
                    >
                        <Icon name="search" size={18} color={VP.muted} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search staff..."
                            placeholderTextColor={VP.muted}
                            value={query}
                            onChangeText={setQuery}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            returnKeyType="search"
                        />
                    </View>
                    <TouchableOpacity
                        style={styles.addBtn}
                        activeOpacity={0.85}
                        onPress={() => {
                            if (!venueId) {
                                Alert.alert(
                                    'Venue required',
                                    'We couldn’t find a venue linked to your account yet.',
                                );
                                return;
                            }
                            setAddOpen(true);
                        }}
                        accessibilityLabel="Add staff"
                    >
                        <Icon name="add" size={26} color="#000000" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator color={VP.gold} />
                        <Text style={styles.loadingText}>Loading team…</Text>
                    </View>
                ) : filtered.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Icon
                            name="people-outline"
                            size={30}
                            color="rgba(255,255,255,0.28)"
                        />
                        <Text style={styles.emptyTitle}>
                            {members.length === 0 ? 'No staff yet' : 'No matches'}
                        </Text>
                        <Text style={styles.emptySub}>
                            {members.length === 0
                                ? 'Tap the + button to invite your first team member. They’ll appear here in real time once added.'
                                : 'Try a different name, email, or role.'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.list}>
                        {filtered.map((m, idx) => (
                            <View
                                key={m.id}
                                style={[
                                    styles.memberRow,
                                    idx < filtered.length - 1 && styles.memberRowBorder,
                                ]}
                            >
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>
                                        {initialsFor(m.name)}
                                    </Text>
                                </View>
                                <View style={styles.memberMain}>
                                    <View style={styles.memberTopRow}>
                                        <Text style={styles.memberName} numberOfLines={1}>
                                            {m.name}
                                        </Text>
                                        <View style={styles.roleChip}>
                                            <Text style={styles.roleChipText}>
                                                {roleLabel(m.role)}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.memberEmail} numberOfLines={1}>
                                        {m.email}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            <VenueAddTeamMemberModal
                visible={addOpen}
                venueId={venueId}
                onClose={() => setAddOpen(false)}
                onSaved={() => {
                    load();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flex: 1, backgroundColor: VP.bg },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: H_PAD,
        paddingTop: 10,
        paddingBottom: 14,
    },
    backBtn: {
        paddingRight: 2,
        paddingVertical: 2,
        marginLeft: -4,
    },
    headerTitle: {
        color: VP.text,
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    scroll: { flex: 1 },
    scrollContent: {
        paddingHorizontal: H_PAD,
        paddingTop: 14,
        paddingBottom: 32,
    },

    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    statTile: {
        flex: 1,
        backgroundColor: '#1A1A1F',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        paddingVertical: 16,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    statValue: {
        fontSize: 26,
        fontWeight: '800',
    },
    statLabel: {
        color: VP.muted,
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },

    statsLinkCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 18,
        borderRadius: 14,
        backgroundColor: 'rgba(251, 191, 36, 0.10)',
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.28)',
        marginBottom: 16,
    },
    statsLinkText: {
        color: VP.text,
        fontSize: 15,
        fontWeight: '700',
    },

    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 18,
    },
    searchField: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#141418',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 14,
        height: 48,
    },
    searchFieldFocused: {
        borderColor: VP.goldDim,
    },
    searchInput: {
        flex: 1,
        color: VP.text,
        fontSize: 15,
        padding: 0,
    },
    addBtn: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FFCC33',
        alignItems: 'center',
        justifyContent: 'center',
    },

    loadingBox: {
        paddingVertical: 28,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    loadingText: { color: VP.muted, fontSize: 13 },

    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 28,
        paddingHorizontal: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        gap: 10,
    },
    emptyTitle: {
        color: VP.text,
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    emptySub: {
        color: VP.muted,
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 19,
    },

    list: {
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 12,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
    },
    memberRowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { color: VP.text, fontSize: 13, fontWeight: '800' },
    memberMain: { flex: 1, gap: 3 },
    memberTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    memberName: {
        flex: 1,
        color: VP.text,
        fontSize: 14,
        fontWeight: '700',
    },
    roleChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        backgroundColor: 'rgba(251,191,36,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.3)',
    },
    roleChipText: {
        color: VP.gold,
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'capitalize',
    },
    memberEmail: { color: VP.muted, fontSize: 12 },
});
