import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    Modal,
    FlatList,
    ActivityIndicator,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../config/supabase';
import { useVenuePortal } from '../../context/VenuePortalContext';
import { useRealtimeGuestLists, DAYS_SUNDAY_FIRST } from '../../hooks/useRealtimeGuestLists';
import { fetchVenueStaffProfiles, type VenueStaffProfile } from '../../services/venuePortal';
import { VP } from './venuePortalTheme';
import type { VenuePortalStackParamList } from './venuePortalTypes';
import { venuePortalSafeGoBack } from './venuePortalNavigation';

type Nav = StackNavigationProp<VenuePortalStackParamList, 'VenueGuestListSettings'>;
type Route = RouteProp<VenuePortalStackParamList, 'VenueGuestListSettings'>;

const PICK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AVAILABLE_COLORS = [
    { name: 'Teal', value: 'teal' },
    { name: 'Coral', value: 'coral' },
    { name: 'Gold', value: 'gold' },
    { name: 'Purple', value: 'purple' },
    { name: 'Blue', value: 'blue' },
    { name: 'Green', value: 'green' },
    { name: 'Pink', value: 'pink' },
    { name: 'Orange', value: 'orange' },
] as const;

type EditableListType = { id: string; name: string; color: string };

type PermissionRow = {
    managerId: string;
    managerName: string;
    isExternal?: boolean;
    canView: boolean;
    canCheckIn: boolean;
    canAddStandard: boolean;
    canAddVip: boolean;
    canAddAa: boolean;
    canDelete: boolean;
};

type PermissionToggleKey = 'canView' | 'canCheckIn' | 'canAddStandard' | 'canAddVip' | 'canAddAa' | 'canDelete';

function formatResetTime(raw: string | null | undefined): string {
    if (!raw) return '03:00';
    const s = String(raw);
    if (s.length >= 5 && s[2] === ':') return s.slice(0, 5);
    return s.slice(0, 5) || '03:00';
}

function toPgTime(s: string): string {
    const t = s.trim();
    if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
    return '03:00:00';
}

function defaultListTypes(): EditableListType[] {
    const ts = Date.now();
    return [
        { id: `t-${ts}-a`, name: 'Standard', color: 'teal' },
        { id: `t-${ts}-b`, name: 'VIP', color: 'coral' },
        { id: `t-${ts}-c`, name: 'AA', color: 'gold' },
    ];
}

function typeDotColor(color: string): string {
    const c = (color || 'teal').toLowerCase();
    const map: Record<string, string> = {
        teal: '#2dd4bf',
        coral: '#f87171',
        gold: '#fbbf24',
        purple: '#a78bfa',
        blue: '#60a5fa',
        green: '#4ade80',
        pink: '#f472b6',
        orange: '#fb923c',
    };
    return map[c] || map.teal;
}

export default function VenueGuestListSettingsScreen({ navigation, route }: { navigation: Nav; route: Route }) {
    const { listId, listType } = route.params;
    const { venueId } = useVenuePortal();
    const { deleteList, refetch } = useRealtimeGuestLists({ venueId });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [dayOfWeek, setDayOfWeek] = useState('Wednesday');
    const [resetTime, setResetTime] = useState('03:00');
    const [eventDate, setEventDate] = useState('');
    const [dayModalOpen, setDayModalOpen] = useState(false);
    const [colorModalOpen, setColorModalOpen] = useState(false);
    const [pendingColorForNewType, setPendingColorForNewType] = useState<string>('teal');
    const [staffPickerOpen, setStaffPickerOpen] = useState(false);
    const [externalModalOpen, setExternalModalOpen] = useState(false);
    const [externalName, setExternalName] = useState('');

    const [listTypes, setListTypes] = useState<EditableListType[]>([]);
    const [newTypeName, setNewTypeName] = useState('');
    const [permissions, setPermissions] = useState<PermissionRow[]>([]);
    const [venueStaff, setVenueStaff] = useState<VenueStaffProfile[]>([]);

    const staffNotInPermissions = useMemo(() => {
        const ids = new Set(permissions.map((p) => p.managerId));
        return venueStaff.filter((s) => !ids.has(s.id));
    }, [venueStaff, permissions]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            if (!venueId) return;

            const [typesRes, staffRes] = await Promise.all([
                supabase
                    .from('guest_list_types')
                    .select('id, name, color, sort_order')
                    .eq('list_id', listId)
                    .order('sort_order', { ascending: true }),
                listType === 'recurring' ? fetchVenueStaffProfiles(venueId) : Promise.resolve([] as VenueStaffProfile[]),
            ]);

            if (listType === 'recurring') {
                setVenueStaff(staffRes);
            } else {
                setVenueStaff([]);
            }

            if (typesRes.error) throw typesRes.error;
            const trows = typesRes.data || [];
            if (trows.length > 0) {
                setListTypes(
                    trows.map((t: any) => ({
                        id: t.id,
                        name: String(t.name || ''),
                        color: String(t.color || 'teal'),
                    }))
                );
            } else {
                setListTypes(defaultListTypes());
            }

            if (listType === 'recurring') {
                const { data, error } = await supabase
                    .from('recurring_guest_lists')
                    .select('*')
                    .eq('id', listId)
                    .maybeSingle();
                if (error) throw error;
                if (!data) {
                    setName('');
                    return;
                }
                setName(data.name || '');
                setIsActive(!!data.is_active);
                const dow = typeof data.day_of_week === 'number' ? DAYS_SUNDAY_FIRST[data.day_of_week] : 'Wednesday';
                setDayOfWeek(dow);
                setResetTime(formatResetTime(data.reset_time as string));

                const { data: permData, error: permErr } = await supabase
                    .from('recurring_list_permissions')
                    .select('*')
                    .eq('recurring_list_id', listId);
                if (permErr) console.warn('[VenueGuestListSettings] permissions', permErr);
                setPermissions(
                    (permData || []).map((p: any) => ({
                        managerId: p.manager_id,
                        managerName: p.manager_name,
                        isExternal: String(p.manager_id || '').startsWith('EXT-'),
                        canView: !!p.can_view,
                        canCheckIn: !!p.can_check_in,
                        canAddStandard: !!p.can_add_standard,
                        canAddVip: !!p.can_add_vip,
                        canAddAa: !!p.can_add_aa,
                        canDelete: !!p.can_delete,
                    }))
                );
            } else {
                const { data, error } = await supabase
                    .from('one_day_guest_lists')
                    .select('*')
                    .eq('id', listId)
                    .maybeSingle();
                if (error) throw error;
                if (!data) {
                    setName('');
                    return;
                }
                setName(data.name || '');
                setIsActive(!!data.is_active);
                setEventDate((data.event_date as string) || '');
                setPermissions([]);
            }
        } catch (e) {
            console.warn('[VenueGuestListSettings] load', e);
            Alert.alert('Error', 'Could not load list settings.');
        } finally {
            setLoading(false);
        }
    }, [listId, listType, venueId]);

    useEffect(() => {
        void load();
    }, [load]);

    const persistListTypesAndPermissions = async () => {
        const { error: delTypes } = await supabase.from('guest_list_types').delete().eq('list_id', listId);
        if (delTypes) throw delTypes;

        if (listTypes.length > 0 && venueId) {
            const inserts = listTypes.map((lt, idx) => ({
                name: lt.name.trim(),
                color: lt.color || 'teal',
                list_id: listId,
                venue_id: venueId,
                sort_order: idx,
            }));
            const { error: insErr } = await supabase.from('guest_list_types').insert(inserts);
            if (insErr) throw insErr;
        }

        if (listType === 'recurring') {
            const { error: delPerm } = await supabase
                .from('recurring_list_permissions')
                .delete()
                .eq('recurring_list_id', listId);
            if (delPerm) throw delPerm;

            if (permissions.length > 0) {
                const perms = permissions.map((p) => ({
                    recurring_list_id: listId,
                    manager_id: p.managerId,
                    manager_name: p.managerName,
                    can_view: p.canView,
                    can_check_in: p.canCheckIn,
                    can_add_standard: p.canAddStandard,
                    can_add_vip: p.canAddVip,
                    can_add_aa: p.canAddAa,
                    can_delete: p.canDelete,
                }));
                const { error: pIns } = await supabase.from('recurring_list_permissions').insert(perms);
                if (pIns) throw pIns;
            }
        }
    };

    const save = async () => {
        if (!name.trim()) {
            Alert.alert('Name required', 'Enter a list name.');
            return;
        }
        if (!venueId) return;

        setSaving(true);
        try {
            if (listType === 'recurring') {
                const dayIndex = DAYS_SUNDAY_FIRST.indexOf(dayOfWeek);
                const { error } = await supabase
                    .from('recurring_guest_lists')
                    .update({
                        name: name.trim(),
                        is_active: isActive,
                        day_of_week: dayIndex >= 0 ? dayIndex : 3,
                        reset_time: toPgTime(resetTime),
                    })
                    .eq('id', listId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('one_day_guest_lists')
                    .update({
                        name: name.trim(),
                        is_active: isActive,
                        ...(eventDate.trim() ? { event_date: eventDate.trim() } : {}),
                    })
                    .eq('id', listId);
                if (error) throw error;
            }

            await persistListTypesAndPermissions();
            await refetch();
            navigation.goBack();
        } catch (e: any) {
            Alert.alert('Save failed', e?.message || 'Try again.');
        } finally {
            setSaving(false);
        }
    };

    const onDelete = () => {
        Alert.alert(
            'Delete list',
            'This removes all guests on this list. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const ok = await deleteList(listId, listType === 'recurring' ? 'recurring' : 'oneday');
                        if (ok) {
                            await refetch();
                            navigation.pop(2);
                        } else {
                            Alert.alert('Delete failed', 'Could not delete this list.');
                        }
                    },
                },
            ]
        );
    };

    const addListType = () => {
        const n = newTypeName.trim();
        if (!n) return;
        setListTypes((prev) => [...prev, { id: `new-${Date.now()}`, name: n, color: pendingColorForNewType }]);
        setNewTypeName('');
    };

    const removeListType = (id: string) => {
        setListTypes((prev) => prev.filter((t) => t.id !== id));
    };

    const setPermField = (managerId: string, key: PermissionToggleKey, value: boolean) => {
        setPermissions((prev) =>
            prev.map((p) => (p.managerId === managerId ? { ...p, [key]: value } : p))
        );
    };

    const addStaffPermission = (staff: VenueStaffProfile) => {
        setPermissions((prev) => [
            ...prev,
            {
                managerId: staff.id,
                managerName: staff.label,
                canView: true,
                canCheckIn: false,
                canAddStandard: true,
                canAddVip: false,
                canAddAa: false,
                canDelete: false,
            },
        ]);
        setStaffPickerOpen(false);
    };

    const addExternalPermission = () => {
        const n = externalName.trim();
        if (!n) {
            Alert.alert('Name required', 'Enter a name for this contact.');
            return;
        }
        setPermissions((prev) => [
            ...prev,
            {
                managerId: `EXT-${Date.now()}`,
                managerName: n,
                isExternal: true,
                canView: true,
                canCheckIn: false,
                canAddStandard: true,
                canAddVip: false,
                canAddAa: false,
                canDelete: false,
            },
        ]);
        setExternalName('');
        setExternalModalOpen(false);
    };

    const removePermission = (managerId: string) => {
        setPermissions((prev) => prev.filter((p) => p.managerId !== managerId));
    };

    if (!venueId) {
        return (
            <SafeAreaView style={styles.safe}>
                <Text style={styles.muted}>No venue linked.</Text>
            </SafeAreaView>
        );
    }

    if (loading) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.center}>
                    <ActivityIndicator color={VP.gold} size="large" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => venuePortalSafeGoBack(navigation)} hitSlop={12} style={styles.iconBtn}>
                    <Icon name="chevron-back" size={26} color={VP.gold} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>List settings</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.sectionTitle}>General</Text>
                <Text style={styles.label}>List name</Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Name"
                    placeholderTextColor={VP.muted}
                />

                <View style={styles.switchRow}>
                    <Text style={styles.labelInline}>Active</Text>
                    <Switch
                        value={isActive}
                        onValueChange={setIsActive}
                        trackColor={{ false: '#444', true: 'rgba(45,212,191,0.4)' }}
                        thumbColor={isActive ? VP.teal : '#888'}
                    />
                </View>

                {listType === 'recurring' ? (
                    <>
                        <Text style={styles.label}>Day of week</Text>
                        <TouchableOpacity style={styles.selectField} onPress={() => setDayModalOpen(true)}>
                            <Text style={styles.selectText}>{dayOfWeek}</Text>
                            <Icon name="chevron-down" size={20} color={VP.muted} />
                        </TouchableOpacity>
                        <Text style={styles.label}>Reset time (HH:mm)</Text>
                        <TextInput
                            style={styles.input}
                            value={resetTime}
                            onChangeText={setResetTime}
                            placeholder="03:00"
                            placeholderTextColor={VP.muted}
                        />
                    </>
                ) : (
                    <>
                        <Text style={styles.label}>Event date (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.input}
                            value={eventDate}
                            onChangeText={setEventDate}
                            placeholder="2026-03-29"
                            placeholderTextColor={VP.muted}
                            autoCapitalize="none"
                        />
                    </>
                )}

                <Text style={styles.sectionTitle}>List types</Text>
                <Text style={styles.hint}>
                    Types appear when adding guests. Standard, VIP, and AA map to your database; other names are stored as
                    standard for check-in rules.
                </Text>
                <View style={styles.typeChips}>
                    {listTypes.map((t) => (
                        <View key={t.id} style={styles.typeChip}>
                            <View style={[styles.typeDot, { backgroundColor: typeDotColor(t.color) }]} />
                            <Text style={styles.typeChipText}>{t.name}</Text>
                            <TouchableOpacity onPress={() => removeListType(t.id)} hitSlop={8}>
                                <Icon name="close-circle" size={20} color={VP.coral} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
                <Text style={styles.label}>New type</Text>
                <View style={styles.addTypeRow}>
                    <TextInput
                        style={[styles.input, styles.addTypeInput]}
                        value={newTypeName}
                        onChangeText={setNewTypeName}
                        placeholder="Name"
                        placeholderTextColor={VP.muted}
                    />
                    <TouchableOpacity style={styles.colorPickBtn} onPress={() => setColorModalOpen(true)}>
                        <View style={[styles.typeDotLg, { backgroundColor: typeDotColor(pendingColorForNewType) }]} />
                        <Icon name="chevron-down" size={18} color={VP.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addTypeBtn} onPress={addListType}>
                        <Icon name="add" size={22} color="#111827" />
                    </TouchableOpacity>
                </View>

                {listType === 'recurring' ? (
                    <>
                        <Text style={styles.sectionTitle}>Access (recurring)</Text>
                        <Text style={styles.hint}>
                            Choose who can view or manage this list. Team list uses profiles linked to your venue.
                        </Text>
                        <View style={styles.permActions}>
                            <TouchableOpacity style={styles.permActionBtn} onPress={() => setStaffPickerOpen(true)}>
                                <Icon name="person-add-outline" size={18} color={VP.gold} />
                                <Text style={styles.permActionText}>Add team member</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.permActionBtn} onPress={() => setExternalModalOpen(true)}>
                                <Icon name="mail-outline" size={18} color={VP.gold} />
                                <Text style={styles.permActionText}>Add external</Text>
                            </TouchableOpacity>
                        </View>

                        {permissions.length === 0 ? (
                            <Text style={styles.mutedInline}>No custom permissions — defaults apply at venue level.</Text>
                        ) : (
                            permissions.map((p) => (
                                <View key={p.managerId} style={styles.permCard}>
                                    <View style={styles.permCardHead}>
                                        <Text style={styles.permName} numberOfLines={2}>
                                            {p.managerName}
                                            {p.isExternal ? (
                                                <Text style={styles.permExt}> · external</Text>
                                            ) : null}
                                        </Text>
                                        <TouchableOpacity onPress={() => removePermission(p.managerId)}>
                                            <Text style={styles.permRemove}>Remove</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <PermSwitchRow
                                        label="View"
                                        value={p.canView}
                                        onValueChange={(v) => setPermField(p.managerId, 'canView', v)}
                                    />
                                    <PermSwitchRow
                                        label="Check in"
                                        value={p.canCheckIn}
                                        onValueChange={(v) => setPermField(p.managerId, 'canCheckIn', v)}
                                    />
                                    <PermSwitchRow
                                        label="+ Standard"
                                        value={p.canAddStandard}
                                        onValueChange={(v) => setPermField(p.managerId, 'canAddStandard', v)}
                                    />
                                    <PermSwitchRow
                                        label="+ VIP"
                                        value={p.canAddVip}
                                        onValueChange={(v) => setPermField(p.managerId, 'canAddVip', v)}
                                    />
                                    <PermSwitchRow
                                        label="+ AA"
                                        value={p.canAddAa}
                                        onValueChange={(v) => setPermField(p.managerId, 'canAddAa', v)}
                                    />
                                    <PermSwitchRow
                                        label="Delete"
                                        value={p.canDelete}
                                        onValueChange={(v) => setPermField(p.managerId, 'canDelete', v)}
                                    />
                                </View>
                            ))
                        )}
                    </>
                ) : null}

                <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnOff]}
                    onPress={() => void save()}
                    disabled={saving}
                >
                    <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save changes'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                    <Icon name="trash-outline" size={20} color={VP.coral} />
                    <Text style={styles.deleteBtnText}>Delete list</Text>
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={dayModalOpen} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDayModalOpen(false)}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Day of week</Text>
                        <FlatList
                            data={PICK_DAYS}
                            keyExtractor={(d) => d}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalRow}
                                    onPress={() => {
                                        setDayOfWeek(item);
                                        setDayModalOpen(false);
                                    }}
                                >
                                    <Text style={styles.modalRowText}>{item}</Text>
                                    {dayOfWeek === item ? (
                                        <Icon name="checkmark" size={20} color={VP.gold} />
                                    ) : null}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal visible={colorModalOpen} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setColorModalOpen(false)}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Color</Text>
                        <FlatList
                            data={[...AVAILABLE_COLORS]}
                            keyExtractor={(c) => c.value}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalRow}
                                    onPress={() => {
                                        setPendingColorForNewType(item.value);
                                        setColorModalOpen(false);
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <View
                                            style={[
                                                styles.typeDotLg,
                                                { backgroundColor: typeDotColor(item.value) },
                                            ]}
                                        />
                                        <Text style={styles.modalRowText}>{item.name}</Text>
                                    </View>
                                    {pendingColorForNewType === item.value ? (
                                        <Icon name="checkmark" size={20} color={VP.gold} />
                                    ) : null}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal visible={staffPickerOpen} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setStaffPickerOpen(false)}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Add team member</Text>
                        {staffNotInPermissions.length === 0 ? (
                            <Text style={styles.modalEmpty}>
                                {venueStaff.length === 0
                                    ? 'No venue profiles found (check RLS or link staff to this venue).'
                                    : 'Everyone listed already has a row. Remove one to re-add.'}
                            </Text>
                        ) : (
                            <FlatList
                                data={staffNotInPermissions}
                                keyExtractor={(s) => s.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.modalRow} onPress={() => addStaffPermission(item)}>
                                        <Text style={styles.modalRowText}>{item.label}</Text>
                                        <Icon name="add-circle-outline" size={22} color={VP.gold} />
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal visible={externalModalOpen} animationType="slide" transparent>
                <View style={styles.extOverlay}>
                    <View style={styles.extCard}>
                        <Text style={styles.modalTitle}>External contact</Text>
                        <Text style={styles.hint}>Stored as display name only (same as web admin).</Text>
                        <TextInput
                            style={styles.input}
                            value={externalName}
                            onChangeText={setExternalName}
                            placeholder="Name"
                            placeholderTextColor={VP.muted}
                        />
                        <View style={styles.extBtns}>
                            <TouchableOpacity style={styles.extCancel} onPress={() => setExternalModalOpen(false)}>
                                <Text style={styles.extCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.extOk} onPress={addExternalPermission}>
                                <Text style={styles.extOkText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function PermSwitchRow({
    label,
    value,
    onValueChange,
}: {
    label: string;
    value: boolean;
    onValueChange: (v: boolean) => void;
}) {
    return (
        <View style={styles.permSwitchRow}>
            <Text style={styles.permSwitchLabel}>{label}</Text>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#444', true: 'rgba(45,212,191,0.35)' }}
                thumbColor={value ? VP.teal : '#888'}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: VP.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    muted: { color: VP.muted, padding: 24 },
    mutedInline: { color: VP.muted, fontSize: 13, marginTop: 8, lineHeight: 18 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: VP.text, fontSize: 18, fontWeight: '800' },
    scroll: { padding: 20, paddingBottom: 48 },
    sectionTitle: {
        color: VP.text,
        fontSize: 17,
        fontWeight: '800',
        marginTop: 28,
        marginBottom: 4,
    },
    label: { color: VP.muted, fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
    labelInline: { color: VP.text, fontSize: 16, fontWeight: '700' },
    input: {
        backgroundColor: VP.card,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 50,
        color: VP.text,
        fontSize: 16,
        fontWeight: '600',
    },
    selectField: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: VP.card,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 50,
    },
    selectText: { color: VP.text, fontSize: 16, fontWeight: '600' },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
        paddingVertical: 8,
    },
    hint: { color: VP.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
    typeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
    typeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.06)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    typeChipText: { color: VP.text, fontSize: 14, fontWeight: '700' },
    typeDot: { width: 10, height: 10, borderRadius: 5 },
    typeDotLg: { width: 22, height: 22, borderRadius: 11 },
    addTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
    addTypeInput: { flex: 1, marginTop: 0 },
    colorPickBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 50,
        paddingHorizontal: 12,
        backgroundColor: VP.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    addTypeBtn: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: VP.gold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    permActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
    permActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.35)',
        backgroundColor: 'rgba(251,191,36,0.08)',
    },
    permActionText: { color: VP.gold, fontWeight: '700', fontSize: 14 },
    permCard: {
        marginTop: 14,
        padding: 14,
        borderRadius: 14,
        backgroundColor: VP.card,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    permCardHead: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
        gap: 12,
    },
    permName: { flex: 1, color: VP.text, fontSize: 15, fontWeight: '800' },
    permExt: { color: VP.muted, fontWeight: '600' },
    permRemove: { color: VP.coral, fontWeight: '800', fontSize: 14 },
    permSwitchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    permSwitchLabel: { color: VP.muted, fontSize: 14, fontWeight: '600' },
    saveBtn: {
        marginTop: 28,
        height: 52,
        borderRadius: 14,
        backgroundColor: VP.gold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnOff: { opacity: 0.5 },
    saveBtnText: { color: '#111827', fontWeight: '800', fontSize: 16 },
    deleteBtn: {
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 48,
    },
    deleteBtnText: { color: VP.coral, fontWeight: '800', fontSize: 16 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 24,
    },
    modalCard: {
        backgroundColor: VP.card,
        borderRadius: 16,
        maxHeight: '70%',
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        color: VP.text,
        fontSize: 16,
        fontWeight: '800',
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    modalEmpty: { color: VP.muted, paddingHorizontal: 16, paddingBottom: 16, fontSize: 14, lineHeight: 20 },
    modalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    modalRowText: { color: VP.text, fontSize: 16, fontWeight: '600' },
    extOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        padding: 24,
    },
    extCard: {
        backgroundColor: VP.card,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    extBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
    extCancel: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    extCancelText: { color: VP.text, fontWeight: '700' },
    extOk: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor: VP.gold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    extOkText: { color: '#111827', fontWeight: '800' },
});
