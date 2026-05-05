import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    StyleSheet,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const MODAL_MAX_HEIGHT = Math.round(Dimensions.get('window').height * 0.85);

type Severity = 'warning' | 'banned';

interface FlaggedGuest {
    id: string;
    name: string;
    reason: string;
    flaggedBy: string;
    flaggedDate: string;
    severity: Severity;
}

const BG = '#000000';
const CARD = '#1a1a1a';
const CARD_BORDER = '#2e2e2e';
/** Primary gold — matches reference Add button / highlights */
const GOLD = '#FFD700';
const TEXT = '#ffffff';
const MUTED = '#a8a8a8';
const META = '#8e8e93';

export function VenueSecurityScreen({ onBack }: { onBack: () => void }) {
    const [guests, setGuests] = useState<FlaggedGuest[]>([]);
    const [search, setSearch] = useState('');
    const [listTab, setListTab] = useState<'flagged' | 'banned'>('flagged');
    const [modalOpen, setModalOpen] = useState(false);
    const [severity, setSeverity] = useState<Severity>('warning');
    const [name, setName] = useState('');
    const [reason, setReason] = useState('');

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return guests.filter((g) => !q || g.name.toLowerCase().includes(q));
    }, [guests, search]);

    const list = filtered.filter((g) =>
        listTab === 'flagged' ? g.severity === 'warning' : g.severity === 'banned'
    );

    const flaggedCount = useMemo(
        () => guests.filter((g) => g.severity === 'warning').length,
        [guests]
    );
    const bannedCount = useMemo(
        () => guests.filter((g) => g.severity === 'banned').length,
        [guests]
    );

    const openAdd = () => {
        setName('');
        setReason('');
        setSeverity('warning');
        setModalOpen(true);
    };

    const submitAdd = () => {
        const n = name.trim();
        if (!n) return;
        const row: FlaggedGuest = {
            id: String(Date.now()),
            name: n,
            reason: reason.trim() || 'No description',
            flaggedBy: 'You',
            flaggedDate: new Date().toLocaleDateString(),
            severity,
        };
        setGuests((prev) => [...prev, row]);
        setModalOpen(false);
    };

    const remove = (id: string) => {
        setGuests((prev) => prev.filter((g) => g.id !== id));
    };

    return (
        <View style={styles.root}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backBtn} accessibilityLabel="Back">
                    <Icon name="chevron-back" size={28} color={GOLD} />
                </TouchableOpacity>
                <Text style={styles.screenTitle}>Security</Text>
            </View>
            <View style={styles.headerRule} />

            <View style={styles.statsRow}>
                <Pressable
                    onPress={() => setListTab('flagged')}
                    style={[styles.statCard, listTab === 'flagged' && styles.statCardActive]}
                >
                    <View style={styles.statIconWrapFlagged}>
                        <Icon name="warning" size={22} color={GOLD} />
                    </View>
                    <View style={styles.statTextCol}>
                        <Text style={styles.statLabel}>Flagged</Text>
                        <Text style={styles.statValueFlagged}>{flaggedCount}</Text>
                    </View>
                </Pressable>
                <Pressable
                    onPress={() => setListTab('banned')}
                    style={[styles.statCard, listTab === 'banned' && styles.statCardActive]}
                >
                    <View style={styles.statIconWrapBanned}>
                        <Icon name="shield-outline" size={22} color="#FF5C5C" />
                    </View>
                    <View style={styles.statTextCol}>
                        <Text style={styles.statLabel}>Banned</Text>
                        <Text style={styles.statValueBanned}>{bannedCount}</Text>
                    </View>
                </Pressable>
            </View>

            <View style={styles.searchRow}>
                <View style={styles.searchWrap}>
                    <Icon name="search" size={18} color={META} style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search..."
                        placeholderTextColor={META}
                        value={search}
                        onChangeText={setSearch}
                        style={styles.searchInput}
                    />
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.88}>
                    <Icon name="add" size={22} color="#000000" />
                    <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabShell}>
                <Pressable
                    onPress={() => setListTab('flagged')}
                    style={[styles.tabBtn, listTab === 'flagged' && styles.tabBtnActive]}
                >
                    <Icon
                        name="warning"
                        size={15}
                        color={listTab === 'flagged' ? TEXT : META}
                        style={styles.tabIcon}
                    />
                    <Text style={[styles.tabLabel, listTab === 'flagged' && styles.tabLabelActive]}>
                        Flagged
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => setListTab('banned')}
                    style={[styles.tabBtn, listTab === 'banned' && styles.tabBtnActive]}
                >
                    <Icon
                        name="shield-outline"
                        size={14}
                        color={listTab === 'banned' ? TEXT : META}
                        style={styles.tabIcon}
                    />
                    <Text style={[styles.tabLabel, listTab === 'banned' && styles.tabLabelActive]}>
                        Ban List
                    </Text>
                </Pressable>
            </View>

            <View style={styles.listCard}>
                {list.length === 0 ? (
                    <View style={styles.empty}>
                        <Icon
                            name={listTab === 'flagged' ? 'warning-outline' : 'shield-outline'}
                            size={40}
                            color="#333"
                        />
                        <Text style={styles.emptyTitle}>
                            {listTab === 'flagged' ? 'No flagged guests' : 'No banned guests'}
                        </Text>
                        <Text style={styles.emptyHint}>
                            {listTab === 'flagged'
                                ? 'Nothing to show yet. Tap Add to flag a guest.'
                                : 'Nothing to show yet. Tap Add and choose Banned.'}
                        </Text>
                    </View>
                ) : (
                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                        {list.map((g, i) => (
                            <View key={g.id}>
                                {i > 0 ? <View style={styles.divider} /> : null}
                                <View style={styles.row}>
                                    <View style={styles.rowBody}>
                                        <View style={styles.rowTop}>
                                            <Text style={styles.name} numberOfLines={1}>
                                                {g.name}
                                            </Text>
                                            <View
                                                style={[
                                                    styles.badge,
                                                    g.severity === 'warning'
                                                        ? styles.badgeWarn
                                                        : styles.badgeBan,
                                                ]}
                                            >
                                                <Icon
                                                    name={g.severity === 'warning' ? 'warning' : 'shield'}
                                                    size={11}
                                                    color={
                                                        g.severity === 'warning' ? '#000000' : TEXT
                                                    }
                                                />
                                                <Text
                                                    style={
                                                        g.severity === 'warning'
                                                            ? styles.badgeTextWarn
                                                            : styles.badgeTextBan
                                                    }
                                                >
                                                    {g.severity === 'warning' ? 'warning' : 'banned'}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.reason} numberOfLines={3}>
                                            {g.reason}
                                        </Text>
                                        <Text style={styles.meta}>
                                            {g.flaggedBy} • {g.flaggedDate}
                                        </Text>
                                    </View>
                                    <View style={styles.rowActions}>
                                        <TouchableOpacity style={styles.iconHit} hitSlop={10}>
                                            <Icon name="eye-outline" size={20} color={TEXT} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.iconHit}
                                            hitSlop={10}
                                            onPress={() => remove(g.id)}
                                        >
                                            <Icon name="close-circle" size={22} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>

            <Modal
                visible={modalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setModalOpen(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalRoot}
                >
                    <Pressable style={styles.modalBackdrop} onPress={() => setModalOpen(false)}>
                        <Pressable
                            style={styles.modalSheet}
                            onPress={(e) => e.stopPropagation()}
                        >
                            <ScrollView
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                                bounces={false}
                                style={{ maxHeight: MODAL_MAX_HEIGHT }}
                                contentContainerStyle={styles.modalScrollInner}
                            >
                                <View style={styles.modalHeaderWrap}>
                                    <TouchableOpacity
                                        onPress={() => setModalOpen(false)}
                                        style={styles.modalCloseBtn}
                                        hitSlop={12}
                                        accessibilityLabel="Close"
                                    >
                                        <Icon name="close" size={26} color={TEXT} />
                                    </TouchableOpacity>
                                    <Text style={styles.modalTitle}>Flag Guest</Text>
                                    <Text style={styles.modalSub}>
                                        Add a guest to the flagged or ban list.
                                    </Text>
                                </View>

                                <Text style={styles.fieldLabelModal}>Guest Name</Text>
                                <TextInput
                                    style={styles.inputModal}
                                    placeholder="Full name"
                                    placeholderTextColor="#8E8E8E"
                                    value={name}
                                    onChangeText={setName}
                                />

                                <Text style={styles.fieldLabelModal}>Severity</Text>
                                <View style={styles.seg}>
                                    <Pressable
                                        onPress={() => setSeverity('warning')}
                                        style={[
                                            styles.segBtnModal,
                                            severity === 'warning'
                                                ? styles.segWarningOn
                                                : styles.segWarningOff,
                                        ]}
                                    >
                                        <Icon
                                            name="warning"
                                            size={18}
                                            color={
                                                severity === 'warning' ? '#000000' : GOLD
                                            }
                                        />
                                        <Text
                                            style={[
                                                styles.segLabelModal,
                                                severity === 'warning'
                                                    ? styles.segLabelWarningOn
                                                    : styles.segLabelWarningOff,
                                            ]}
                                        >
                                            Warning
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => setSeverity('banned')}
                                        style={[
                                            styles.segBtnModal,
                                            severity === 'banned'
                                                ? styles.segBannedOn
                                                : styles.segBannedOff,
                                        ]}
                                    >
                                        <Icon
                                            name="shield"
                                            size={18}
                                            color={
                                                severity === 'banned' ? '#1a1a1a' : '#E57373'
                                            }
                                        />
                                        <Text
                                            style={[
                                                styles.segLabelModal,
                                                severity === 'banned'
                                                    ? styles.segLabelBannedOn
                                                    : styles.segLabelBannedOff,
                                            ]}
                                        >
                                            Banned
                                        </Text>
                                    </Pressable>
                                </View>

                                <Text style={styles.fieldLabelModal}>Reason</Text>
                                <TextInput
                                    style={[styles.inputModal, styles.textareaModal]}
                                    placeholder="Describe the incident..."
                                    placeholderTextColor="#8E8E8E"
                                    value={reason}
                                    onChangeText={setReason}
                                    multiline
                                />

                                <TouchableOpacity
                                    style={styles.modalPrimaryBtn}
                                    onPress={submitAdd}
                                    activeOpacity={0.9}
                                >
                                    <Text style={styles.modalPrimaryBtnText}>Add to List</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalSecondaryBtn}
                                    onPress={() => setModalOpen(false)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </Pressable>
                    </Pressable>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: BG },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingTop: 4,
        paddingBottom: 10,
        gap: 4,
    },
    headerRule: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.12)',
        marginHorizontal: 12,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 12,
        paddingTop: 14,
        paddingBottom: 4,
    },
    statCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: CARD,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        paddingVertical: 14,
        paddingHorizontal: 14,
    },
    statCardActive: {
        borderColor: 'rgba(255,255,255,0.14)',
        backgroundColor: '#161616',
    },
    statIconWrapFlagged: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 215, 0, 0.14)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statIconWrapBanned: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 92, 92, 0.14)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statTextCol: {
        flex: 1,
        justifyContent: 'center',
    },
    statLabel: {
        color: META,
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    statValueFlagged: {
        color: GOLD,
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    statValueBanned: {
        color: '#FF5C5C',
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    backBtn: { width: 40, alignItems: 'flex-start', justifyContent: 'center' },
    screenTitle: {
        flex: 1,
        fontSize: 28,
        fontWeight: '800',
        color: TEXT,
        letterSpacing: -0.3,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 10,
    },
    searchWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: BG,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 12,
        minHeight: 48,
    },
    searchIcon: { marginRight: 8 },
    searchInput: {
        flex: 1,
        color: TEXT,
        fontSize: 15,
        paddingVertical: 10,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: GOLD,
        paddingHorizontal: 14,
        minHeight: 48,
        borderRadius: 12,
    },
    addBtnText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 15,
    },
    tabShell: {
        flexDirection: 'row',
        backgroundColor: CARD,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        padding: 4,
        marginHorizontal: 12,
        marginBottom: 12,
    },
    tabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 11,
        borderRadius: 10,
    },
    tabBtnActive: {
        backgroundColor: '#121212',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    tabIcon: { marginTop: 1 },
    tabLabel: {
        color: META,
        fontSize: 13,
        fontWeight: '600',
    },
    tabLabelActive: {
        color: TEXT,
    },
    listCard: {
        flex: 1,
        backgroundColor: CARD,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: CARD_BORDER,
        marginHorizontal: 12,
        marginBottom: 8,
        overflow: 'hidden',
    },
    scroll: { flex: 1 },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: CARD_BORDER,
        marginLeft: 14,
    },
    row: {
        flexDirection: 'row',
        paddingHorizontal: 14,
        paddingVertical: 14,
        alignItems: 'flex-start',
    },
    rowBody: { flex: 1, paddingRight: 8 },
    rowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 6,
    },
    name: {
        color: TEXT,
        fontWeight: '700',
        fontSize: 16,
        flexShrink: 1,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 20,
    },
    /** Solid gold pill, black label — matches reference */
    badgeWarn: {
        backgroundColor: GOLD,
        borderWidth: 0,
    },
    badgeBan: {
        backgroundColor: '#dc2626',
        borderWidth: 0,
    },
    badgeTextWarn: {
        color: '#000000',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'lowercase',
    },
    badgeTextBan: {
        color: TEXT,
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'lowercase',
    },
    reason: {
        color: MUTED,
        fontSize: 13,
        lineHeight: 18,
    },
    meta: {
        color: META,
        fontSize: 11,
        marginTop: 8,
    },
    rowActions: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 4,
        paddingTop: 2,
    },
    iconHit: {
        padding: 4,
    },
    empty: {
        flex: 1,
        minHeight: 220,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 32,
    },
    emptyTitle: {
        color: MUTED,
        fontSize: 16,
        fontWeight: '600',
        marginTop: 12,
    },
    emptyHint: {
        color: META,
        fontSize: 13,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 18,
    },
    modalRoot: { flex: 1 },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    /** Centered dialog card */
    modalSheet: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#121212',
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    modalScrollInner: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 24,
    },
    modalHeaderWrap: {
        position: 'relative',
        paddingTop: 8,
        paddingBottom: 20,
        alignItems: 'center',
    },
    modalCloseBtn: {
        position: 'absolute',
        right: 0,
        top: 4,
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    modalTitle: {
        color: TEXT,
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
    },
    modalSub: {
        color: '#8E8E8E',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 24,
    },
    fieldLabelModal: {
        color: TEXT,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 8,
        marginTop: 4,
    },
    inputModal: {
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2C2C2C',
        color: TEXT,
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontSize: 16,
        marginBottom: 18,
    },
    textareaModal: {
        minHeight: 100,
        textAlignVertical: 'top',
        paddingTop: 14,
    },
    seg: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 18,
    },
    segBtnModal: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 10,
        borderRadius: 12,
    },
    segWarningOn: {
        backgroundColor: GOLD,
        borderWidth: 0,
    },
    segWarningOff: {
        backgroundColor: '#121212',
        borderWidth: 1.5,
        borderColor: GOLD,
    },
    segBannedOn: {
        backgroundColor: '#D65A6D',
        borderWidth: 0,
    },
    segBannedOff: {
        backgroundColor: '#121212',
        borderWidth: 1.5,
        borderColor: '#E57373',
    },
    segLabelModal: {
        fontSize: 15,
        fontWeight: '700',
    },
    segLabelWarningOn: { color: '#000000' },
    segLabelWarningOff: { color: GOLD },
    segLabelBannedOn: { color: '#1a1a1a' },
    segLabelBannedOff: { color: '#E57373' },
    modalPrimaryBtn: {
        width: '100%',
        backgroundColor: GOLD,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    modalPrimaryBtnText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '800',
    },
    modalSecondaryBtn: {
        width: '100%',
        marginTop: 12,
        paddingVertical: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.22)',
        backgroundColor: 'transparent',
        alignItems: 'center',
    },
    modalSecondaryBtnText: {
        color: TEXT,
        fontSize: 16,
        fontWeight: '700',
    },
});
