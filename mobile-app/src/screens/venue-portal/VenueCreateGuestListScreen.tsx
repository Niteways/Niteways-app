import React, { useState, useCallback, useMemo, useRef } from 'react';
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
    Platform,
    KeyboardAvoidingView,
    Pressable,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type { StackNavigationProp } from '@react-navigation/stack';
import { format } from 'date-fns';
import { useVenuePortal } from '../../context/VenuePortalContext';
import { useRealtimeGuestLists } from '../../hooks/useRealtimeGuestLists';
import { VP } from './venuePortalTheme';
import type { VenuePortalStackParamList } from './venuePortalTypes';
import { venuePortalSafeGoBack } from './venuePortalNavigation';
import { TableBookingDatePickerModal, type DatePickerAnchor } from './TableBookingDatePickerModal';

type Nav = StackNavigationProp<VenuePortalStackParamList, 'VenueCreateGuestList'>;

const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const FIELD_RADIUS = 12;
const BORDER_SUBTLE = 'rgba(255,255,255,0.14)';

/** Brighter yellow + black label text (matches reference web mock, not muted amber). */
const CREATE_GOLD = '#FACC15';

/** Reset Time UI — match reference (black screen, #1C1C1E fields, anchored white picker). */
const RT = {
    screenBg: '#000000',
    inputBg: '#1C1C1E',
    inputBorder: '#38383A',
    inputRadius: 10,
    label: '#FFFFFF',
    inputText: '#FFFFFF',
    icon: '#FFFFFF',
    pickerBg: '#FFFFFF',
    pickerBorder: '#E8E8ED',
    highlight: '#D4D4D4',
    pickerText: '#000000',
    /** Subtle column rules (reference: lighter than current). */
    divider: 'rgba(0,0,0,0.08)',
} as const;

function resetTimeTo12hLabel(t: string): string {
    const s = t.trim();
    const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s);
    if (!m) return '03:00 AM';
    const h24 = Math.min(23, Math.max(0, parseInt(m[1], 10)));
    const min = m[2].padStart(2, '0');
    const ref = new Date();
    ref.setHours(h24, parseInt(min, 10) || 0, 0, 0);
    return format(ref, 'hh:mm a');
}

const WHEEL_ITEM_H = 32;
const WHEEL_VISIBLE_ROWS = 5;
const WHEEL_PAD = ((WHEEL_VISIBLE_ROWS - 1) / 2) * WHEEL_ITEM_H;
const TIME_WHEEL_HEIGHT = WHEEL_VISIBLE_ROWS * WHEEL_ITEM_H;
/** Extend picker slightly past field width; keep right edge aligned with Reset Time field. */
const PICKER_WIDTH_EXTRA = 18;

const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')) as readonly string[];
const MINUTES_00_59 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')) as readonly string[];
const PERIODS = ['AM', 'PM'] as const;
type Period = (typeof PERIODS)[number];

function parseResetTime24(s: string): { h: number; m: number } {
    const m = /^(\d{1,2}):(\d{2})/.exec(s.trim());
    if (!m) return { h: 3, m: 0 };
    return {
        h: Math.min(23, Math.max(0, parseInt(m[1], 10))),
        m: Math.min(59, Math.max(0, parseInt(m[2], 10))),
    };
}

function to12From24(h24: number, minute: number): { h12: number; ap: Period } {
    const ap: Period = h24 >= 12 ? 'PM' : 'AM';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return { h12, ap };
}

type TimeFieldAnchor = { x: number; y: number; width: number; height: number };

function dropdownTopForAnchor(anchor: TimeFieldAnchor, pickerHeight: number, gap = 2): number {
    const { height: winH } = Dimensions.get('window');
    const below = anchor.y + anchor.height + gap;
    if (below + pickerHeight > winH - 24 && anchor.y > pickerHeight + gap + 24) {
        return anchor.y - pickerHeight - gap;
    }
    return below;
}

/** Right-align dropdown to field’s right edge; widen slightly vs field (reference). */
function dropdownLayoutForAnchor(anchor: TimeFieldAnchor): { left: number; width: number } {
    const { width: winW } = Dimensions.get('window');
    const margin = 10;
    const targetW = Math.min(anchor.width + PICKER_WIDTH_EXTRA, winW - margin * 2);
    let left = anchor.x + anchor.width - targetW;
    left = Math.max(margin, Math.min(left, winW - targetW - margin));
    return { left, width: targetW };
}

function to24HourString(h12: number, minute: number, ap: Period): string {
    let h24: number;
    if (ap === 'AM') {
        h24 = h12 === 12 ? 0 : h12;
    } else {
        h24 = h12 === 12 ? 12 : h12 + 12;
    }
    return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function TimeWheelColumn({
    data,
    value,
    onPick,
    textAlign,
}: {
    data: readonly string[];
    value: string;
    onPick: (v: string) => void;
    textAlign: 'left' | 'center' | 'right';
}) {
    const scrollRef = useRef<ScrollView>(null);
    const index = Math.max(0, data.indexOf(value));

    const scrollToIndex = (i: number, animated: boolean) => {
        const y = Math.max(0, Math.min(data.length - 1, i)) * WHEEL_ITEM_H;
        scrollRef.current?.scrollTo({ y, animated });
    };

    return (
        <View style={[timeWheelStyles.colWrap, { height: TIME_WHEEL_HEIGHT }]}>
            <View pointerEvents="none" style={timeWheelStyles.selectionBand} />
            <ScrollView
                ref={scrollRef}
                style={[timeWheelStyles.wheelScroll, { height: TIME_WHEEL_HEIGHT }]}
                showsVerticalScrollIndicator={false}
                snapToInterval={WHEEL_ITEM_H}
                snapToAlignment="start"
                decelerationRate="fast"
                nestedScrollEnabled
                bounces={false}
                contentContainerStyle={timeWheelStyles.wheelContent}
                onMomentumScrollEnd={(e) => {
                    const y = e.nativeEvent.contentOffset.y;
                    const i = Math.round(y / WHEEL_ITEM_H);
                    const clamped = Math.max(0, Math.min(data.length - 1, i));
                    onPick(data[clamped]);
                }}
                onLayout={() => scrollToIndex(index, false)}
            >
                {data.map((item) => (
                    <View
                        key={item}
                        style={[
                            timeWheelStyles.wheelItem,
                            textAlign === 'left' && timeWheelStyles.wheelItemLeft,
                            textAlign === 'right' && timeWheelStyles.wheelItemRight,
                        ]}
                    >
                        <Text
                            style={[
                                timeWheelStyles.wheelItemText,
                                { textAlign, color: RT.pickerText },
                            ]}
                        >
                            {item}
                        </Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const timeWheelStyles = StyleSheet.create({
    colWrap: {
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: RT.pickerBg,
    },
    /** Thin sharp blocks per column (reference). */
    selectionBand: {
        position: 'absolute',
        left: 4,
        right: 4,
        top: WHEEL_PAD + 1,
        height: WHEEL_ITEM_H - 2,
        backgroundColor: RT.highlight,
        borderRadius: 0,
        zIndex: 0,
    },
    wheelScroll: {
        zIndex: 1,
        backgroundColor: 'transparent',
    },
    wheelContent: {
        paddingTop: WHEEL_PAD,
        paddingBottom: WHEEL_PAD,
    },
    wheelItem: {
        height: WHEEL_ITEM_H,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 4,
    },
    wheelItemLeft: {
        alignItems: 'flex-start',
        paddingLeft: 10,
        paddingRight: 4,
    },
    wheelItemRight: {
        alignItems: 'flex-end',
        paddingRight: 10,
        paddingLeft: 4,
    },
    wheelItemText: {
        fontSize: 14,
        fontWeight: '500',
        width: '100%',
    },
});

export default function VenueCreateGuestListScreen({ navigation }: { navigation: Nav }) {
    const { venueId } = useVenuePortal();
    const { createRecurringList, createOneDayList } = useRealtimeGuestLists({ venueId });

    const [listType, setListType] = useState<'recurring' | 'oneday'>('recurring');
    const [listName, setListName] = useState('');
    const [dayOfWeek, setDayOfWeek] = useState('Wednesday');
    const [resetTime, setResetTime] = useState('03:00');
    const [eventDate, setEventDate] = useState(() => new Date());
    const [submitting, setSubmitting] = useState(false);
    const [dayModalOpen, setDayModalOpen] = useState(false);
    const [timeModalOpen, setTimeModalOpen] = useState(false);
    const [timeWheelKey, setTimeWheelKey] = useState(0);
    const [pickH12, setPickH12] = useState(3);
    const [pickMin, setPickMin] = useState(0);
    const [pickAp, setPickAp] = useState<Period>('AM');
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [dateAnchor, setDateAnchor] = useState<DatePickerAnchor | null>(null);
    const [timeFieldAnchor, setTimeFieldAnchor] = useState<TimeFieldAnchor | null>(null);
    const timeFieldRef = useRef<View>(null);

    const dateLabel = format(eventDate, 'MMMM do, yyyy');
    const dateStr = format(eventDate, 'yyyy-MM-dd');
    const resetTimeLabel = useMemo(() => resetTimeTo12hLabel(resetTime), [resetTime]);

    const openDatePicker = useCallback(() => {
        setDateAnchor({ x: 24, y: 280, width: 200, height: 48 });
        setDatePickerOpen(true);
    }, []);

    const closeTimeDropdown = useCallback(() => {
        setResetTime(to24HourString(pickH12, pickMin, pickAp));
        setTimeModalOpen(false);
        setTimeFieldAnchor(null);
    }, [pickH12, pickMin, pickAp]);

    const openTimeModal = () => {
        const { h, m } = parseResetTime24(resetTime);
        const p = to12From24(h, m);
        setPickH12(p.h12);
        setPickMin(m);
        setPickAp(p.ap);
        setTimeWheelKey((k) => k + 1);
        requestAnimationFrame(() => {
            timeFieldRef.current?.measureInWindow((x, y, width, height) => {
                setTimeFieldAnchor({ x, y, width, height });
                setTimeModalOpen(true);
            });
        });
    };

    const handleCreate = async () => {
        if (!venueId) {
            Alert.alert('No venue', 'Link a venue before creating a guest list.');
            return;
        }
        if (!listName.trim()) {
            Alert.alert('Name required', 'Enter a name for this list.');
            return;
        }
        setSubmitting(true);
        try {
            if (listType === 'recurring') {
                const row = await createRecurringList(listName.trim(), dayOfWeek, resetTime.trim() || '03:00');
                if (!row) {
                    Alert.alert('Could not create', 'Check your connection and try again.');
                    return;
                }
            } else {
                const row = await createOneDayList(listName.trim(), dateStr);
                if (!row) {
                    Alert.alert('Could not create', 'Check your connection and try again.');
                    return;
                }
            }
            navigation.goBack();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => venuePortalSafeGoBack(navigation)} hitSlop={12} style={styles.headerBtn}>
                        <Icon name="chevron-back" size={26} color={VP.gold} />
                    </TouchableOpacity>
                    <View style={styles.headerTitles}>
                        <Text style={styles.headerTitle}>Create Guest List</Text>
                        <Text style={styles.headerSub}>
                            Create a new guest list - recurring weekly or for a specific date.
                        </Text>
                    </View>
                    <View style={styles.headerBtn} />
                </View>

                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <Text style={[styles.label, styles.labelFirst]}>List Type</Text>
                    <View style={styles.typeRow}>
                        <TouchableOpacity
                            style={[styles.typeBtn, listType === 'recurring' && styles.typeBtnOn]}
                            onPress={() => setListType('recurring')}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.typeBtnText, listType === 'recurring' && styles.typeBtnTextOn]}>
                                Recurring
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeBtn, listType === 'oneday' && styles.typeBtnOn]}
                            onPress={() => setListType('oneday')}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.typeBtnText, listType === 'oneday' && styles.typeBtnTextOn]}>
                                One Day
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>List Name</Text>
                    <TextInput
                        style={styles.input}
                        value={listName}
                        onChangeText={setListName}
                        placeholder="e.g., NYE Special"
                        placeholderTextColor={VP.muted}
                    />

                    {listType === 'recurring' ? (
                        <View style={styles.twoCol}>
                            <View style={styles.col}>
                                <Text style={[styles.label, styles.labelInGrid]}>Day of Week</Text>
                                <TouchableOpacity style={styles.selectField} onPress={() => setDayModalOpen(true)}>
                                    <Text style={styles.selectFieldText} numberOfLines={1}>
                                        {dayOfWeek}
                                    </Text>
                                    <Icon name="chevron-down" size={18} color="rgba(255,255,255,0.55)" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.col}>
                                <Text style={[styles.label, styles.labelInGrid]}>Reset Time</Text>
                                <View ref={timeFieldRef} collapsable={false} style={styles.timeFieldMeasure}>
                                    <TouchableOpacity style={styles.selectFieldTime} onPress={openTimeModal} activeOpacity={0.85}>
                                        <Text style={styles.selectFieldTimeText} numberOfLines={1}>
                                            {resetTimeLabel}
                                        </Text>
                                        <Icon name="time-outline" size={20} color={RT.icon} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.label}>Event date</Text>
                            <TouchableOpacity style={styles.selectField} onPress={openDatePicker}>
                                <Text style={styles.selectFieldText}>{dateLabel}</Text>
                                <Icon name="calendar-outline" size={22} color={VP.muted} />
                            </TouchableOpacity>
                            <TableBookingDatePickerModal
                                visible={datePickerOpen && dateAnchor != null}
                                anchor={dateAnchor}
                                value={eventDate}
                                onClose={() => {
                                    setDatePickerOpen(false);
                                    setDateAnchor(null);
                                }}
                                onChange={setEventDate}
                            />
                        </>
                    )}
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => venuePortalSafeGoBack(navigation)}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.createBtn, (!listName.trim() || submitting) && styles.createBtnDisabled]}
                        onPress={handleCreate}
                        disabled={!listName.trim() || submitting}
                    >
                        <Text style={styles.createBtnText}>{submitting ? 'Creating…' : 'Create list'}</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <Modal visible={dayModalOpen} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDayModalOpen(false)}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Day of week</Text>
                        <FlatList
                            data={DAY_OPTIONS}
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
                                        <Icon name="checkmark" size={20} color={CREATE_GOLD} />
                                    ) : null}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal
                visible={timeModalOpen && timeFieldAnchor != null}
                transparent
                animationType="fade"
                onRequestClose={closeTimeDropdown}
            >
                <View style={styles.timeDropdownOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeTimeDropdown} />
                    {timeFieldAnchor ? (
                        <View
                            key={timeWheelKey}
                            style={[
                                styles.timeDropdownPanel,
                                {
                                    ...dropdownLayoutForAnchor(timeFieldAnchor),
                                    top: dropdownTopForAnchor(timeFieldAnchor, TIME_WHEEL_HEIGHT),
                                },
                            ]}
                            pointerEvents="box-none"
                        >
                            <View style={styles.timeWheelPanel} pointerEvents="auto">
                                <View style={styles.timeWheelRow}>
                                    <View style={styles.timeWheelColHours}>
                                        <TimeWheelColumn
                                            data={HOURS_12}
                                            value={String(pickH12).padStart(2, '0')}
                                            onPick={(s) => setPickH12(parseInt(s, 10) || 1)}
                                            textAlign="left"
                                        />
                                    </View>
                                    <View style={styles.timeWheelDivider} />
                                    <View style={styles.timeWheelColMinutes}>
                                        <TimeWheelColumn
                                            data={MINUTES_00_59}
                                            value={String(pickMin).padStart(2, '0')}
                                            onPick={(s) => setPickMin(parseInt(s, 10) || 0)}
                                            textAlign="center"
                                        />
                                    </View>
                                    <View style={styles.timeWheelDivider} />
                                    <View style={styles.timeWheelColPeriod}>
                                        <TimeWheelColumn
                                            data={PERIODS}
                                            value={pickAp}
                                            onPick={(s) => setPickAp(s === 'PM' ? 'PM' : 'AM')}
                                            textAlign="right"
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>
                    ) : null}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: RT.screenBg },
    flex: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitles: { flex: 1 },
    headerTitle: { color: VP.text, fontSize: 23, fontWeight: '800' },
    headerSub: {
        color: 'rgba(255,255,255,0.62)',
        fontSize: 14,
        lineHeight: 19,
        marginTop: 6,
    },
    scroll: { padding: 20, paddingBottom: 32 },
    label: {
        color: VP.text,
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 10,
        marginTop: 20,
    },
    labelFirst: { marginTop: 6 },
    labelInGrid: { marginTop: 0 },
    typeRow: { flexDirection: 'row', gap: 12 },
    typeBtn: {
        flex: 1,
        height: 50,
        borderRadius: FIELD_RADIUS,
        borderWidth: 1,
        borderColor: RT.inputBorder,
        backgroundColor: RT.inputBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeBtnOn: { backgroundColor: CREATE_GOLD, borderColor: CREATE_GOLD },
    typeBtnText: { color: VP.text, fontSize: 16, fontWeight: '700' },
    typeBtnTextOn: { color: '#000000' },
    input: {
        backgroundColor: RT.inputBg,
        borderWidth: 1,
        borderColor: RT.inputBorder,
        borderRadius: RT.inputRadius,
        paddingHorizontal: 16,
        height: 50,
        color: RT.inputText,
        fontSize: 16,
        fontWeight: '500',
    },
    twoCol: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 22,
    },
    col: { flex: 1, minWidth: 0 },
    selectField: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: RT.inputBg,
        borderWidth: 1,
        borderColor: RT.inputBorder,
        borderRadius: RT.inputRadius,
        paddingHorizontal: 16,
        height: 50,
    },
    selectFieldText: { color: VP.text, fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
    selectFieldTimeText: {
        color: RT.inputText,
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
        marginRight: 8,
    },
    timeFieldMeasure: {
        alignSelf: 'stretch',
    },
    selectFieldTime: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        alignSelf: 'stretch',
        backgroundColor: RT.inputBg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.38)',
        borderRadius: RT.inputRadius,
        paddingHorizontal: 16,
        height: 50,
    },
    timeDropdownOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    timeDropdownPanel: {
        position: 'absolute',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 28 : 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255,255,255,0.08)',
    },
    cancelBtn: {
        flex: 1,
        height: 54,
        borderRadius: FIELD_RADIUS,
        borderWidth: 1,
        borderColor: BORDER_SUBTLE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnText: { color: VP.text, fontWeight: '700', fontSize: 16 },
    createBtn: {
        flex: 1,
        height: 54,
        borderRadius: FIELD_RADIUS,
        backgroundColor: CREATE_GOLD,
        alignItems: 'center',
        justifyContent: 'center',
    },
    createBtnDisabled: { opacity: 0.45 },
    createBtnText: { color: '#000000', fontWeight: '800', fontSize: 16 },
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
    modalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    modalRowText: { color: VP.text, fontSize: 16, fontWeight: '600' },
    timeWheelPanel: {
        backgroundColor: RT.pickerBg,
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: RT.pickerBorder,
        ...Platform.select({
            android: { elevation: 12 },
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.18,
                shadowRadius: 6,
            },
        }),
    },
    timeWheelRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        minHeight: TIME_WHEEL_HEIGHT,
    },
    timeWheelColHours: { flex: 1.2, minWidth: 0, minHeight: TIME_WHEEL_HEIGHT },
    timeWheelColMinutes: { flex: 1, minWidth: 0, minHeight: TIME_WHEEL_HEIGHT },
    timeWheelColPeriod: { flex: 0.88, minWidth: 52, maxWidth: 72, minHeight: TIME_WHEEL_HEIGHT },
    timeWheelDivider: {
        width: StyleSheet.hairlineWidth,
        backgroundColor: RT.divider,
        marginVertical: 4,
    },
});
