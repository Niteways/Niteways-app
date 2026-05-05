import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';
import { useVenuePortal } from '../../context/VenuePortalContext';
import { useVenueTicketTypes } from '../../hooks/useVenueTicketTypes';
import { VP, VP_PARTITION_LINE } from './venuePortalTheme';
import type { VenuePortalStackParamList } from './venuePortalTypes';
import { venuePortalSafeGoBack } from './venuePortalNavigation';
import { formatSupabaseError } from '../../utils/supabasePostgrestErrors';

type Nav = StackNavigationProp<VenuePortalStackParamList, 'VenueTicketTypeForm'>;
type R = RouteProp<VenuePortalStackParamList, 'VenueTicketTypeForm'>;

const BG = '#000000';
const MOCKUP_GOLD = '#FFD700';
const INPUT_BG = '#1A1A1A';
const DAY_UNSELECTED_BG = '#2A2A2A';

/** Mon–Sat row, then Sun (matches reference layout). */
const DAY_ROW_MAIN: { key: string; label: string }[] = [
    { key: 'monday', label: 'Mon' },
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
];
const DAY_ROW_SUN: { key: string; label: string }[] = [{ key: 'sunday', label: 'Sun' }];

const STATUS_OPTS = ['active', 'soldout', 'hidden'] as const;

const TICKET_TYPE_OPTIONS: { value: 'regular' | 'special'; label: string }[] = [
    { value: 'regular', label: 'Regular (Every Open Day)' },
    { value: 'special', label: 'Special (Specific dates)' },
];

export default function VenueTicketTypeFormScreen({ navigation, route }: { navigation: Nav; route: R }) {
    const mode = route.params.mode;
    const ticketId = route.params.mode === 'edit' ? route.params.ticketId : undefined;
    const insets = useSafeAreaInsets();
    const { venueId, loading: venueLoading } = useVenuePortal();
    const { allTickets, addTicket, updateTicket, isLoading, refetch } = useVenueTicketTypes({ venueId });

    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('');
    const [description, setDescription] = useState('');
    const [ticketType, setTicketType] = useState<'regular' | 'special'>('regular');
    const [status, setStatus] = useState<(typeof STATUS_OPTS)[number]>('active');
    const [activeDays, setActiveDays] = useState<string[]>(['friday', 'saturday']);
    const [specificDatesRaw, setSpecificDatesRaw] = useState('');
    const [saving, setSaving] = useState(false);
    const [typePickerOpen, setTypePickerOpen] = useState(false);

    const existing = mode === 'edit' && ticketId ? allTickets.find((t) => t.id === ticketId) : undefined;

    useFocusEffect(
        useCallback(() => {
            void refetch();
        }, [refetch])
    );

    useEffect(() => {
        if (mode !== 'edit' || !existing) return;
        setName(existing.name);
        setPrice(String(existing.price));
        setQuantity(String(existing.quantity));
        setDescription(existing.description || '');
        setTicketType(existing.type);
        setStatus(existing.status);
        setActiveDays(
            existing.active_days && existing.active_days.length > 0
                ? [...existing.active_days]
                : ['friday', 'saturday']
        );
        setSpecificDatesRaw((existing.specific_dates || []).join(', '));
    }, [mode, existing]);

    const ticketTypeLabel =
        TICKET_TYPE_OPTIONS.find((o) => o.value === ticketType)?.label ?? TICKET_TYPE_OPTIONS[0].label;

    const toggleDay = (d: string) => {
        setActiveDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
    };

    const parseSpecificDates = (): string[] => {
        return specificDatesRaw
            .split(/[,\s]+/)
            .map((s) => s.trim())
            .filter(Boolean)
            .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
    };

    const onSave = async () => {
        if (!venueId) {
            Alert.alert('Error', 'No venue');
            return;
        }
        if (!name.trim() || !quantity.trim()) {
            Alert.alert('Required', 'Ticket name and available quantity are required.');
            return;
        }
        const qty = parseInt(quantity, 10);
        if (Number.isNaN(qty) || qty < 0) {
            Alert.alert('Invalid', 'Quantity must be a non-negative number.');
            return;
        }
        const priceNum = parseFloat(price) || 0;
        const specDates = ticketType === 'special' ? parseSpecificDates() : null;
        if (ticketType === 'special' && specDates && specDates.length === 0 && specificDatesRaw.trim()) {
            Alert.alert('Dates', 'Use yyyy-MM-dd for special dates, comma-separated.');
            return;
        }

        const saveStatus = mode === 'create' ? 'active' : status;

        setSaving(true);
        try {
            if (mode === 'create') {
                await addTicket({
                    venue_id: venueId,
                    name: name.trim(),
                    price: priceNum,
                    quantity: qty,
                    sold: 0,
                    status: saveStatus,
                    type: ticketType,
                    active_days: ticketType === 'regular' ? activeDays : null,
                    specific_dates: ticketType === 'special' ? (specDates && specDates.length > 0 ? specDates : null) : null,
                    description: description.trim() || null,
                    sort_order: allTickets.length,
                });
            } else if (ticketId && existing) {
                await updateTicket(ticketId, {
                    name: name.trim(),
                    price: priceNum,
                    quantity: qty,
                    sold: existing.sold,
                    status: saveStatus,
                    type: ticketType,
                    active_days: ticketType === 'regular' ? activeDays : null,
                    specific_dates: ticketType === 'special' ? (specDates && specDates.length > 0 ? specDates : null) : null,
                    description: description.trim() || null,
                });
            }
            venuePortalSafeGoBack(navigation);
        } catch (e) {
            Alert.alert('Error', formatSupabaseError(e));
        } finally {
            setSaving(false);
        }
    };

    const renderDayChip = (d: { key: string; label: string }) => {
        const on = activeDays.includes(d.key);
        return (
            <TouchableOpacity
                key={d.key}
                style={[styles.dayChip, on && styles.dayChipOn]}
                onPress={() => toggleDay(d.key)}
                activeOpacity={0.85}
            >
                <Text style={[styles.dayChipTxt, on && styles.dayChipTxtOn]}>{d.label}</Text>
            </TouchableOpacity>
        );
    };

    if (venueLoading && !venueId) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={MOCKUP_GOLD} />
            </View>
        );
    }

    if (!venueId) {
        return (
            <View style={styles.center}>
                <Text style={styles.muted}>No venue linked.</Text>
            </View>
        );
    }

    if (mode === 'edit' && ticketId && isLoading && !existing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={MOCKUP_GOLD} />
                <Text style={styles.muted}>Loading ticket…</Text>
            </View>
        );
    }

    if (mode === 'edit' && ticketId && !isLoading && !existing) {
        return (
            <View style={styles.center}>
                <Text style={styles.muted}>Ticket not found.</Text>
                <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
                    <Text style={styles.btnText}>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.fill}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
                <TouchableOpacity onPress={() => venuePortalSafeGoBack(navigation)} hitSlop={14} style={styles.backBtn}>
                    <Icon name="chevron-back" size={28} color={VP.gold} />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>
                    {mode === 'create' ? 'Create Ticket Type' : 'Edit Ticket Type'}
                </Text>
                <Text style={styles.pageSubtitle}>
                    {mode === 'create'
                        ? 'Add a new ticket for your venue'
                        : 'Update this ticket type for your venue'}
                </Text>
            </View>
            <View style={VP_PARTITION_LINE} />

            <ScrollView
                contentContainerStyle={[styles.scroll, { paddingBottom: 24 + insets.bottom }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.fieldLabel}>
                    Ticket Name <Text style={styles.asterisk}>*</Text>
                </Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g., VIP Entry"
                    placeholderTextColor={VP.muted}
                />

                <View style={styles.priceQtyRow}>
                    <View style={styles.priceQtyCol}>
                        <Text style={styles.fieldLabel}>Price ($)</Text>
                        <TextInput
                            style={styles.input}
                            value={price}
                            onChangeText={setPrice}
                            keyboardType="decimal-pad"
                            placeholder="75"
                            placeholderTextColor={VP.muted}
                        />
                    </View>
                    <View style={styles.priceQtyCol}>
                        <Text style={styles.fieldLabel}>
                            Available Quantity <Text style={styles.asterisk}>*</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={quantity}
                            onChangeText={setQuantity}
                            keyboardType="number-pad"
                            placeholder="100"
                            placeholderTextColor={VP.muted}
                        />
                    </View>
                </View>

                <Text style={styles.fieldLabel}>Ticket Type</Text>
                <TouchableOpacity style={styles.typeDropdown} onPress={() => setTypePickerOpen(true)} activeOpacity={0.85}>
                    <Text style={styles.typeDropdownText} numberOfLines={2}>
                        {ticketTypeLabel}
                    </Text>
                    <Icon name="chevron-down" size={22} color={VP.muted} />
                </TouchableOpacity>

                {ticketType === 'regular' ? (
                    <>
                        <Text style={styles.fieldLabel}>Active Days (which days this ticket is valid)</Text>
                        <View style={styles.dayRow}>{DAY_ROW_MAIN.map(renderDayChip)}</View>
                        <View style={styles.dayRow}>{DAY_ROW_SUN.map(renderDayChip)}</View>
                        <Text style={styles.helperText}>Select which days of the week this ticket type is available</Text>
                    </>
                ) : (
                    <>
                        <Text style={styles.fieldLabel}>Specific dates (yyyy-MM-dd, comma-separated)</Text>
                        <TextInput
                            style={styles.input}
                            value={specificDatesRaw}
                            onChangeText={setSpecificDatesRaw}
                            placeholder={format(new Date(), 'yyyy-MM-dd')}
                            placeholderTextColor={VP.muted}
                            autoCapitalize="none"
                        />
                    </>
                )}

                {mode === 'edit' ? (
                    <>
                        <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Status</Text>
                        <View style={styles.statusRow}>
                            {STATUS_OPTS.map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.statusChip, status === s && styles.statusChipOn]}
                                    onPress={() => setStatus(s)}
                                >
                                    <Text style={[styles.statusChipTxt, status === s && styles.statusChipTxtOn]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                ) : null}

                <Text style={[styles.fieldLabel, { marginTop: 4 }]}>Description</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Describe what's included..."
                    placeholderTextColor={VP.muted}
                    multiline
                    textAlignVertical="top"
                />

                <TouchableOpacity
                    style={[styles.primaryBtn, saving && { opacity: 0.65 }]}
                    onPress={() => void onSave()}
                    disabled={saving}
                    activeOpacity={0.9}
                >
                    {saving ? (
                        <ActivityIndicator color="#000000" />
                    ) : (
                        <Text style={styles.primaryBtnTxt}>{mode === 'create' ? 'Create' : 'Save changes'}</Text>
                    )}
                </TouchableOpacity>

                {mode === 'create' ? (
                    <View style={styles.stepIndicator}>
                        <View style={styles.stepDot} />
                        <View style={styles.stepPill} />
                        <View style={styles.stepDot} />
                        <View style={styles.stepDot} />
                    </View>
                ) : null}
            </ScrollView>

            <Modal visible={typePickerOpen} transparent animationType="fade">
                <Pressable style={styles.typeModalBackdrop} onPress={() => setTypePickerOpen(false)}>
                    <View style={styles.typeModalCard}>
                        {TICKET_TYPE_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                style={styles.typeModalRow}
                                onPress={() => {
                                    setTicketType(opt.value);
                                    setTypePickerOpen(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.typeModalRowText,
                                        ticketType === opt.value && styles.typeModalRowTextOn,
                                    ]}
                                >
                                    {opt.label}
                                </Text>
                                {ticketType === opt.value ? (
                                    <Icon name="checkmark-circle" size={22} color={MOCKUP_GOLD} />
                                ) : null}
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: BG },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
    muted: { color: VP.muted, marginTop: 8 },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    backBtn: {
        alignSelf: 'flex-start',
        marginBottom: 12,
        marginLeft: -4,
    },
    pageTitle: {
        color: VP.text,
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    pageSubtitle: {
        color: VP.muted,
        fontSize: 15,
        fontWeight: '500',
        marginTop: 6,
    },
    scroll: {
        paddingHorizontal: 16,
        paddingTop: 20,
    },
    fieldLabel: {
        color: VP.text,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 10,
    },
    asterisk: { color: MOCKUP_GOLD },
    input: {
        backgroundColor: INPUT_BG,
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: VP.text,
        fontSize: 16,
        marginBottom: 20,
    },
    priceQtyRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 0,
    },
    priceQtyCol: {
        flex: 1,
        minWidth: 0,
    },
    typeDropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: INPUT_BG,
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 20,
        gap: 12,
    },
    typeDropdownText: {
        flex: 1,
        color: VP.text,
        fontSize: 16,
        fontWeight: '600',
    },
    dayRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    dayChip: {
        minWidth: 44,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: DAY_UNSELECTED_BG,
        alignItems: 'center',
    },
    dayChipOn: {
        backgroundColor: MOCKUP_GOLD,
    },
    dayChipTxt: {
        color: VP.text,
        fontSize: 14,
        fontWeight: '700',
    },
    dayChipTxtOn: {
        color: '#000000',
    },
    helperText: {
        color: VP.muted,
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 20,
    },
    textArea: {
        minHeight: 120,
        paddingTop: 14,
    },
    statusRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    statusChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: INPUT_BG,
    },
    statusChipOn: {
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        borderWidth: 1,
        borderColor: MOCKUP_GOLD,
    },
    statusChipTxt: {
        color: VP.muted,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    statusChipTxtOn: {
        color: MOCKUP_GOLD,
    },
    primaryBtn: {
        marginTop: 8,
        backgroundColor: MOCKUP_GOLD,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryBtnTxt: {
        color: '#000000',
        fontWeight: '800',
        fontSize: 17,
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 28,
        marginBottom: 8,
    },
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#444444',
    },
    stepPill: {
        width: 28,
        height: 8,
        borderRadius: 4,
        backgroundColor: MOCKUP_GOLD,
    },
    btn: {
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: INPUT_BG,
        borderRadius: 10,
    },
    btnText: { color: MOCKUP_GOLD, fontWeight: '700' },
    typeModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    typeModalCard: {
        backgroundColor: '#1E1E1E',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: MOCKUP_GOLD,
        overflow: 'hidden',
    },
    typeModalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    typeModalRowText: {
        color: VP.text,
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        paddingRight: 12,
    },
    typeModalRowTextOn: {
        color: MOCKUP_GOLD,
    },
});
