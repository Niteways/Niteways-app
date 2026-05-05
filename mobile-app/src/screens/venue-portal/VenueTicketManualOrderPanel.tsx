import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    FlatList,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { format, parse, isValid } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVenuePortal } from '../../context/VenuePortalContext';
import { useVenueTicketTypes } from '../../hooks/useVenueTicketTypes';
import { useRealtimeTicketPurchases } from '../../hooks/useRealtimeTicketPurchases';
import { VP } from './venuePortalTheme';
import { TableBookingDatePickerModal } from './TableBookingDatePickerModal';

const BG = '#000000';
const SCRIM = 'rgba(0, 0, 0, 0.4)';
const SHEET_MARGIN_TOP_EXTRA = 44;
const SHEET_MARGIN_BOTTOM_EXTRA = 50;
const BORDER_DEFAULT = 'rgba(255, 255, 255, 0.25)';
const BORDER_FOCUS = '#FFCC33';
const GOLD_BTN = '#FFCC33';

const LABEL_FS = 17;
const INPUT_FS = 18;
const TITLE_FS = 20;
const SUBTITLE_FS = 14;
const BTN_FS = 17;

function toDateYmd(s: string): Date {
    const d = parse(s.trim(), 'yyyy-MM-dd', new Date());
    return isValid(d) ? d : new Date();
}

export type VenueTicketManualOrderPanelProps = {
    onClose: () => void;
};

/**
 * Manual order form as an overlay layer (used inside a transparent RN Modal from Ticketing).
 * Keeps the Ticketing screen visible behind the scrim — stack “transparent” cards often do not composite on Android.
 */
export function VenueTicketManualOrderPanel({ onClose }: VenueTicketManualOrderPanelProps) {
    const insets = useSafeAreaInsets();
    const { venueId, loading: venueLoading } = useVenuePortal();
    const { allTickets, refetch: refetchTickets, updateTicket } = useVenueTicketTypes({ venueId });
    const { addPurchase } = useRealtimeTicketPurchases({ venueId });

    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [ticketTypeName, setTicketTypeName] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [eventName, setEventName] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [focusedKey, setFocusedKey] = useState<'guestName' | 'guestEmail' | 'quantity' | 'eventName' | null>(null);
    const [qtyRailVisible, setQtyRailVisible] = useState(false);
    const qtyInputRef = useRef<TextInput>(null);
    const qtyBlurHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const eventDateValue = useMemo(() => toDateYmd(eventDate), [eventDate]);

    const cancelQtyRailHide = () => {
        if (qtyBlurHideRef.current) {
            clearTimeout(qtyBlurHideRef.current);
            qtyBlurHideRef.current = null;
        }
    };

    useEffect(() => {
        void refetchTickets();
    }, [refetchTickets]);

    useEffect(
        () => () => {
            cancelQtyRailHide();
        },
        []
    );

    const selectableNames = allTickets.filter((t) => t.status !== 'hidden').map((t) => t.name);

    const onSubmit = async () => {
        if (!venueId) {
            Alert.alert('Error', 'No venue');
            return;
        }
        if (!guestName.trim() || !ticketTypeName || !eventDate.trim()) {
            Alert.alert('Required', 'Guest name, ticket type, and event date are required.');
            return;
        }
        const selectedTicket = allTickets.find((t) => t.name === ticketTypeName);
        if (!selectedTicket) {
            Alert.alert('Error', 'Pick a ticket type from the list.');
            return;
        }
        const price = Number(selectedTicket.price) || 0;
        const qty = parseInt(quantity, 10) || 1;
        const available = Math.max(0, selectedTicket.quantity - selectedTicket.sold);
        if (qty > available) {
            Alert.alert('Not enough inventory', `Only ${available} ticket(s) left for this type.`);
            return;
        }

        const orderRef = `MP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

        setSaving(true);
        try {
            await addPurchase({
                venue_id: venueId,
                ticket_id: orderRef,
                guest_name: guestName.trim(),
                guest_email: guestEmail.trim() || null,
                guest_id: null,
                ticket_type: ticketTypeName,
                event_name: eventName.trim() || ticketTypeName,
                event_date: eventDate.trim(),
                quantity: qty,
                price,
                status: 'confirmed',
            });
            const newSold = selectedTicket.sold + qty;
            const nextStatus =
                newSold >= selectedTicket.quantity ? 'soldout' : selectedTicket.status;
            await updateTicket(selectedTicket.id, { sold: newSold, status: nextStatus });
            await refetchTickets();
            onClose();
        } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to create order');
        } finally {
            setSaving(false);
        }
    };

    const inputBorder = (key: typeof focusedKey) => {
        const focused = focusedKey === key;
        return focused ? BORDER_FOCUS : BORDER_DEFAULT;
    };

    const bumpQuantity = (delta: number) => {
        const raw = String(quantity).replace(/\D/g, '');
        const q = raw ? parseInt(raw, 10) : 0;
        const base = q > 0 ? q : 1;
        const next = Math.max(1, Math.min(99999, base + delta));
        setQuantity(String(next));
    };

    if (venueLoading && !venueId) {
        return (
            <View style={styles.root}>
                <View style={styles.scrimLayer} />
                <View style={styles.center}>
                    <ActivityIndicator color={VP.gold} />
                </View>
            </View>
        );
    }

    if (!venueId) {
        return (
            <View style={styles.root}>
                <View style={styles.scrimLayer} />
                <View style={styles.center}>
                    <Text style={styles.muted}>No venue linked.</Text>
                </View>
            </View>
        );
    }

    const topGutter = insets.top + SHEET_MARGIN_TOP_EXTRA;
    const bottomGutter = insets.bottom + SHEET_MARGIN_BOTTOM_EXTRA;

    return (
        <View style={styles.root}>
            <View style={styles.scrimLayer} />
            <View
                style={[
                    styles.sheet,
                    {
                        marginTop: topGutter,
                        marginBottom: bottomGutter,
                    },
                ]}
            >
                <View style={styles.header}>
                    <View style={styles.headerSide} />
                    <View style={styles.headerCenter}>
                        <Text style={styles.hTitle}>Create Manual Order</Text>
                        <Text style={styles.hSubtitle}>Add a ticket order manually with real-time sync</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.headerSide} accessibilityLabel="Close">
                        <Icon name="close" size={26} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <Text style={[styles.lbl, styles.lblFirst]}>
                        Guest Name <Text style={styles.req}>*</Text>
                    </Text>
                    <TextInput
                        style={[styles.input, { borderColor: inputBorder('guestName') }]}
                        value={guestName}
                        onChangeText={setGuestName}
                        placeholder="Enter guest name"
                        placeholderTextColor={VP.muted}
                        onFocus={() => setFocusedKey('guestName')}
                        onBlur={() => setFocusedKey(null)}
                    />

                    <Text style={styles.lbl}>Guest Email</Text>
                    <TextInput
                        style={[styles.input, { borderColor: inputBorder('guestEmail') }]}
                        value={guestEmail}
                        onChangeText={setGuestEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholder="guest@email.com"
                        placeholderTextColor={VP.muted}
                        onFocus={() => setFocusedKey('guestEmail')}
                        onBlur={() => setFocusedKey(null)}
                    />

                    <Text style={styles.lbl}>
                        Ticket Type <Text style={styles.req}>*</Text>
                    </Text>
                    <TouchableOpacity
                        style={[styles.inputLike, { borderColor: pickerOpen ? BORDER_FOCUS : BORDER_DEFAULT }]}
                        onPress={() => setPickerOpen(true)}
                        activeOpacity={0.85}
                    >
                        <Text style={ticketTypeName ? styles.inputTxt : styles.selectPlaceholder} numberOfLines={1}>
                            {ticketTypeName || 'Select ticket type'}
                        </Text>
                        <Icon name="chevron-down" size={22} color={VP.muted} />
                    </TouchableOpacity>

                    <View style={styles.row2}>
                        <View style={styles.row2Qty}>
                            <Text style={styles.lbl}>Quantity</Text>
                            <View style={[styles.qtyStepperBox, { borderColor: inputBorder('quantity') }]}>
                                <TextInput
                                    ref={qtyInputRef}
                                    style={styles.qtyStepperInput}
                                    value={quantity}
                                    onChangeText={(t) => setQuantity(t.replace(/[^0-9]/g, ''))}
                                    keyboardType="number-pad"
                                    underlineColorAndroid="transparent"
                                    onFocus={() => {
                                        cancelQtyRailHide();
                                        setFocusedKey('quantity');
                                        setQtyRailVisible(true);
                                    }}
                                    onBlur={() => {
                                        setFocusedKey(null);
                                        if (!quantity.trim() || parseInt(quantity, 10) < 1) {
                                            setQuantity('1');
                                        }
                                        cancelQtyRailHide();
                                        qtyBlurHideRef.current = setTimeout(() => {
                                            setQtyRailVisible(false);
                                            qtyBlurHideRef.current = null;
                                        }, 280);
                                    }}
                                />
                                {qtyRailVisible ? (
                                    <View style={styles.qtyStepperRail}>
                                        <TouchableOpacity
                                            style={styles.qtyStepBtn}
                                            onPressIn={cancelQtyRailHide}
                                            onPress={() => bumpQuantity(1)}
                                            hitSlop={10}
                                            accessibilityLabel="Increase quantity"
                                        >
                                            <Icon name="chevron-up" size={11} color="#6B7280" />
                                        </TouchableOpacity>
                                        <View style={styles.qtyStepDivider} />
                                        <TouchableOpacity
                                            style={styles.qtyStepBtn}
                                            onPressIn={cancelQtyRailHide}
                                            onPress={() => bumpQuantity(-1)}
                                            hitSlop={10}
                                            accessibilityLabel="Decrease quantity"
                                        >
                                            <Icon name="chevron-down" size={11} color="#6B7280" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.qtyStepperExpandTap}
                                        onPress={() => {
                                            cancelQtyRailHide();
                                            setQtyRailVisible(true);
                                            qtyInputRef.current?.focus();
                                        }}
                                        activeOpacity={1}
                                        accessibilityLabel="Open quantity stepper"
                                    >
                                        <View style={styles.qtyStepperExpandTapHit} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                        <View style={styles.row2Date}>
                            <Text style={styles.lbl}>
                                Event Date <Text style={styles.req}>*</Text>
                            </Text>
                            <TouchableOpacity
                                style={[
                                    styles.inputLike,
                                    styles.dateField,
                                    { borderColor: datePickerOpen ? BORDER_FOCUS : BORDER_DEFAULT },
                                ]}
                                onPress={() => setDatePickerOpen(true)}
                                activeOpacity={0.85}
                            >
                                <Icon name="calendar-outline" size={22} color="#FFFFFF" />
                                <Text style={styles.dateFieldTxt}>{format(eventDateValue, 'MMM d')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={styles.lbl}>Event Name</Text>
                    <TextInput
                        style={[styles.input, { borderColor: inputBorder('eventName') }]}
                        value={eventName}
                        onChangeText={setEventName}
                        placeholder="e.g., Friday Night Party"
                        placeholderTextColor={VP.muted}
                        onFocus={() => setFocusedKey('eventName')}
                        onBlur={() => setFocusedKey(null)}
                    />

                    <TouchableOpacity
                        style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
                        onPress={() => void onSubmit()}
                        disabled={saving}
                        activeOpacity={0.92}
                    >
                        {saving ? (
                            <ActivityIndicator color="#000000" />
                        ) : (
                            <Text style={styles.primaryBtnTxt}>+ Create Order</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.85}>
                        <Text style={styles.cancelBtnTxt}>Cancel</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <Modal visible={pickerOpen} transparent animationType="fade">
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerOpen(false)}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Ticket type</Text>
                        <FlatList
                            data={selectableNames}
                            keyExtractor={(item) => item}
                            style={{ maxHeight: 320 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.modalRow}
                                    onPress={() => {
                                        setTicketTypeName(item);
                                        setPickerOpen(false);
                                    }}
                                >
                                    <Text style={styles.modalRowTxt}>{item}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.muted}>Create ticket types first.</Text>}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

            <TableBookingDatePickerModal
                visible={datePickerOpen}
                anchor={null}
                value={eventDateValue}
                onClose={() => setDatePickerOpen(false)}
                onChange={(d) => setEventDate(format(d, 'yyyy-MM-dd'))}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrimLayer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: SCRIM,
    },
    sheet: {
        flex: 1,
        borderRadius: 20,
        backgroundColor: BG,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        zIndex: 1,
        ...Platform.select({ android: { elevation: 6 }, ios: {} }),
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
    muted: { color: VP.muted, padding: 16 },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 8,
        paddingTop: 10,
        paddingBottom: 12,
    },
    headerSide: {
        width: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 2,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    hTitle: {
        color: '#FFFFFF',
        fontSize: TITLE_FS,
        fontWeight: '800',
        textAlign: 'center',
    },
    hSubtitle: {
        color: VP.muted,
        fontSize: SUBTITLE_FS,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 20,
        paddingHorizontal: 8,
    },
    scroll: {
        paddingHorizontal: 16,
        paddingBottom: 28 + (Platform.OS === 'ios' ? 8 : 0),
        flexGrow: 1,
    },
    lbl: {
        color: '#FFFFFF',
        fontSize: LABEL_FS,
        fontWeight: '700',
        marginBottom: 8,
        marginTop: 16,
    },
    lblFirst: {
        marginTop: 4,
    },
    req: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    input: {
        backgroundColor: BG,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
        color: '#FFFFFF',
        fontSize: INPUT_FS,
        fontWeight: '600',
        borderWidth: 1,
        minHeight: 50,
    },
    inputLike: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: BG,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
        borderWidth: 1,
        minHeight: 50,
    },
    dateField: {
        justifyContent: 'flex-start',
        gap: 10,
        alignSelf: 'stretch',
    },
    dateFieldTxt: {
        color: '#FFFFFF',
        fontSize: INPUT_FS,
        fontWeight: '600',
        flex: 1,
    },
    inputTxt: {
        color: '#FFFFFF',
        fontSize: INPUT_FS,
        fontWeight: '600',
        flex: 1,
    },
    selectPlaceholder: {
        color: 'rgba(255, 255, 255, 0.72)',
        fontSize: INPUT_FS,
        fontWeight: '600',
        flex: 1,
    },
    qtyStepperBox: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 50,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        backgroundColor: BG,
    },
    qtyStepperInput: {
        flex: 1,
        alignSelf: 'stretch',
        minWidth: 0,
        paddingLeft: 14,
        paddingRight: 6,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
        color: '#FFFFFF',
        fontSize: INPUT_FS,
        fontWeight: '600',
        backgroundColor: BG,
        borderWidth: 0,
        textAlign: 'left',
    },
    /** Fixed compact “native spinner” proportions: taller-than-wide capsule. */
    qtyStepperRail: {
        width: 22,
        height: 26,
        alignSelf: 'center',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        borderRadius: 0,
        marginVertical: 12,
        marginRight: 8,
    },
    qtyStepBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyStepDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(0,0,0,0.14)',
    },
    /** Invisible hit area — reveals stepper on tap (no visible chrome until then). */
    qtyStepperExpandTap: {
        alignSelf: 'center',
        marginVertical: 12,
        marginRight: 8,
    },
    qtyStepperExpandTapHit: {
        width: 28,
        height: 26,
        backgroundColor: 'transparent',
    },
    row2: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
    },
    row2Qty: {
        width: 156,
        flexShrink: 0,
    },
    row2Date: {
        flex: 1,
        minWidth: 0,
    },
    primaryBtn: {
        marginTop: 28,
        backgroundColor: GOLD_BTN,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnTxt: {
        color: '#000000',
        fontWeight: '400',
        fontSize: BTN_FS,
    },
    cancelBtn: {
        marginTop: 12,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: BORDER_DEFAULT,
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    cancelBtnTxt: {
        color: '#FFFFFF',
        fontWeight: '400',
        fontSize: BTN_FS,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        padding: 24,
    },
    modalCard: {
        backgroundColor: VP.card,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: VP.cardBorder,
    },
    modalTitle: { color: VP.text, fontWeight: '800', fontSize: 16, marginBottom: 8, paddingHorizontal: 8 },
    modalRow: {
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    modalRowTxt: { color: VP.text, fontSize: 16 },
});
