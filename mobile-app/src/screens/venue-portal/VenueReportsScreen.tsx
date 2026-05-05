import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    TextInput,
    Platform,
    Alert,
    Modal,
    ActivityIndicator,
    KeyboardAvoidingView,
    Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
    addDays,
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    format,
    getDay,
    isSameDay,
    isSameMonth,
    isValid,
    parseISO,
    startOfDay,
    startOfMonth,
} from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../config/supabase';
import { useVenuePortal } from '../../context/VenuePortalContext';
import {
    fetchVenueReports,
    fetchVenueReportStats,
    insertVenueReportDraft,
    subscribeVenueActivityLogs,
    type VenueReportRow,
} from '../../services/venueReports';

/**
 * Venue Reports — layout aligned with venue portal reference (stats, Write Report, search, Today / All).
 * Data: Supabase `activity_logs` where entity_type = 'report'.
 */
const BG = '#000000';
const STAT_CARD_BG = '#1A1A1A';
const CARD = '#1C1C1E';
const TEXT = '#FFFFFF';
const MUTED = '#9CA3AF';
const META = '#888888';
const GOLD_BORDER = '#FFD700';
const FILTER_BG = '#2A2A2A';
const RULE = 'rgba(255,255,255,0.08)';
/** Primary CTA + active “Today” chip (reference yellow) */
const YELLOW = '#FFCC33';
const YELLOW_TEXT = '#111111';
const TEAL_STAT = '#26A69A';
const GOLD_STAT = '#FFD700';
/** Write Report form card (darker gray on black shell) */
const FORM_CARD_WRITE = '#1E1E1E';
/** Report date calendar — muted outside-month / weekday row */
const CAL_MUTED = '#757575';
/** Selected day cell fill */
const CAL_SELECTED = '#FFD740';

const REPORT_TIPS = [
    'Include total guest count and VIP attendance',
    'Document any security incidents or guest issues',
    'Note promoter performance and guest referrals',
    'Report any equipment or operational problems',
    'Highlight exceptional staff performance',
];

const { width: SCREEN_W } = Dimensions.get('window');
/** Centered date picker card — capped width so it stays compact */
const DATE_PICKER_PANEL_W = Math.min(SCREEN_W - 48, 320);
const H_PAD = 16;
const STAT_GAP = 10;

type ScopeChip = 'today' | 'all';

type Props = { onBack: () => void };

function formatReportDay(iso: string): string {
    const d = parseISO(iso);
    return isValid(d) ? format(d, 'MMM d') : '—';
}

function initialsFromDisplayName(name: string): string {
    const t = name.trim();
    if (!t) return '??';
    const parts = t.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return t.slice(0, 2).toUpperCase();
}

function roleLabelFromRole(role: string | null | undefined): string {
    if (!role) return 'Member';
    if (role === 'venue_owner') return 'Account Holder';
    return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

/** Full weeks covering `viewMonth`, Sun–Sat grid (for calendar UI). */
function monthCalendarCells(viewMonth: Date): Date[] {
    const first = startOfMonth(viewMonth);
    const last = endOfMonth(viewMonth);
    const gridStart = addDays(first, -getDay(first));
    const padEnd = (6 - getDay(last) + 7) % 7;
    const gridEnd = addDays(last, padEnd);
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

export function VenueReportsScreen({ onBack }: Props) {
    const { venueId, loading: venueLoading, error: venueError, refresh } = useVenuePortal();
    const [query, setQuery] = useState('');
    const [scope, setScope] = useState<ScopeChip>('today');
    const [rows, setRows] = useState<VenueReportRow[]>([]);
    const [stats, setStats] = useState({ total: 0, thisMonth: 0, contributors: 0 });
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [canUseReportsRealtime, setCanUseReportsRealtime] = useState(false);
    const [writeOpen, setWriteOpen] = useState(false);
    const [writeTitle, setWriteTitle] = useState('');
    const [writeBody, setWriteBody] = useState('');
    const [writeSaving, setWriteSaving] = useState(false);
    const [reportDate, setReportDate] = useState(() => new Date());
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [calendarViewMonth, setCalendarViewMonth] = useState(() => new Date());
    const [writerName, setWriterName] = useState('Current User');
    const [writerRole, setWriterRole] = useState('Account Holder');
    const [writerInitials, setWriterInitials] = useState('CU');

    const loadStats = useCallback(async () => {
        if (!venueId) {
            setStats({ total: 0, thisMonth: 0, contributors: 0 });
            return;
        }
        const res = await fetchVenueReportStats(venueId);
        if (res.error) {
            setFetchError(res.error);
        }
        if (!res.missingTable) {
            setStats({ total: res.total, thisMonth: res.thisMonth, contributors: res.contributors });
        }
    }, [venueId]);

    const loadReports = useCallback(async () => {
        if (!venueId) {
            setRows([]);
            setLoading(false);
            setFetchError(null);
            setCanUseReportsRealtime(false);
            return;
        }
        setLoading(true);
        const { rows: data, error, missingTable } = await fetchVenueReports(venueId, { scope });
        setRows(data);
        setFetchError(error);
        setCanUseReportsRealtime(!missingTable);
        setLoading(false);
    }, [venueId, scope]);

    const refreshAll = useCallback(async () => {
        await loadStats();
        await loadReports();
    }, [loadStats, loadReports]);

    useEffect(() => {
        void refreshAll();
    }, [refreshAll]);

    useEffect(() => {
        if (!writeOpen) return;
        let cancelled = false;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;
            const email = user.email?.trim() || '';
            const metaName =
                typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '';
            const display = metaName || (email ? email.split('@')[0] : '') || 'Current User';
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
            if (cancelled) return;
            const role = roleLabelFromRole(profile?.role as string | undefined);
            setWriterName(display);
            setWriterRole(role);
            setWriterInitials(initialsFromDisplayName(display));
        })();
        return () => {
            cancelled = true;
        };
    }, [writeOpen]);

    const loadReportsRef = useRef(refreshAll);
    loadReportsRef.current = refreshAll;

    useEffect(() => {
        if (!venueId || !canUseReportsRealtime) return;
        return subscribeVenueActivityLogs(venueId, () => {
            void loadReportsRef.current();
        });
    }, [venueId, canUseReportsRealtime]);

    useEffect(() => {
        if (datePickerOpen) {
            setCalendarViewMonth(reportDate);
        }
    }, [datePickerOpen, reportDate]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(
            (r) =>
                r.action.toLowerCase().includes(q) ||
                (r.details || '').toLowerCase().includes(q) ||
                (r.performed_by || '').toLowerCase().includes(q)
        );
    }, [rows, query]);

    const openWrite = useCallback(() => {
        setWriteTitle('');
        setWriteBody('');
        setReportDate(new Date());
        setWriterName('Current User');
        setWriterRole('Account Holder');
        setWriterInitials('CU');
        setWriteOpen(true);
    }, []);

    const closeWrite = useCallback(() => {
        if (writeSaving) return;
        setWriteOpen(false);
    }, [writeSaving]);

    const saveWrite = useCallback(async () => {
        const title = writeTitle.trim();
        const details = writeBody.trim();
        if (!title || !details) {
            Alert.alert('Missing fields', 'Add a title and report body before saving.');
            return;
        }
        if (!venueId) {
            Alert.alert('No venue', venueError || 'Link a venue first.');
            return;
        }
        setWriteSaving(true);
        try {
            const performedBy = writerName.trim() || 'Current User';
            const { error } = await insertVenueReportDraft({
                venueId,
                performedBy,
                reportTypeSlug: 'summary',
                title,
                details,
                createdAtIso: startOfDay(reportDate).toISOString(),
            });
            if (error) {
                Alert.alert('Could not save', error);
                return;
            }
            setWriteOpen(false);
            setWriteTitle('');
            setWriteBody('');
            await refreshAll();
            Alert.alert('Saved', 'Your report was added.');
        } finally {
            setWriteSaving(false);
        }
    }, [writeTitle, writeBody, venueId, venueError, refreshAll, writerName, reportDate]);

    const showReportDetail = useCallback((r: VenueReportRow) => {
        const parsed = parseISO(r.created_at);
        const when = isValid(parsed) ? format(parsed, 'PPpp') : r.created_at;
        const who = r.performed_by || 'Unknown';
        const body = (r.details || '—').trim();
        Alert.alert(r.action, `${when}\n${who}\n\n${body}`);
    }, []);

    const noVenue = !venueLoading && !venueId;
    const statColW = (SCREEN_W - H_PAD * 2 - STAT_GAP * 2) / 3;
    const reportDateLabel = useMemo(() => format(reportDate, 'MMMM do, yyyy'), [reportDate]);
    const calendarCells = useMemo(() => monthCalendarCells(calendarViewMonth), [calendarViewMonth]);
    const calendarRows = useMemo(() => {
        const rows: Date[][] = [];
        for (let i = 0; i < calendarCells.length; i += 7) {
            rows.push(calendarCells.slice(i, i + 7));
        }
        return rows;
    }, [calendarCells]);

    return (
        <View style={styles.root}>
            <Modal
                visible={writeOpen}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={closeWrite}
            >
                <SafeAreaView style={styles.dailyRoot} edges={['top', 'bottom']}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.dailyKeyboard}
                    >
                        <ScrollView
                            style={styles.dailyScroll}
                            contentContainerStyle={styles.dailyScrollContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <TouchableOpacity
                                style={styles.backToReportsPlain}
                                onPress={closeWrite}
                                activeOpacity={0.88}
                                disabled={writeSaving}
                                hitSlop={{ top: 8, bottom: 8, right: 8 }}
                            >
                                <Icon name="chevron-back" size={22} color={TEXT} />
                                <Text style={styles.backToReportsPlainLabel}>Back to Reports</Text>
                            </TouchableOpacity>

                            <View style={styles.dailyFormCard}>
                                <View style={styles.dailyTitleRow}>
                                    <Icon name="document-text-outline" size={28} color={YELLOW} />
                                    <View style={styles.dailyTitleTextCol}>
                                        <Text style={styles.dailyMainTitle}>Daily Report</Text>
                                        <Text style={styles.dailySubtitle}>
                                            {"Document today's operations and any notable events"}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.dailyFieldLabel}>Report Date</Text>
                                <TouchableOpacity
                                    style={styles.dailyDateField}
                                    onPress={() => setDatePickerOpen(true)}
                                    activeOpacity={0.88}
                                    disabled={writeSaving}
                                >
                                    <View style={styles.dailyDateFieldSide}>
                                        <Icon name="calendar-outline" size={20} color={TEXT} />
                                    </View>
                                    <Text style={styles.dailyDateFieldText}>{reportDateLabel}</Text>
                                    <View style={styles.dailyDateFieldSide}>
                                        <Icon name="chevron-down" size={18} color={TEXT} />
                                    </View>
                                </TouchableOpacity>

                                <Text style={styles.dailyFieldLabel}>Report Title</Text>
                                <TextInput
                                    value={writeTitle}
                                    onChangeText={setWriteTitle}
                                    placeholder="e.g., Saturday Night Summary"
                                    placeholderTextColor={META}
                                    style={styles.dailyTextInput}
                                    editable={!writeSaving}
                                />

                                <Text style={styles.dailyFieldLabel}>Written By</Text>
                                <View style={styles.writtenByRow}>
                                    <View style={styles.writtenByLeft}>
                                        <View style={styles.writtenByAvatar}>
                                            <Text style={styles.writtenByAvatarText}>{writerInitials}</Text>
                                        </View>
                                        <Text style={styles.writtenByName} numberOfLines={1}>
                                            {writerName}
                                        </Text>
                                    </View>
                                    <Text style={styles.writtenByRoleRight} numberOfLines={1}>
                                        {writerRole}
                                    </Text>
                                </View>

                                <Text style={styles.dailyFieldLabel}>Report Content</Text>
                                <TextInput
                                    value={writeBody}
                                    onChangeText={setWriteBody}
                                    placeholder="Write your daily report here... Include guest counts, incidents, notable events, staff performance, etc."
                                    placeholderTextColor={META}
                                    style={[styles.dailyTextInput, styles.dailyTextArea]}
                                    multiline
                                    textAlignVertical="top"
                                    editable={!writeSaving}
                                />

                                <Text style={styles.dailyHelperMuted}>
                                    Include details about guest attendance, notable incidents, promoter performance, and
                                    any operational issues.
                                </Text>

                                <View style={styles.dailySectionDivider} />

                                <View style={styles.dailyFooterActions}>
                                    <TouchableOpacity
                                        style={styles.dailyCancelOutline}
                                        onPress={closeWrite}
                                        disabled={writeSaving}
                                        activeOpacity={0.88}
                                    >
                                        <Text style={styles.dailyCancelOutlineLabel}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.dailySubmitYellow, writeSaving && styles.dailySubmitDisabled]}
                                        onPress={() => void saveWrite()}
                                        disabled={writeSaving}
                                        activeOpacity={0.88}
                                    >
                                        {writeSaving ? (
                                            <ActivityIndicator color={YELLOW_TEXT} />
                                        ) : (
                                            <>
                                                <Icon name="save-outline" size={20} color={YELLOW_TEXT} />
                                                <Text style={styles.dailySubmitLabel}>Submit Report</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.tipsCard}>
                                    <Text style={styles.tipsTitle}>Tips for a Good Report</Text>
                                    {REPORT_TIPS.map((tip) => (
                                        <View key={tip} style={styles.tipRow}>
                                            <View style={styles.tipBullet} />
                                            <Text style={styles.tipText}>{tip}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.writeStepDots}>
                                    {[0, 1, 2, 3].map((i) => (
                                        <View key={String(i)} style={[styles.writeStepDot, i === 0 && styles.writeStepDotOn]} />
                                    ))}
                                </View>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>

            <Modal
                visible={datePickerOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setDatePickerOpen(false)}
            >
                <View style={styles.dateModalRoot}>
                    <Pressable style={styles.dateOverlay} onPress={() => setDatePickerOpen(false)} />
                    <View style={styles.dateSheet}>
                        <View style={styles.calHeaderRow}>
                            <TouchableOpacity
                                style={styles.calNavBtn}
                                onPress={() => setCalendarViewMonth((m) => addMonths(m, -1))}
                                activeOpacity={0.88}
                                accessibilityLabel="Previous month"
                            >
                                <Icon name="chevron-back" size={22} color={TEXT} />
                            </TouchableOpacity>
                            <Text style={styles.calMonthTitle}>{format(calendarViewMonth, 'MMMM yyyy')}</Text>
                            <TouchableOpacity
                                style={styles.calNavBtn}
                                onPress={() => setCalendarViewMonth((m) => addMonths(m, 1))}
                                activeOpacity={0.88}
                                accessibilityLabel="Next month"
                            >
                                <Icon name="chevron-forward" size={22} color={TEXT} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.calWeekdayRow}>
                            {WEEKDAY_LABELS.map((w) => (
                                <Text key={w} style={styles.calWeekdayLabel}>
                                    {w}
                                </Text>
                            ))}
                        </View>

                        {calendarRows.map((week, wi) => (
                            <View key={`w-${String(wi)}`} style={styles.calWeekRow}>
                                {week.map((d) => {
                                    const inMonth = isSameMonth(d, calendarViewMonth);
                                    const selected = isSameDay(d, reportDate);
                                    return (
                                        <TouchableOpacity
                                            key={d.toISOString()}
                                            style={styles.calCell}
                                            onPress={() => {
                                                setReportDate(startOfDay(d));
                                                setDatePickerOpen(false);
                                            }}
                                            activeOpacity={0.85}
                                        >
                                            <View
                                                style={[
                                                    styles.calCellInner,
                                                    selected && styles.calCellInnerSelected,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.calCellText,
                                                        inMonth ? styles.calCellTextInMonth : styles.calCellTextOutside,
                                                        selected && styles.calCellTextOnSelected,
                                                    ]}
                                                >
                                                    {format(d, 'd')}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                </View>
            </Modal>

            <View style={styles.topBar}>
                <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backBtn} accessibilityLabel="Back">
                    <Icon name="chevron-back" size={28} color={GOLD_BORDER} />
                </TouchableOpacity>
                <Text style={styles.headerTitleOnly} numberOfLines={1}>
                    Reports
                </Text>
            </View>
            <View style={styles.headerRule} />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {noVenue ? (
                    <View style={styles.banner}>
                        <Text style={styles.bannerText}>
                            {venueError || 'No venue linked. Connect a venue in Supabase to load reports.'}
                        </Text>
                        <TouchableOpacity style={styles.bannerBtn} onPress={() => void refresh()} activeOpacity={0.88}>
                            <Text style={styles.bannerBtnLabel}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {fetchError && venueId ? (
                    <View style={styles.warnBanner}>
                        <Icon name="warning-outline" size={18} color="#FFB82E" />
                        <Text style={styles.warnText}>{fetchError}</Text>
                    </View>
                ) : null}

                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { width: statColW }]}>
                        <Text style={styles.statValueTotal}>{stats.total}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={[styles.statCard, { width: statColW }]}>
                        <Text style={styles.statValueMonth}>{stats.thisMonth}</Text>
                        <Text style={styles.statLabel}>This Month</Text>
                    </View>
                    <View style={[styles.statCard, { width: statColW }]}>
                        <Text style={styles.statValueContrib}>{stats.contributors}</Text>
                        <Text style={styles.statLabel}>Contributors</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.writeReportBtn, noVenue && styles.writeReportBtnDisabled]}
                    onPress={openWrite}
                    activeOpacity={0.9}
                    disabled={noVenue}
                >
                    <Icon name="add" size={22} color={noVenue ? META : YELLOW_TEXT} />
                    <Text style={[styles.writeReportBtnLabel, noVenue && styles.writeReportBtnLabelMuted]}>
                        Write Report
                    </Text>
                </TouchableOpacity>

                <View style={styles.searchShell}>
                    <Icon name="search-outline" size={20} color={MUTED} style={styles.searchIcon} />
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search reports..."
                        placeholderTextColor={MUTED}
                        style={styles.searchInput}
                        autoCorrect={false}
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.chipRow}>
                    <TouchableOpacity
                        onPress={() => setScope('today')}
                        activeOpacity={0.88}
                        style={[styles.chipOutline, scope === 'today' && styles.chipYellow]}
                    >
                        <Text style={[styles.chipOutlineLabel, scope === 'today' && styles.chipYellowLabel]}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setScope('all')}
                        activeOpacity={0.88}
                        style={[styles.chipOutline, scope === 'all' && styles.chipYellow]}
                    >
                        <Text style={[styles.chipOutlineLabel, scope === 'all' && styles.chipYellowLabel]}>
                            All Reports
                        </Text>
                    </TouchableOpacity>
                </View>

                {venueId && loading ? (
                    <View style={styles.loadingBlock}>
                        <ActivityIndicator color={YELLOW} />
                        <Text style={styles.loadingText}>Loading…</Text>
                    </View>
                ) : null}

                {!loading && filtered.length === 0 && venueId ? (
                    <View style={styles.emptyBlock}>
                        <Icon name="document-text-outline" size={48} color={META} />
                        <Text style={styles.emptyTitle}>No reports found</Text>
                    </View>
                ) : null}

                {!loading && filtered.length > 0 ? (
                    <View style={styles.listBlock}>
                        {filtered.map((r) => (
                            <TouchableOpacity
                                key={r.id}
                                style={styles.reportCard}
                                activeOpacity={0.88}
                                onPress={() => showReportDetail(r)}
                            >
                                <View style={styles.reportTitleRow}>
                                    <Text style={styles.reportTitle} numberOfLines={2}>
                                        {r.action}
                                    </Text>
                                    <Icon name="chevron-forward" size={20} color={MUTED} />
                                </View>
                                <View style={styles.reportMeta}>
                                    <Icon name="calendar-outline" size={14} color={META} />
                                    <Text style={styles.reportMetaText}>{formatReportDay(r.created_at)}</Text>
                                    <Text style={styles.metaDot}>·</Text>
                                    <Text style={styles.reportMetaText}>{r.performed_by || 'Unknown'}</Text>
                                </View>
                                <Text style={styles.reportBody} numberOfLines={4}>
                                    {(r.details || '').trim() || '—'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : null}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BG,
        minWidth: 0,
        maxWidth: SCREEN_W,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 12,
    },
    backBtn: {
        width: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitleOnly: {
        flex: 1,
        color: TEXT,
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    headerRule: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: RULE,
        marginHorizontal: H_PAD,
    },
    scroll: { flex: 1 },
    scrollContent: {
        paddingHorizontal: H_PAD,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 28 : 20,
        alignItems: 'stretch',
    },
    banner: {
        backgroundColor: CARD,
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: RULE,
    },
    bannerText: {
        color: MUTED,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
    },
    bannerBtn: {
        marginTop: 12,
        alignSelf: 'flex-start',
        backgroundColor: FILTER_BG,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    bannerBtnLabel: {
        color: TEXT,
        fontWeight: '700',
        fontSize: 15,
    },
    warnBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,184,46,0.12)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    warnText: {
        flex: 1,
        color: '#FFB82E',
        fontSize: 13,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: STAT_GAP,
        marginBottom: 16,
    },
    statCard: {
        backgroundColor: STAT_CARD_BG,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: RULE,
    },
    statValueTotal: {
        color: TEXT,
        fontSize: 22,
        fontWeight: '800',
    },
    statValueMonth: {
        color: TEAL_STAT,
        fontSize: 22,
        fontWeight: '800',
    },
    statValueContrib: {
        color: GOLD_STAT,
        fontSize: 22,
        fontWeight: '800',
    },
    statLabel: {
        marginTop: 6,
        color: MUTED,
        fontSize: 13,
        fontWeight: '600',
    },
    writeReportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: YELLOW,
        borderRadius: 14,
        paddingVertical: 16,
        marginBottom: 16,
    },
    writeReportBtnDisabled: {
        opacity: 0.45,
    },
    writeReportBtnLabel: {
        color: YELLOW_TEXT,
        fontSize: 17,
        fontWeight: '800',
    },
    writeReportBtnLabelMuted: {
        color: META,
    },
    searchShell: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: FILTER_BG,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        marginBottom: 12,
    },
    searchIcon: { marginRight: 8 },
    searchInput: {
        flex: 1,
        color: TEXT,
        fontSize: 16,
        fontWeight: '500',
        paddingVertical: 0,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 8,
    },
    chipOutline: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 22,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.28)',
    },
    chipYellow: {
        backgroundColor: YELLOW,
        borderColor: 'rgba(0,0,0,0.15)',
    },
    chipOutlineLabel: {
        color: TEXT,
        fontSize: 15,
        fontWeight: '700',
    },
    chipYellowLabel: {
        color: YELLOW_TEXT,
    },
    loadingBlock: {
        marginTop: 28,
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        color: MUTED,
        fontSize: 14,
        fontWeight: '600',
    },
    listBlock: {
        marginTop: 20,
        gap: 14,
    },
    reportCard: {
        backgroundColor: CARD,
        borderRadius: 16,
        padding: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: RULE,
    },
    reportTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
    },
    reportTitle: {
        flex: 1,
        color: TEXT,
        fontSize: 17,
        fontWeight: '800',
    },
    reportMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 10,
    },
    reportMetaText: {
        color: META,
        fontSize: 14,
        fontWeight: '600',
    },
    metaDot: {
        color: META,
        fontSize: 14,
        fontWeight: '700',
    },
    reportBody: {
        marginTop: 10,
        color: MUTED,
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '500',
    },
    emptyBlock: {
        marginTop: 40,
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    emptyTitle: {
        marginTop: 14,
        color: MUTED,
        fontSize: 17,
        fontWeight: '700',
    },
    dateModalRoot: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    dateOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    dateSheet: {
        width: DATE_PICKER_PANEL_W,
        maxWidth: '100%',
        backgroundColor: FORM_CARD_WRITE,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        zIndex: 2,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.45,
                shadowRadius: 20,
            },
            android: {
                elevation: 18,
            },
        }),
    },
    calHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    calNavBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    calMonthTitle: {
        flex: 1,
        textAlign: 'center',
        color: TEXT,
        fontSize: 16,
        fontWeight: '800',
    },
    calWeekdayRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    calWeekdayLabel: {
        flex: 1,
        textAlign: 'center',
        color: CAL_MUTED,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    calWeekRow: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    calCell: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 36,
    },
    calCellInner: {
        minWidth: 34,
        minHeight: 34,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    calCellInnerSelected: {
        backgroundColor: CAL_SELECTED,
    },
    calCellText: {
        fontSize: 14,
        fontWeight: '600',
    },
    calCellTextInMonth: {
        color: TEXT,
    },
    calCellTextOutside: {
        color: CAL_MUTED,
    },
    calCellTextOnSelected: {
        color: YELLOW_TEXT,
        fontWeight: '800',
    },
    dailyRoot: {
        flex: 1,
        backgroundColor: BG,
    },
    dailyKeyboard: {
        flex: 1,
        backgroundColor: BG,
    },
    dailyScroll: {
        flex: 1,
        backgroundColor: BG,
    },
    dailyScrollContent: {
        paddingHorizontal: H_PAD,
        paddingBottom: 32,
    },
    backToReportsPlain: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        marginBottom: 18,
        paddingVertical: 4,
    },
    backToReportsPlainLabel: {
        color: TEXT,
        fontSize: 16,
        fontWeight: '600',
    },
    dailyFormCard: {
        backgroundColor: FORM_CARD_WRITE,
        borderRadius: 16,
        padding: 18,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    dailyTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 22,
    },
    dailyTitleTextCol: {
        flex: 1,
        minWidth: 0,
    },
    dailyMainTitle: {
        color: TEXT,
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    dailySubtitle: {
        color: MUTED,
        fontSize: 14,
        lineHeight: 20,
        marginTop: 6,
        fontWeight: '500',
    },
    dailyFieldLabel: {
        color: TEXT,
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 8,
    },
    dailyDateField: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: FORM_CARD_WRITE,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 10,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
        marginBottom: 18,
    },
    dailyDateFieldSide: {
        width: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dailyDateFieldText: {
        flex: 1,
        color: TEXT,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    dailyTextInput: {
        backgroundColor: FILTER_BG,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.12)',
        color: TEXT,
        fontSize: 16,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
        marginBottom: 18,
    },
    dailyTextArea: {
        minHeight: 220,
        paddingTop: Platform.OS === 'ios' ? 14 : 12,
    },
    writtenByRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        backgroundColor: FILTER_BG,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.12)',
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginBottom: 18,
    },
    writtenByLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        minWidth: 0,
    },
    writtenByAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: YELLOW,
        alignItems: 'center',
        justifyContent: 'center',
    },
    writtenByAvatarText: {
        color: YELLOW_TEXT,
        fontSize: 15,
        fontWeight: '800',
    },
    writtenByName: {
        flex: 1,
        color: TEXT,
        fontSize: 16,
        fontWeight: '800',
    },
    writtenByRoleRight: {
        color: MUTED,
        fontSize: 13,
        fontWeight: '600',
        flexShrink: 0,
        marginLeft: 8,
    },
    dailyHelperMuted: {
        color: MUTED,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
        fontWeight: '500',
    },
    dailySectionDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.12)',
        marginBottom: 18,
    },
    dailyFooterActions: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 12,
        marginBottom: 22,
    },
    dailyCancelOutline: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.35)',
        backgroundColor: '#252525',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dailyCancelOutlineLabel: {
        color: TEXT,
        fontSize: 15,
        fontWeight: '700',
    },
    dailySubmitYellow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: YELLOW,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    dailySubmitDisabled: {
        opacity: 0.65,
    },
    dailySubmitLabel: {
        color: YELLOW_TEXT,
        fontSize: 15,
        fontWeight: '800',
    },
    tipsCard: {
        backgroundColor: 'rgba(30,30,30,0.95)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: YELLOW,
        padding: 16,
    },
    tipsTitle: {
        color: TEXT,
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 12,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 10,
    },
    tipBullet: {
        width: 8,
        height: 8,
        borderRadius: 2,
        backgroundColor: YELLOW,
        marginTop: 6,
    },
    tipText: {
        flex: 1,
        color: MUTED,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
    writeStepDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 20,
        marginBottom: 8,
    },
    writeStepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.22)',
    },
    writeStepDotOn: {
        backgroundColor: YELLOW,
    },
});
