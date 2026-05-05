import React, { useMemo, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
    Platform,
    KeyboardAvoidingView,
    ScrollView,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useVenuePortal } from '../../context/VenuePortalContext';
import { useGuestListTypes } from '../../hooks/useGuestListTypes';
import {
    useRealtimeGuestLists,
    type RecurringListGuest,
    type GuestList,
} from '../../hooks/useRealtimeGuestLists';
import { VP } from './venuePortalTheme';
import type { VenuePortalStackParamList } from './venuePortalTypes';
import { venuePortalSafeGoBack } from './venuePortalNavigation';

type Nav = StackNavigationProp<VenuePortalStackParamList, 'VenueGuestListDetail'>;
type Route = RouteProp<VenuePortalStackParamList, 'VenueGuestListDetail'>;

function partyTotal(g: RecurringListGuest) {
    return 1 + (g.plusGuests || 0);
}

function sortGuests(guests: RecurringListGuest[]) {
    return [...guests].sort((a, b) => {
        if (a.isSticky && !b.isSticky) return -1;
        if (!a.isSticky && b.isSticky) return 1;
        return 0;
    });
}

export default function VenueGuestListDetailScreen({ navigation, route }: { navigation: Nav; route: Route }) {
    const { listId, listType } = route.params;
    const { venueId } = useVenuePortal();
    const {
        recurringLists,
        oneDayLists,
        loading,
        refetch,
        addGuestToRecurring,
        addGuestToOneDay,
        updateRecurringGuest,
        updateOneDayGuest,
        deleteGuest,
        checkInGuest,
        resetRecurringList,
    } = useRealtimeGuestLists({ venueId });

    const { typeNames, colorByTypeName, refresh: refreshTypes } = useGuestListTypes(listId);
    useFocusEffect(
        useCallback(() => {
            void refreshTypes();
        }, [refreshTypes])
    );

    const selectedList: GuestList | undefined = useMemo(() => {
        if (listType === 'recurring') return recurringLists.find((l) => l.id === listId);
        return oneDayLists.find((l) => l.id === listId);
    }, [listId, listType, recurringLists, oneDayLists]);

    const [search, setSearch] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [editGuest, setEditGuest] = useState<RecurringListGuest | null>(null);
    const [resetOpen, setResetOpen] = useState(false);
    const [listRefreshing, setListRefreshing] = useState(false);

    const [formName, setFormName] = useState('');
    const [formPlus, setFormPlus] = useState('0');
    const [formPaying, setFormPaying] = useState('0');
    const [formType, setFormType] = useState<string>('Standard');
    const [formNotes, setFormNotes] = useState('');
    const [formSticky, setFormSticky] = useState(false);
    const [formBusy, setFormBusy] = useState(false);

    const formTypeOptions = useMemo(() => {
        const s = new Set(typeNames);
        if (formType && !s.has(formType)) return [...typeNames, formType];
        return typeNames;
    }, [typeNames, formType]);

    const openAdd = () => {
        setFormName('');
        setFormPlus('0');
        setFormPaying('0');
        setFormType(typeNames[0] || 'Standard');
        setFormNotes('');
        setFormSticky(false);
        setEditGuest(null);
        setAddOpen(true);
    };

    const openEdit = (g: RecurringListGuest) => {
        setFormName(g.name);
        setFormPlus(String(g.plusGuests ?? 0));
        setFormPaying(String(g.payingGuests ?? 0));
        setFormType(g.listType || 'Standard');
        setFormNotes(g.notes || '');
        setFormSticky(!!g.isSticky);
        setEditGuest(g);
        setAddOpen(true);
    };

    const closeForm = () => {
        setAddOpen(false);
        setEditGuest(null);
    };

    const maxPaying = 1 + (parseInt(formPlus, 10) || 0);

    const submitForm = async () => {
        if (!selectedList || !formName.trim()) return;
        const plus = Math.max(0, parseInt(formPlus, 10) || 0);
        let paying = Math.max(0, parseInt(formPaying, 10) || 0);
        paying = Math.min(paying, maxPaying);
        setFormBusy(true);
        try {
            if (editGuest) {
                if (listType === 'recurring') {
                    await updateRecurringGuest(editGuest.id, {
                        guestName: formName.trim(),
                        plusGuests: plus,
                        payingGuests: paying,
                        listType: formType,
                        notes: formNotes.trim() || undefined,
                        isSticky: formSticky,
                    });
                } else {
                    await updateOneDayGuest(editGuest.id, {
                        guestName: formName.trim(),
                        plusGuests: plus,
                        payingGuests: paying,
                        listType: formType,
                        notes: formNotes.trim() || undefined,
                    });
                }
            } else if (listType === 'recurring') {
                await addGuestToRecurring(
                    selectedList.id,
                    formName.trim(),
                    plus,
                    paying,
                    formType,
                    formNotes.trim() || undefined,
                    formSticky
                );
            } else {
                await addGuestToOneDay(
                    selectedList.id,
                    formName.trim(),
                    plus,
                    paying,
                    formType,
                    formNotes.trim() || undefined
                );
            }
            closeForm();
        } finally {
            setFormBusy(false);
        }
    };

    const onDeleteGuest = (g: RecurringListGuest) => {
        Alert.alert('Remove guest', `Remove ${g.name} from this list?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove',
                style: 'destructive',
                onPress: () => void deleteGuest(g.id, listType),
            },
        ]);
    };

    const onCheckIn = (g: RecurringListGuest) => {
        const total = partyTotal(g);
        const cur = g.checkedInCount ?? 0;
        if (cur >= total) return;
        void checkInGuest(g.id, cur, total, listType);
    };

    const onToggleSticky = (g: RecurringListGuest) => {
        if (listType !== 'recurring') return;
        void updateRecurringGuest(g.id, { isSticky: !g.isSticky });
    };

    const onConfirmReset = async () => {
        if (!selectedList || listType !== 'recurring') return;
        const ok = await resetRecurringList(selectedList.id);
        if (ok) setResetOpen(false);
    };

    const filteredGuests = useMemo(() => {
        const guests = selectedList?.guests ?? [];
        const q = search.trim().toLowerCase();
        const base = q
            ? guests.filter(
                  (g) =>
                      g.name.toLowerCase().includes(q) ||
                      (g.notes || '').toLowerCase().includes(q)
              )
            : guests;
        return sortGuests(base);
    }, [selectedList, search]);

    const totalHeadcount =
        selectedList?.guests?.reduce((sum, g) => sum + partyTotal(g), 0) ?? 0;

    if (!venueId) {
        return (
            <SafeAreaView style={styles.safe}>
                <Text style={styles.muted}>No venue linked.</Text>
            </SafeAreaView>
        );
    }

    if (!loading && !selectedList) {
        return (
            <SafeAreaView style={styles.safe}>
                <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
                    <Icon name="chevron-back" size={26} color={VP.gold} />
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.muted}>This list could not be found.</Text>
            </SafeAreaView>
        );
    }

    if (!selectedList) {
        return (
            <SafeAreaView style={styles.safe}>
                <Text style={styles.muted}>Loading…</Text>
            </SafeAreaView>
        );
    }

    const renderGuest = ({ item: g }: { item: RecurringListGuest }) => {
        const total = partyTotal(g);
        const cur = g.checkedInCount ?? 0;
        const canCheckIn = cur < total;
        return (
            <View style={[styles.guestCard, g.isSticky && styles.guestCardSticky]}>
                <View style={styles.guestTop}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {g.isSticky ? <Icon name="star" size={16} color={VP.gold} /> : null}
                            <Text style={styles.guestName}>{g.name}</Text>
                        </View>
                        <Text style={styles.guestMeta}>
                            +{g.plusGuests} · Paying {g.payingGuests ?? 0}/{total} · {g.listType}
                        </Text>
                        {g.notes ? <Text style={styles.guestNotes}>{g.notes}</Text> : null}
                        <Text style={styles.guestAdded}>
                            {g.addedBy} · {g.addedAt}
                        </Text>
                    </View>
                    <View style={[styles.typePill, typePillStyle(g.listType, colorByTypeName)]}>
                        <Text style={styles.typePillText}>{g.listType}</Text>
                    </View>
                </View>
                <View style={styles.statusRow}>
                    {g.checkedIn || cur > 0 ? (
                        <Text style={styles.checkedText}>
                            Check-in {cur}/{total}
                            {g.checkInTime ? ` · ${g.checkInTime}` : ''}
                        </Text>
                    ) : (
                        <Text style={styles.pendingText}>Not checked in</Text>
                    )}
                </View>
                <View style={styles.actionRow}>
                    {canCheckIn ? (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => onCheckIn(g)}>
                            <Icon name="checkmark-circle-outline" size={20} color={VP.teal} />
                            <Text style={styles.actionBtnText}>Check in</Text>
                        </TouchableOpacity>
                    ) : null}
                    {listType === 'recurring' ? (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => onToggleSticky(g)}>
                            <Icon name="star-outline" size={20} color={VP.gold} />
                            <Text style={styles.actionBtnText}>{g.isSticky ? 'Unstick' : 'Sticky'}</Text>
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(g)}>
                        <Icon name="pencil-outline" size={20} color={VP.text} />
                        <Text style={styles.actionBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => onDeleteGuest(g)}>
                        <Icon name="trash-outline" size={20} color={VP.coral} />
                        <Text style={[styles.actionBtnText, { color: VP.coral }]}>Remove</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => venuePortalSafeGoBack(navigation)} hitSlop={12} style={styles.iconBtn}>
                    <Icon name="chevron-back" size={26} color={VP.gold} />
                </TouchableOpacity>
                <View style={styles.headerMid}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {selectedList.name}
                    </Text>
                    <Text style={styles.headerSub} numberOfLines={1}>
                        {listType === 'recurring'
                            ? `Every ${selectedList.dayOfWeek} · Reset ${selectedList.resetTime}`
                            : `Event ${selectedList.eventDate}`}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <Text style={styles.countPill}>
                        {selectedList.guests.length}/{totalHeadcount || 0}
                    </Text>
                    {listType === 'recurring' ? (
                        <TouchableOpacity onPress={() => setResetOpen(true)} style={styles.iconBtn}>
                            <Icon name="refresh-outline" size={22} color={VP.coral} />
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                        onPress={() =>
                            navigation.navigate('VenueGuestListSettings', {
                                listId,
                                listType,
                            })
                        }
                        style={styles.iconBtn}
                    >
                        <Icon name="settings-outline" size={22} color={VP.muted} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.searchBox}>
                <Icon name="search-outline" size={20} color={VP.muted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search guests…"
                    placeholderTextColor={VP.muted}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            <FlatList
                data={filteredGuests}
                keyExtractor={(g) => g.id}
                contentContainerStyle={styles.listPad}
                refreshing={listRefreshing}
                onRefresh={async () => {
                    setListRefreshing(true);
                    await refetch();
                    setListRefreshing(false);
                }}
                ListEmptyComponent={
                    <View style={styles.emptyGuest}>
                        <Icon name="people-outline" size={48} color="rgba(156,163,175,0.35)" />
                        <Text style={styles.emptyGuestText}>No guests on this list yet</Text>
                        <TouchableOpacity style={styles.emptyCta} onPress={openAdd}>
                            <Text style={styles.emptyCtaText}>Add first guest</Text>
                        </TouchableOpacity>
                    </View>
                }
                renderItem={renderGuest}
            />

            {selectedList.guests.length > 0 ? (
                <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.9}>
                    <Icon name="add" size={30} color="#111827" />
                </TouchableOpacity>
            ) : null}

            <Modal visible={addOpen} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalSafe} edges={['top']}>
                    <KeyboardAvoidingView
                        style={styles.flex}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={closeForm} hitSlop={12}>
                                <Icon name="chevron-back" size={26} color={VP.gold} />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>{editGuest ? 'Edit guest' : 'Add guest'}</Text>
                            <View style={{ width: 26 }} />
                        </View>
                        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
                            <Text style={styles.fieldLabel}>Name</Text>
                            <TextInput
                                style={styles.field}
                                value={formName}
                                onChangeText={setFormName}
                                placeholder="Guest name"
                                placeholderTextColor={VP.muted}
                            />
                            <View style={styles.row2}>
                                <View style={styles.half}>
                                    <Text style={styles.fieldLabel}>Plus guests</Text>
                                    <TextInput
                                        style={styles.field}
                                        keyboardType="number-pad"
                                        value={formPlus}
                                        onChangeText={(t) => {
                                            const v = Math.max(0, parseInt(t.replace(/\D/g, ''), 10) || 0);
                                            setFormPlus(String(v));
                                            const pay = parseInt(formPaying, 10) || 0;
                                            setFormPaying(String(Math.min(pay, 1 + v)));
                                        }}
                                    />
                                </View>
                                <View style={styles.half}>
                                    <Text style={styles.fieldLabel}>Paying (max {maxPaying})</Text>
                                    <TextInput
                                        style={styles.field}
                                        keyboardType="number-pad"
                                        value={formPaying}
                                        onChangeText={(t) => {
                                            const v = Math.max(0, parseInt(t.replace(/\D/g, ''), 10) || 0);
                                            setFormPaying(String(Math.min(v, maxPaying)));
                                        }}
                                    />
                                </View>
                            </View>
                            <Text style={styles.fieldLabel}>List type</Text>
                            <View style={styles.typeRow}>
                                {formTypeOptions.map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.typeChip, formType === t && styles.typeChipOn]}
                                        onPress={() => setFormType(t)}
                                    >
                                        <Text style={[styles.typeChipText, formType === t && styles.typeChipTextOn]}>
                                            {t}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.fieldLabel}>Notes</Text>
                            <TextInput
                                style={[styles.field, styles.notesField]}
                                value={formNotes}
                                onChangeText={setFormNotes}
                                placeholder="Optional"
                                placeholderTextColor={VP.muted}
                                multiline
                            />
                            {listType === 'recurring' ? (
                                <View style={styles.stickyRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.fieldLabel}>Sticky guest</Text>
                                        <Text style={styles.stickyHint}>Survives list reset</Text>
                                    </View>
                                    <Switch
                                        value={formSticky}
                                        onValueChange={setFormSticky}
                                        trackColor={{ false: '#444', true: 'rgba(251,191,36,0.5)' }}
                                        thumbColor={formSticky ? VP.gold : '#888'}
                                    />
                                </View>
                            ) : null}
                        </ScrollView>
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.modalCancel} onPress={closeForm}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalSave, (!formName.trim() || formBusy) && styles.modalSaveOff]}
                                onPress={() => void submitForm()}
                                disabled={!formName.trim() || formBusy}
                            >
                                <Text style={styles.modalSaveText}>{formBusy ? 'Saving…' : 'Save'}</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>

            <Modal visible={resetOpen} transparent animationType="fade">
                <View style={styles.resetOverlay}>
                    <View style={styles.resetCard}>
                        <Text style={styles.resetTitle}>Reset guest list?</Text>
                        <Text style={styles.resetBody}>
                            Removes all non-sticky guests, clears check-ins for sticky guests, and updates reset time.
                        </Text>
                        <View style={styles.resetBtns}>
                            <TouchableOpacity style={styles.resetCancel} onPress={() => setResetOpen(false)}>
                                <Text style={styles.resetCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.resetGo} onPress={() => void onConfirmReset()}>
                                <Text style={styles.resetGoText}>Reset</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function pillBgFromColorKey(color: string): string {
    const c = (color || 'teal').toLowerCase();
    const map: Record<string, string> = {
        teal: 'rgba(45,212,191,0.18)',
        coral: 'rgba(248,113,113,0.22)',
        gold: 'rgba(251,191,36,0.2)',
        purple: 'rgba(167,139,250,0.2)',
        blue: 'rgba(96,165,250,0.2)',
        green: 'rgba(74,222,128,0.2)',
        pink: 'rgba(244,114,182,0.2)',
        orange: 'rgba(251,146,60,0.22)',
    };
    return map[c] || map.teal;
}

function typePillStyle(t: string, colorByName: Map<string, string>) {
    const custom = colorByName.get((t || '').trim().toLowerCase());
    if (custom) return { backgroundColor: pillBgFromColorKey(custom) };
    const x = (t || '').toLowerCase();
    if (x === 'vip') return { backgroundColor: 'rgba(251,191,36,0.2)' };
    if (x === 'aa') return { backgroundColor: 'rgba(167,139,250,0.2)' };
    return { backgroundColor: 'rgba(45,212,191,0.15)' };
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: VP.bg },
    flex: { flex: 1 },
    muted: { color: VP.muted, padding: 24, fontSize: 15 },
    backRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
    backText: { color: VP.gold, fontSize: 16, fontWeight: '700' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        gap: 4,
    },
    iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerMid: { flex: 1, minWidth: 0 },
    headerTitle: { color: VP.text, fontSize: 18, fontWeight: '800' },
    headerSub: { color: VP.muted, fontSize: 12, marginTop: 2 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    countPill: {
        fontSize: 11,
        fontWeight: '800',
        color: VP.muted,
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginRight: 4,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 8,
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: VP.card,
        paddingHorizontal: 14,
        gap: 10,
    },
    searchInput: { flex: 1, color: VP.text, fontSize: 15, fontWeight: '600', paddingVertical: 0 },
    listPad: { paddingHorizontal: 16, paddingBottom: 120 },
    guestCard: {
        backgroundColor: VP.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: VP.cardBorder,
        padding: 14,
        marginBottom: 12,
    },
    guestCardSticky: { borderColor: 'rgba(251,191,36,0.35)' },
    guestTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    guestName: { color: VP.text, fontSize: 17, fontWeight: '800' },
    guestMeta: { color: VP.muted, fontSize: 13, marginTop: 4 },
    guestNotes: { color: VP.muted, fontSize: 13, marginTop: 6, fontStyle: 'italic' },
    guestAdded: { color: VP.muted, fontSize: 11, marginTop: 6 },
    typePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    typePillText: { fontSize: 10, fontWeight: '800', color: VP.text },
    statusRow: { marginTop: 10 },
    checkedText: { color: VP.teal, fontSize: 13, fontWeight: '700' },
    pendingText: { color: VP.muted, fontSize: 13 },
    actionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12,
        gap: 8,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    actionBtnText: { color: VP.text, fontSize: 12, fontWeight: '700' },
    emptyGuest: { alignItems: 'center', paddingTop: 48 },
    emptyGuestText: { color: VP.muted, fontSize: 16, marginTop: 12 },
    emptyCta: {
        marginTop: 20,
        backgroundColor: VP.gold,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 14,
    },
    emptyCtaText: { color: '#111827', fontWeight: '800', fontSize: 15 },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 28,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: VP.gold,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
    },
    modalSafe: { flex: 1, backgroundColor: VP.bg },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    modalTitle: { color: VP.text, fontSize: 18, fontWeight: '800' },
    modalScroll: { padding: 20, paddingBottom: 40 },
    fieldLabel: { color: VP.muted, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 12 },
    field: {
        backgroundColor: VP.card,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 48,
        color: VP.text,
        fontSize: 16,
        fontWeight: '600',
    },
    notesField: { height: 88, paddingTop: 12, textAlignVertical: 'top' },
    row2: { flexDirection: 'row', gap: 12 },
    half: { flex: 1 },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeChip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    typeChipOn: { backgroundColor: VP.gold, borderColor: VP.gold },
    typeChipText: { color: VP.text, fontWeight: '700', fontSize: 14 },
    typeChipTextOn: { color: '#111827' },
    stickyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    stickyHint: { color: VP.muted, fontSize: 12, marginTop: 2 },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255,255,255,0.08)',
    },
    modalCancel: {
        flex: 1,
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelText: { color: VP.text, fontWeight: '700' },
    modalSave: {
        flex: 1,
        height: 50,
        borderRadius: 14,
        backgroundColor: VP.gold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalSaveOff: { opacity: 0.45 },
    modalSaveText: { color: '#111827', fontWeight: '800', fontSize: 16 },
    resetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        padding: 24,
    },
    resetCard: {
        backgroundColor: VP.card,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    resetTitle: { color: VP.text, fontSize: 18, fontWeight: '800' },
    resetBody: { color: VP.muted, fontSize: 14, lineHeight: 20, marginTop: 12 },
    resetBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
    resetCancel: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetCancelText: { color: VP.text, fontWeight: '700' },
    resetGo: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: VP.coral,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetGoText: { color: '#fff', fontWeight: '800' },
});
