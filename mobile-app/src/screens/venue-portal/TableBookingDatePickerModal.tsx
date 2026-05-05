import React, { useEffect, useMemo, useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    Platform,
    useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VP } from './venuePortalTheme';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Flush under the date row (no vertical gap) */
const GAP_BELOW_FIELD = 0;
/** Minimal side inset — grid uses full width inside this */
const CARD_PAD_H = 4;
/** Extra slack before we flip above the field (overestimated height was opening upward too often) */
const FLIP_OVERFLOW_SLACK = 28;
const SCREEN_EDGE = 16;
/** Max width when no anchor — modestly larger than before (~8%). */
const CALENDAR_FALLBACK_MAX_W = 300;

export type DatePickerAnchor = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type Props = {
    visible: boolean;
    anchor: DatePickerAnchor | null;
    value: Date;
    onClose: () => void;
    onChange: (d: Date) => void;
};

export function TableBookingDatePickerModal({ visible, anchor, value, onClose, onChange }: Props) {
    const { width: winW, height: winH } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const [viewMonth, setViewMonth] = useState(() => startOfMonth(value));

    useEffect(() => {
        if (visible) setViewMonth(startOfMonth(value));
    }, [visible, value]);

    const gridDays = useMemo(() => {
        const m0 = startOfMonth(viewMonth);
        const m1 = endOfMonth(viewMonth);
        const from = startOfWeek(m0, { weekStartsOn: 0 });
        const to = endOfWeek(m1, { weekStartsOn: 0 });
        return eachDayOfInterval({ start: from, end: to });
    }, [viewMonth]);

    const rows = useMemo(() => {
        const r: Date[][] = [];
        for (let i = 0; i < gridDays.length; i += 7) {
            r.push(gridDays.slice(i, i + 7));
        }
        return r;
    }, [gridDays]);

    const cardLayout = useMemo(() => {
        if (!anchor) {
            const width = Math.min(CALENDAR_FALLBACK_MAX_W, winW - SCREEN_EDGE * 2);
            const inner = width - CARD_PAD_H * 2;
            const cell = Math.max(25, Math.floor(inner / 7));
            /** Right-align with screen edge (matches Event Date field on the right side of forms). */
            const left = Math.max(SCREEN_EDGE, winW - SCREEN_EDGE - width);
            return { left, top: 120, width, cell, flushWithField: false };
        }
        /** Same left + width as the date field so the sheet continues straight down */
        let left = anchor.x;
        let width = anchor.width;
        const maxRight = winW - SCREEN_EDGE;
        if (left + width > maxRight) {
            width = Math.max(200, maxRight - left);
        }
        if (left < SCREEN_EDGE) {
            const shrink = SCREEN_EDGE - left;
            left = SCREEN_EDGE;
            width = Math.max(200, anchor.width - shrink);
        }
        const inner = width - CARD_PAD_H * 2;
        /** Full-width columns: no max cap (cap was leaving large side gutters on wide date rows) */
        const cell = Math.max(25, Math.floor(inner / 7));
        /** Tight height estimate aligned to reduced padding + row heights (avoids flipping above unnecessarily) */
        const estH =
            16 + // card paddingVertical 8 × 2
            38 + // month header row
            6 + // header marginBottom
            14 + // weekday row
            2 + // weekRow marginBottom
            rows.length * (cell + 2) +
            10; // bottom slack
        /** Top = bottom edge of date box */
        const belowTop = anchor.y + anchor.height + GAP_BELOW_FIELD;
        let top = belowTop;
        let opensBelow = true;
        const maxBottom = winH - Math.max(insets.bottom, 12);
        if (
            belowTop + estH > maxBottom + FLIP_OVERFLOW_SLACK &&
            anchor.y > estH + SCREEN_EDGE
        ) {
            top = Math.max(insets.top + SCREEN_EDGE, anchor.y - estH - GAP_BELOW_FIELD);
            opensBelow = false;
        }
        return { left, top, width, cell, flushWithField: opensBelow };
    }, [anchor, winW, winH, rows.length, insets.top, insets.bottom]);

    const pick = (d: Date) => {
        onChange(d);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <View
                    style={[
                        styles.card,
                        cardLayout.flushWithField && styles.cardFlushBelowField,
                        {
                            position: 'absolute',
                            left: cardLayout.left,
                            top: cardLayout.top,
                            width: cardLayout.width,
                            backgroundColor: VP.bg,
                        },
                    ]}
                >
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.navBtn}
                            onPress={() => setViewMonth((m) => subMonths(m, 1))}
                            hitSlop={12}
                            accessibilityLabel="Previous month"
                        >
                            <Icon name="chevron-back" size={18} color="#B8B8C8" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{format(viewMonth, 'MMMM yyyy')}</Text>
                        <TouchableOpacity
                            style={styles.navBtn}
                            onPress={() => setViewMonth((m) => addMonths(m, 1))}
                            hitSlop={12}
                            accessibilityLabel="Next month"
                        >
                            <Icon name="chevron-forward" size={18} color="#B8B8C8" />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.gridRow, styles.weekGridRow]}>
                        {WEEKDAYS.map((w) => (
                            <Text key={w} style={[styles.weekLabel, styles.gridCell]}>
                                {w}
                            </Text>
                        ))}
                    </View>

                    {rows.map((week, wi) => (
                        <View key={wi} style={styles.gridRow}>
                            {week.map((day) => {
                                const inMonth = isSameMonth(day, viewMonth);
                                const selected = isSameDay(day, value);
                                const label = format(day, 'd');
                                const c = cardLayout.cell;
                                const chip = Math.max(28, Math.min(c - 4, Math.floor(c * 0.72)));
                                return (
                                    <TouchableOpacity
                                        key={day.toISOString()}
                                        style={[styles.dayCell, { flex: 1, minHeight: c + 2 }]}
                                        onPress={() => pick(day)}
                                        activeOpacity={0.75}
                                    >
                                        {selected ? (
                                            <View style={styles.selectedStack}>
                                                <View
                                                    style={[
                                                        styles.selectedBox,
                                                        {
                                                            width: chip,
                                                            height: chip,
                                                            borderRadius: chip * 0.28,
                                                        },
                                                    ]}
                                                >
                                                    <Text style={styles.selectedDayText}>{label}</Text>
                                                </View>
                                            </View>
                                        ) : (
                                            <Text
                                                style={[styles.dayText, !inMonth && styles.dayTextMuted]}
                                            >
                                                {label}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ))}
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    /** No heavy dim — rest of the screen stays visible; tap outside closes */
    backdrop: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    card: {
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: CARD_PAD_H,
        borderWidth: 1,
        borderColor: '#2A2A2A',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.28,
                shadowRadius: 12,
            },
            android: { elevation: 8 },
        }),
    },
    /** Visually continues the date row — no rounded gap between field and calendar */
    cardFlushBelowField: {
        borderTopWidth: 0,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
        paddingHorizontal: 0,
    },
    navBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '800',
    },
    gridRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        alignSelf: 'stretch',
    },
    gridCell: {
        flex: 1,
    },
    weekGridRow: {
        marginBottom: 2,
    },
    weekLabel: {
        textAlign: 'center',
        color: '#8B8B9E',
        fontSize: 12,
        fontWeight: '700',
    },
    dayCell: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayText: {
        color: '#F4F4F5',
        fontSize: 15,
        fontWeight: '700',
    },
    dayTextMuted: {
        color: 'rgba(255,255,255,0.14)',
    },
    selectedStack: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedBox: {
        backgroundColor: '#FFCC33',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FB7185',
    },
    selectedDayText: {
        color: '#111111',
        fontSize: 15,
        fontWeight: '800',
    },
});
