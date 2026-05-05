import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Pressable,
    StyleSheet,
    Dimensions,
    Alert,
    Platform,
    Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { WebView } from 'react-native-webview';

/**
 * Venue Analytics — UI / layout milestone only (no live backend on this screen).
 *
 * Metrics, charts, zones, promoters, weekly bars, etc. use placeholder data in this file
 * until product asks for live data. Later: replace static shapes with API responses;
 * use auth + venue + date range on requests (app calls our API, not an admin portal UI).
 * Until then: navigation, layout, accessibility, UX — no fetch/React Query unless explicitly requested.
 */
const BG = '#000000';
const CARD = '#1C1C1E';
const CARD_ALT = '#1A1A1A';
/** Popular Table Zones: darker shell so inner zone tiles read as separate surfaces */
const ZONES_SHELL_BG = '#09090B';
const ZONES_ROW_BG = '#25252C';
const TEXT = '#FFFFFF';
const MUTED = '#9CA3AF';
const META = '#888888';
const GOLD = '#FFB82E';
const GOLD_BORDER = '#FFD700';
const TEAL = '#26A69A';
const PINK = '#E91E63';
const TEAL_DEMO = '#1ABC9C';
const FILTER_BG = '#2A2A2A';
const RULE = 'rgba(255,255,255,0.08)';
/** Dropdown item press highlight (coral / pink) */
const PERIOD_PRESS_BG = '#FF6B8A';
const PERIOD_PRESS_TEXT = '#0D0D0D';
const PERIOD_MENU_BG = '#161616';
const PERIOD_MENU_BORDER = 'rgba(255,255,255,0.12)';
/** Avg Spend (dark tile) only */
const METRIC_ICON_ON_DARK = 'rgba(255,255,255,0.94)';
/** Footer / secondary icons on gold, teal, pink */
const METRIC_ICON_ON_COLOR = 'rgba(0,0,0,0.55)';
/** Header row: cash, guests, calendar — solid black stroke */
const METRIC_ICON_HEADER_BLACK = '#000000';

type AnalyticsPeriod = 'today' | 'week' | 'month' | 'quarter';

const PERIOD_OPTIONS: { key: AnalyticsPeriod; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'quarter', label: 'This Quarter' },
];

type VenueOptionId = 'all' | 'main_club' | 'rooftop';

const VENUE_OPTIONS: { key: VenueOptionId; label: string }[] = [
    { key: 'all', label: 'All Venues' },
    { key: 'main_club', label: 'Main Club' },
    { key: 'rooftop', label: 'Rooftop' },
];

const { width: SCREEN_W } = Dimensions.get('window');
const H_PAD = 16;

/** Zero until venues / bookings feed live weekly totals */
const WEEKLY_BARS = [
    { day: 'Mon', v: 0 },
    { day: 'Tue', v: 0 },
    { day: 'Wed', v: 0 },
    { day: 'Thu', v: 0 },
    { day: 'Fri', v: 0 },
    { day: 'Sat', v: 0 },
    { day: 'Sun', v: 0 },
];
const Y_MAX = 60000;
const Y_LABELS = [60000, 45000, 30000, 15000, 0];

/** Empty until live promoter stats are wired */
const PROMOTERS: { name: string; guests: number; revenue: string }[] = [];

/** Zone names for layout; bookings/revenue zero until live venue data */
const ZONES = [
    { rank: 1, name: 'VIP Booth', bookings: 0, revenue: '$0' },
    { rank: 2, name: 'Main Floor', bookings: 0, revenue: '$0' },
    { rank: 3, name: 'Rooftop', bookings: 0, revenue: '$0' },
    { rank: 4, name: 'Private Room', bookings: 0, revenue: '$0' },
];

const CHART_H = 168;
const X_LABEL_ROW_H = 22;
const AXIS_W = 44;

/** Point on circle: 0° = top, clockwise (degrees). */
function piePt(cx: number, cy: number, r: number, deg: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

function pieSlicePath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
    const p1 = piePt(cx, cy, r, startDeg);
    const p2 = piePt(cx, cy, r, endDeg);
    const sweep = endDeg - startDeg;
    const large = sweep > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y} Z`;
}

function buildGuestDemographicsPieHtml(): string {
    const cx = 150;
    const cy = 118;
    const r = 94;
    const segs = [
        { color: PINK, start: 0, end: 120, mid: 60, line1: 'VIP', line2: '0%' },
        { color: TEAL_DEMO, start: 120, end: 240, mid: 180, line1: 'Regular', line2: '0%' },
        { color: GOLD, start: 240, end: 360, mid: 300, line1: 'First Time', line2: '0%' },
    ];
    const vbX = -58;
    const vbY = 4;
    const vbW = 416;
    /** Extra bottom space so "Regular" / 0% is not clipped */
    const vbH = 302;
    const segGroups = segs
        .map((s, idx) => {
            const path = `<path class="slice-path" d="${pieSlicePath(cx, cy, r, s.start, s.end)}" fill="${s.color}" stroke="#ffffff" stroke-width="2.6" />`;
            const bottom = s.mid === 180;
            /** Bottom label: keep connector end (d3) above cap height; baseline (dT) lower so line does not cross "Regular". */
            const d1 = bottom ? 15 : 22;
            const d2 = bottom ? 28 : 42;
            const d3 = bottom ? 38 : 56;
            const dT = bottom ? 56 : 66;
            const a = piePt(cx, cy, r - 1, s.mid);
            const b = piePt(cx, cy, r + d1, s.mid);
            const c = piePt(cx, cy, r + d2, s.mid);
            const c2 = piePt(cx, cy, r + d3, s.mid);
            const t = piePt(cx, cy, r + dT, s.mid);
            const fs1 = 15;
            const fs2 = 13;
            const lines = `<line class="pie-label-line" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${s.color}" stroke-width="1.8" />
<line class="pie-label-line" x1="${b.x}" y1="${b.y}" x2="${c.x}" y2="${c.y}" stroke="${s.color}" stroke-width="1.8" />
<line class="pie-label-line" x1="${c.x}" y1="${c.y}" x2="${c2.x}" y2="${c2.y}" stroke="${s.color}" stroke-width="1.8" />`;
            const texts = `<text class="pie-label-text pie-label-primary" x="${t.x}" y="${t.y}" fill="${s.color}" font-size="${fs1}" font-weight="800" font-family="system-ui,-apple-system,sans-serif" text-anchor="middle" style="paint-order:stroke fill;stroke:#000000;stroke-width:0.45px;stroke-opacity:0.4">${s.line1}</text>
<text class="pie-label-text pie-label-secondary" x="${t.x}" y="${t.y + 18}" fill="${s.color}" font-size="${fs2}" font-weight="700" font-family="system-ui,-apple-system,sans-serif" text-anchor="middle" style="paint-order:stroke fill;stroke:#000000;stroke-width:0.4px;stroke-opacity:0.4">${s.line2}</text>`;
            return `<g class="pie-seg" data-idx="${idx}" role="button">${path}${lines}${texts}</g>`;
        })
        .join('');
    const ring = `<circle class="pie-ring" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ffffff" stroke-width="2.6" pointer-events="none"/>`;
    const clearHit = `<rect class="pie-clear-hit" x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="transparent"/>`;
    const pieStyle = `<style>
.slice-path { transition: opacity 0.22s ease, stroke-width 0.2s ease, filter 0.2s ease; }
.pie-label-line, .pie-label-text { transition: opacity 0.22s ease; }
svg.dim-mode .pie-seg:not(.active) .slice-path { opacity: 0.36; filter: brightness(0.72); }
svg.dim-mode .pie-seg.active .slice-path { opacity: 1; stroke-width: 4.2; filter: brightness(1.14) saturate(1.08); }
svg.dim-mode .pie-seg:not(.active) .pie-label-line,
svg.dim-mode .pie-seg:not(.active) .pie-label-text { opacity: 0.38; }
svg.dim-mode .pie-seg.active .pie-label-line,
svg.dim-mode .pie-seg.active .pie-label-text { opacity: 1; }
.pie-seg { cursor: pointer; }
</style>`;
    const pieScript = `<script>(function(){
var svg=document.querySelector('svg');if(!svg)return;
function clear(){svg.classList.remove('dim-mode');[].forEach.call(document.querySelectorAll('.pie-seg'),function(g){g.classList.remove('active');});}
function activate(i){svg.classList.add('dim-mode');[].forEach.call(document.querySelectorAll('.pie-seg'),function(g){g.classList.toggle('active',+g.getAttribute('data-idx')===i);});}
var hover=typeof window.matchMedia==='function'&&window.matchMedia('(hover:hover)').matches;
var active=-1;
[].forEach.call(document.querySelectorAll('.pie-seg'),function(g){
var i=+g.getAttribute('data-idx');
if(hover){
g.addEventListener('mouseenter',function(){active=i;activate(i);});
g.addEventListener('mouseleave',function(e){var rel=e.relatedTarget;if(!rel||!svg.contains(rel)||!rel.closest('.pie-seg')){active=-1;clear();}});
}else{
g.addEventListener('click',function(e){e.stopPropagation();if(active===i){active=-1;clear();}else{active=i;activate(i);}});
}
});
var hit=document.querySelector('.pie-clear-hit');
if(hit&&!hover)hit.addEventListener('click',function(e){e.stopPropagation();active=-1;clear();});
})();<\/script>`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>${pieStyle}</head><body style="margin:0;background:transparent;overflow:hidden;display:flex;align-items:center;justify-content:center">
<svg width="100%" height="100%" viewBox="${vbX} ${vbY} ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${clearHit}${segGroups}${ring}</svg>${pieScript}</body></html>`;
}

const GUEST_DEMO_PIE_HTML = buildGuestDemographicsPieHtml();

function formatRevenue(v: number) {
    return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

type WeeklyRevenueChartProps = {
    selectedIdx: number | null;
    onToggleBar: (index: number) => void;
    onDismissTooltip: () => void;
};

function WeeklyRevenueChart({ selectedIdx, onToggleBar, onDismissTooltip }: WeeklyRevenueChartProps) {
    return (
        <View style={[styles.chartCardShell, styles.chartCardTall]}>
            <Text style={[styles.chartCardTitle, styles.weeklyChartTitleSpacing]}>Weekly Revenue</Text>
            <View style={styles.weeklyChartBody}>
                {selectedIdx !== null ? (
                    <Pressable
                        style={styles.weeklyChartDismissLayer}
                        onPress={onDismissTooltip}
                        accessibilityLabel="Dismiss chart tooltip"
                    />
                ) : null}
                <View style={styles.weeklyChartForeground} pointerEvents="box-none">
                    <View style={[styles.barChartRow, styles.barChartRowInteractive]} pointerEvents="box-none">
                        <View
                            style={[styles.yAxisCol, { width: AXIS_W, height: CHART_H }]}
                            pointerEvents="none"
                        >
                            {Y_LABELS.map((yv) => (
                                <Text key={yv} style={styles.yAxisLabel}>
                                    {yv === 0 ? '0' : yv.toLocaleString()}
                                </Text>
                            ))}
                        </View>
                        <View style={styles.barChartPlot} pointerEvents="box-none">
                            <View style={[styles.chartPlotTop, { height: CHART_H }]} pointerEvents="box-none">
                                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                                    {[0, 1, 2, 3].map((i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.gridLineSolid,
                                                {
                                                    top: (i * CHART_H) / (Y_LABELS.length - 1),
                                                },
                                            ]}
                                        />
                                    ))}
                                </View>
                                <View
                                    style={styles.chartAxisFrame}
                                    pointerEvents="none"
                                    accessibilityElementsHidden
                                    importantForAccessibility="no-hide-descendants"
                                >
                                    <View style={styles.chartAxisY} />
                                    <View style={styles.chartAxisX} />
                                </View>
                                <View style={styles.barsRow} pointerEvents="box-none">
                                    {WEEKLY_BARS.map((b, i) => {
                                        const hPct = b.v <= 0 ? 0 : Math.max(0.08, b.v / Y_MAX);
                                        const barPixelH = hPct * CHART_H;
                                        const tooltipBottom = Math.max(40, barPixelH + 14);
                                        const selected = selectedIdx === i;
                                        return (
                                            <View key={b.day} style={styles.barCol}>
                                                <Pressable
                                                    accessibilityRole="button"
                                                    accessibilityLabel={`${b.day} revenue ${formatRevenue(b.v)} dollars`}
                                                    onPress={() => onToggleBar(i)}
                                                    style={({ pressed }) => [
                                                        styles.barColPressable,
                                                        { height: CHART_H },
                                                        pressed && { opacity: 0.92 },
                                                    ]}
                                                >
                                                    {selected ? (
                                                        <View
                                                            style={styles.barColumnHighlight}
                                                            pointerEvents="none"
                                                        />
                                                    ) : null}
                                                    <View style={styles.barTrackWrap}>
                                                        <View style={styles.barTrack}>
                                                            <View
                                                                style={[
                                                                    styles.barFill,
                                                                    hPct > 0 && styles.barFillMin,
                                                                    { height: `${hPct * 100}%` },
                                                                ]}
                                                            />
                                                        </View>
                                                    </View>
                                                    {selected ? (
                                                        <View
                                                            style={[
                                                                styles.barTooltipAnchor,
                                                                { bottom: tooltipBottom },
                                                            ]}
                                                            pointerEvents="none"
                                                        >
                                                            <View style={styles.barTooltip}>
                                                                <Text style={styles.barTooltipDay}>{b.day}</Text>
                                                                <Text
                                                                    style={styles.barTooltipRevenue}
                                                                    numberOfLines={1}
                                                                >
                                                                    {`Revenue : $${formatRevenue(b.v)}`}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    ) : null}
                                                </Pressable>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                            <View
                                style={[styles.xLabelsRow, { height: X_LABEL_ROW_H }]}
                                pointerEvents="none"
                            >
                                {WEEKLY_BARS.map((b) => (
                                    <Text key={b.day} style={styles.xLabel}>
                                        {b.day}
                                    </Text>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
}

/**
 * Pie chart (inline SVG in WebView — no react-native-svg native module).
 * Three equal segments while there is no live demographic split.
 */
function GuestDemographicsPie() {
    return (
        <LinearGradient
            colors={[
                'rgba(255,255,255,0.26)',
                'rgba(255,255,255,0.1)',
                'rgba(255,255,255,0.04)',
                'rgba(22,22,30,0.88)',
                'rgba(10,10,14,0.96)',
            ]}
            locations={[0, 0.12, 0.28, 0.65, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.guestDemoGlass}
        >
            <Text style={[styles.chartCardTitle, styles.guestDemoTitle]}>Guest Demographics</Text>
            <View style={styles.guestDemoChartWrap}>
                <WebView
                    source={{ html: GUEST_DEMO_PIE_HTML }}
                    style={styles.guestDemoWebView}
                    scrollEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    originWhitelist={['*']}
                    pointerEvents="auto"
                    javaScriptEnabled
                    androidLayerType="hardware"
                />
            </View>
        </LinearGradient>
    );
}

function PromoterPerformanceCard() {
    const maxG = Math.max(1, ...PROMOTERS.map((p) => p.guests));
    return (
        <View style={styles.chartCardShell}>
            <Text
                style={[
                    styles.chartCardTitle,
                    { marginBottom: PROMOTERS.length > 0 ? 16 : 6 },
                ]}
            >
                Promoter Performance
            </Text>
            {PROMOTERS.length === 0 ? (
                <View style={styles.promoEmpty}>
                    <Icon name="people-outline" size={36} color={META} />
                    <Text style={styles.promoEmptyTitle}>No promoter data yet</Text>
                    <Text style={styles.promoEmptyHint}>
                        When live stats are connected, guest counts and revenue by promoter appear
                        here.
                    </Text>
                </View>
            ) : (
                PROMOTERS.map((p, index) => (
                    <View key={`promoter-${index}`} style={styles.promoRow}>
                        <Text style={styles.promoName} numberOfLines={1}>
                            {p.name.trim() ? p.name : '\u00a0'}
                        </Text>
                        <View style={styles.promoBarWrap}>
                            <View style={styles.promoBarTrack}>
                                <View
                                    style={[
                                        styles.promoBarFill,
                                        { width: `${(p.guests / maxG) * 100}%` },
                                    ]}
                                />
                            </View>
                        </View>
                        <View style={styles.promoStats}>
                            <Text style={styles.promoGuests}>{p.guests} guests</Text>
                            <Text style={styles.promoRev}>{p.revenue}</Text>
                        </View>
                    </View>
                ))
            )}
        </View>
    );
}

function PopularZonesCard() {
    return (
        <View style={[styles.chartCardShell, styles.popularZonesOuter]}>
            <Text style={[styles.chartCardTitle, styles.popularZonesTitle]}>Popular Table Zones</Text>
            <View style={styles.popularZonesInnerList}>
                {ZONES.map((z) => (
                    <View key={z.rank} style={styles.zoneZoneCard}>
                        <View style={styles.zoneRow}>
                            <View style={styles.zoneRank}>
                                <Text style={styles.zoneRankText}>#{z.rank}</Text>
                            </View>
                            <Text style={styles.zoneName} numberOfLines={1}>
                                {z.name.trim() ? z.name : '\u00a0'}
                            </Text>
                            <View style={styles.zoneStats}>
                                <Text style={styles.zoneBookings}>{z.bookings} bookings</Text>
                                <Text style={styles.zoneRev}>{z.revenue}</Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

type Props = { onBack: () => void };

export function VenueAnalyticsScreen({ onBack }: Props) {
    const [periodOpen, setPeriodOpen] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>('week');
    const [periodAnchor, setPeriodAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const periodChipRef = useRef<View>(null);
    const venueChipRef = useRef<View>(null);
    const [venueMenuOpen, setVenueMenuOpen] = useState(false);
    const [selectedVenueId, setSelectedVenueId] = useState<VenueOptionId>('all');
    const [venueAnchor, setVenueAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [weeklyBarSelected, setWeeklyBarSelected] = useState<number | null>(null);

    const periodLabel = useMemo(
        () => PERIOD_OPTIONS.find((o) => o.key === selectedPeriod)?.label ?? 'This Week',
        [selectedPeriod]
    );

    const venueLabel = useMemo(
        () => VENUE_OPTIONS.find((o) => o.key === selectedVenueId)?.label ?? 'All Venues',
        [selectedVenueId]
    );

    const clearWeeklyBarTooltip = useCallback(() => setWeeklyBarSelected(null), []);

    const closeVenueMenu = useCallback(() => setVenueMenuOpen(false), []);

    const openVenueMenu = useCallback(() => {
        clearWeeklyBarTooltip();
        setPeriodOpen(false);
        const node = venueChipRef.current;
        if (node) {
            node.measureInWindow((x, y, width, height) => {
                setVenueAnchor({ x, y, width, height });
                setVenueMenuOpen(true);
            });
        } else {
            setVenueMenuOpen(true);
        }
    }, [clearWeeklyBarTooltip]);

    const openPeriodMenu = useCallback(() => {
        clearWeeklyBarTooltip();
        setVenueMenuOpen(false);
        const node = periodChipRef.current;
        if (node) {
            node.measureInWindow((x, y, width, height) => {
                setPeriodAnchor({ x, y, width, height });
                setPeriodOpen(true);
            });
        } else {
            setPeriodOpen(true);
        }
    }, [clearWeeklyBarTooltip]);

    const closePeriodMenu = useCallback(() => setPeriodOpen(false), []);

    const toggleWeeklyBar = useCallback((index: number) => {
        setWeeklyBarSelected((prev) => (prev === index ? null : index));
    }, []);

    const exportMsg = (kind: string) => {
        Alert.alert('Export', `${kind} export will use live data when connected.`);
    };

    const periodMenuWidth = Math.max(periodAnchor.width, 196);
    const periodMenuLeft = Math.max(8, Math.min(periodAnchor.x, SCREEN_W - periodMenuWidth - 8));

    const venueMenuWidth = Math.max(venueAnchor.width, 200);
    const venueMenuLeft = Math.max(8, Math.min(venueAnchor.x, SCREEN_W - venueMenuWidth - 8));

    return (
        <View style={styles.root}>
            <Modal
                visible={periodOpen}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={closePeriodMenu}
            >
                <View style={styles.periodModalRoot} pointerEvents="box-none">
                    <Pressable style={styles.periodModalBackdrop} onPress={closePeriodMenu} />
                    <View
                        style={[
                            styles.periodMenu,
                            {
                                top: periodAnchor.y + periodAnchor.height + 6,
                                left: periodMenuLeft,
                                width: periodMenuWidth,
                            },
                        ]}
                        pointerEvents="box-none"
                    >
                        {PERIOD_OPTIONS.map((opt) => {
                            const selected = opt.key === selectedPeriod;
                            return (
                                <Pressable
                                    key={opt.key}
                                    onPress={() => {
                                        setSelectedPeriod(opt.key);
                                        closePeriodMenu();
                                    }}
                                >
                                    {({ pressed }) => (
                                        <View
                                            style={[
                                                styles.periodMenuRow,
                                                selected && styles.venueMenuRowSelected,
                                                pressed && !selected && styles.periodMenuRowPressed,
                                                pressed && selected && styles.venueMenuRowSelectedPressed,
                                            ]}
                                        >
                                            <View style={styles.periodMenuCheckCol}>
                                                {selected ? (
                                                    <Icon name="checkmark" size={18} color="#111111" />
                                                ) : null}
                                            </View>
                                            <Text
                                                style={[
                                                    styles.venueMenuLabel,
                                                    selected && styles.venueMenuLabelSelected,
                                                    pressed && !selected && styles.periodMenuLabelPressed,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {opt.label}
                                            </Text>
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </Modal>

            <Modal
                visible={venueMenuOpen}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={closeVenueMenu}
            >
                <View style={styles.periodModalRoot} pointerEvents="box-none">
                    <Pressable style={styles.periodModalBackdrop} onPress={closeVenueMenu} />
                    <View
                        style={[
                            styles.periodMenu,
                            {
                                top: venueAnchor.y + venueAnchor.height + 6,
                                left: venueMenuLeft,
                                width: venueMenuWidth,
                            },
                        ]}
                        pointerEvents="box-none"
                    >
                        {VENUE_OPTIONS.map((opt) => {
                            const selected = opt.key === selectedVenueId;
                            return (
                                <Pressable
                                    key={opt.key}
                                    onPress={() => {
                                        setSelectedVenueId(opt.key);
                                        closeVenueMenu();
                                    }}
                                >
                                    {({ pressed }) => (
                                        <View
                                            style={[
                                                styles.periodMenuRow,
                                                selected && styles.venueMenuRowSelected,
                                                pressed && !selected && styles.periodMenuRowPressed,
                                                pressed && selected && styles.venueMenuRowSelectedPressed,
                                            ]}
                                        >
                                            <View style={styles.periodMenuCheckCol}>
                                                {selected ? (
                                                    <Icon name="checkmark" size={18} color="#111111" />
                                                ) : null}
                                            </View>
                                            <Text
                                                style={[
                                                    styles.venueMenuLabel,
                                                    selected && styles.venueMenuLabelSelected,
                                                    pressed && !selected && styles.periodMenuLabelPressed,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {opt.label}
                                            </Text>
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </Modal>

            <View style={styles.topBar}>
                <TouchableOpacity
                    onPress={() => {
                        clearWeeklyBarTooltip();
                        closePeriodMenu();
                        closeVenueMenu();
                        onBack();
                    }}
                    hitSlop={12}
                    style={styles.backBtn}
                    accessibilityLabel="Back"
                >
                    <Icon name="chevron-back" size={28} color={GOLD_BORDER} />
                </TouchableOpacity>
                <View style={styles.topBarHeadings}>
                    <Text style={styles.headerMainTitle} numberOfLines={2}>
                        Analytics
                    </Text>
                    <Text style={styles.headerSubtitle} numberOfLines={2}>
                        Performance insights and data exports
                    </Text>
                </View>
            </View>
            <View style={styles.headerRule} />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                onScrollBeginDrag={() => {
                    clearWeeklyBarTooltip();
                    closeVenueMenu();
                }}
            >
                <View style={styles.chipBarBleed}>
                    <ScrollView
                        horizontal
                        nestedScrollEnabled
                        showsHorizontalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.chipBarScrollContent}
                    >
                        <View ref={periodChipRef} collapsable={false}>
                            <TouchableOpacity
                                style={[styles.chipPill, periodOpen && styles.chipPillOpen]}
                                onPress={() => {
                                    if (periodOpen) closePeriodMenu();
                                    else openPeriodMenu();
                                }}
                                activeOpacity={0.88}
                            >
                                <Icon name="calendar-outline" size={18} color={TEXT} />
                                <Text style={styles.chipPillLabel} numberOfLines={1}>
                                    {periodLabel}
                                </Text>
                                <Icon
                                    name={periodOpen ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color={MUTED}
                                />
                            </TouchableOpacity>
                        </View>
                        <View ref={venueChipRef} collapsable={false}>
                            <TouchableOpacity
                                style={[styles.chipPill, venueMenuOpen && styles.chipPillOpen]}
                                onPress={() => {
                                    if (venueMenuOpen) closeVenueMenu();
                                    else openVenueMenu();
                                }}
                                activeOpacity={0.88}
                            >
                                <Icon name="location-outline" size={18} color={TEXT} />
                                <Text style={styles.chipPillLabel} numberOfLines={1}>
                                    {venueLabel}
                                </Text>
                                <Icon
                                    name={venueMenuOpen ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color={MUTED}
                                />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            style={styles.chipPill}
                            onPress={() => {
                                clearWeeklyBarTooltip();
                                closeVenueMenu();
                                exportMsg('CSV');
                            }}
                            activeOpacity={0.88}
                        >
                            <Icon name="download-outline" size={18} color={TEXT} />
                            <Text style={styles.chipPillLabelCompact}>CSV</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.chipPill}
                            onPress={() => {
                                clearWeeklyBarTooltip();
                                closeVenueMenu();
                                exportMsg('PDF');
                            }}
                            activeOpacity={0.88}
                        >
                            <Icon name="download-outline" size={18} color={TEXT} />
                            <Text style={styles.chipPillLabelCompact}>PDF</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                <Text style={styles.sectionHeading}>Overview</Text>
                <View style={styles.metricsBlock}>
                    <View style={styles.metricsRow}>
                        <View style={[styles.metricCard, styles.metricRevenue]}>
                            <View style={styles.metricCardStack}>
                                <View style={styles.metricCardHeaderRow}>
                                    <Icon name="cash-outline" size={22} color={METRIC_ICON_HEADER_BLACK} />
                                    <Text style={styles.metricLabelOnColor}>Total Revenue</Text>
                                </View>
                                <Text style={[styles.metricValueOnColor, styles.metricCardHeroStacked]}>
                                    $0
                                </Text>
                                <View style={styles.metricCardFooterRow}>
                                    <Icon name="remove-outline" size={15} color={METRIC_ICON_ON_COLOR} />
                                    <Text style={styles.trendOnColor}>0% vs last week</Text>
                                </View>
                            </View>
                        </View>
                        <View style={[styles.metricCard, styles.metricGuests]}>
                            <View style={styles.metricCardStack}>
                                <View style={styles.metricCardHeaderRow}>
                                    <Icon name="people-outline" size={22} color={METRIC_ICON_HEADER_BLACK} />
                                    <Text style={styles.metricHeadingBlack}>Total Guests</Text>
                                </View>
                                <Text style={[styles.metricValueOnColorLight, styles.metricCardHeroStacked]}>
                                    0
                                </Text>
                                <View style={styles.metricCardFooterRow}>
                                    <Icon name="remove-outline" size={15} color={METRIC_ICON_ON_COLOR} />
                                    <Text style={styles.trendOnColor}>0% vs last week</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                    <View style={styles.metricsRow}>
                        <View style={[styles.metricCard, styles.metricBookings]}>
                            <View style={styles.metricCardStack}>
                                <View style={styles.metricCardHeaderRow}>
                                    <Icon name="calendar-outline" size={22} color={METRIC_ICON_HEADER_BLACK} />
                                    <Text style={styles.metricHeadingBlack}>Bookings</Text>
                                </View>
                                <Text style={[styles.metricValueOnColorLight, styles.metricCardHeroStacked]}>
                                    0
                                </Text>
                                <View style={styles.metricCardFooterRow}>
                                    <Text style={styles.metricBodyBlack}>Avg: 0/night</Text>
                                </View>
                            </View>
                        </View>
                        <View style={[styles.metricCard, styles.metricSpend]}>
                            <View style={styles.metricCardStack}>
                                <View style={styles.metricCardHeaderRow}>
                                    <Icon name="trending-up-outline" size={22} color={METRIC_ICON_ON_DARK} />
                                    <Text style={styles.metricSpendTitle}>Avg Spend</Text>
                                </View>
                                <Text style={[styles.metricCardHeroStacked, styles.metricSpendHeroValue]}>
                                    $0
                                </Text>
                                <View style={styles.metricCardFooterRow}>
                                    <Text style={styles.metricSpendSub}>Per booking</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.analyticsFullBleed}>
                    <View style={styles.analyticsInnerPad}>
                        <View style={styles.analyticsStack}>
                            <WeeklyRevenueChart
                                selectedIdx={weeklyBarSelected}
                                onToggleBar={toggleWeeklyBar}
                                onDismissTooltip={clearWeeklyBarTooltip}
                            />
                            <GuestDemographicsPie />
                            <PromoterPerformanceCard />
                            <PopularZonesCard />
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BG,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
        gap: 6,
    },
    backBtn: {
        width: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    topBarHeadings: {
        flex: 1,
        minWidth: 0,
        paddingRight: 8,
    },
    headerMainTitle: {
        color: TEXT,
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        color: MUTED,
        fontSize: 14,
        lineHeight: 20,
        marginTop: 4,
        marginBottom: 2,
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
    chipBarBleed: {
        marginHorizontal: -H_PAD,
        marginBottom: 22,
    },
    chipBarScrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: H_PAD,
        paddingVertical: 2,
    },
    chipPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: FILTER_BG,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
    },
    chipPillOpen: {
        borderColor: 'rgba(255,215,0,0.45)',
        backgroundColor: '#252525',
    },
    chipPillLabel: {
        color: TEXT,
        fontSize: 15,
        fontWeight: '600',
        maxWidth: 148,
    },
    chipPillLabelCompact: {
        color: TEXT,
        fontSize: 15,
        fontWeight: '700',
    },
    sectionHeading: {
        color: MUTED,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        marginBottom: 14,
    },
    periodModalRoot: {
        flex: 1,
    },
    periodModalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    periodMenu: {
        position: 'absolute',
        backgroundColor: PERIOD_MENU_BG,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: PERIOD_MENU_BORDER,
        paddingVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 12,
    },
    periodMenuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 6,
        marginHorizontal: 6,
        borderRadius: 12,
    },
    periodMenuRowPressed: {
        backgroundColor: PERIOD_PRESS_BG,
    },
    periodMenuCheckCol: {
        width: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    periodMenuLabelPressed: {
        color: PERIOD_PRESS_TEXT,
    },
    venueMenuRowSelected: {
        backgroundColor: PERIOD_PRESS_BG,
    },
    venueMenuRowSelectedPressed: {
        opacity: 0.92,
    },
    venueMenuLabel: {
        flex: 1,
        color: TEXT,
        fontSize: 16,
        fontWeight: '600',
    },
    venueMenuLabelSelected: {
        color: '#111111',
        fontWeight: '700',
    },
    metricsBlock: {
        marginBottom: 30,
        gap: 16,
        alignSelf: 'stretch',
    },
    metricsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    metricCard: {
        flex: 1,
        minWidth: 0,
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 16,
        minHeight: 148,
    },
    /** Reference layout: header (icon + title) → large value → footer row */
    metricCardStack: {
        flex: 1,
        width: '100%',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
    },
    metricCardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    metricCardHeroStacked: {
        fontSize: 32,
        lineHeight: 38,
        fontWeight: '800',
        color: '#111111',
        alignSelf: 'stretch',
    },
    metricCardFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
    },
    metricRevenue: {
        backgroundColor: GOLD,
    },
    metricGuests: {
        backgroundColor: TEAL,
    },
    metricBookings: {
        backgroundColor: PINK,
    },
    metricSpend: {
        backgroundColor: CARD_ALT,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: RULE,
    },
    metricSpendTitle: {
        color: TEXT,
        fontSize: 17,
        fontWeight: '800',
    },
    metricSpendSub: {
        color: 'rgba(255,255,255,0.82)',
        fontSize: 15,
        fontWeight: '600',
    },
    metricSpendHeroValue: {
        color: TEXT,
        fontSize: 32,
        lineHeight: 38,
    },
    metricHeadingBlack: {
        color: '#111111',
        fontSize: 17,
        fontWeight: '800',
    },
    metricBodyBlack: {
        color: 'rgba(0,0,0,0.72)',
        fontSize: 15,
        fontWeight: '600',
    },
    metricLabelOnColor: {
        color: '#111111',
        fontSize: 17,
        fontWeight: '800',
    },
    metricValueOnColor: {
        color: '#111111',
        fontSize: 22,
        fontWeight: '800',
    },
    trendOnColor: {
        color: 'rgba(0,0,0,0.68)',
        fontSize: 15,
        fontWeight: '600',
        flexShrink: 0,
    },
    metricValueOnColorLight: {
        color: '#111111',
        fontSize: 22,
        fontWeight: '800',
    },
    /** Full-bleed charts column (same edge alignment as former single-page carousel) */
    analyticsFullBleed: {
        marginHorizontal: -H_PAD,
        width: SCREEN_W,
    },
    analyticsInnerPad: {
        paddingHorizontal: H_PAD,
    },
    analyticsStack: {
        gap: 28,
    },
    chartCardShell: {
        backgroundColor: CARD,
        borderRadius: 16,
        padding: 16,
        overflow: 'visible',
    },
    chartCardTall: {
        minHeight: 280,
    },
    chartCardTitle: {
        color: TEXT,
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 4,
    },
    weeklyChartTitleSpacing: {
        marginBottom: 12,
    },
    /** Darker than default chart cards so nested zone rows stand out */
    popularZonesOuter: {
        alignSelf: 'stretch',
        backgroundColor: ZONES_SHELL_BG,
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: StyleSheet.hairlineWidth,
    },
    popularZonesTitle: {
        fontSize: 18,
        marginBottom: 12,
    },
    popularZonesInnerList: {
        gap: 10,
    },
    /** Per-zone tile: lighter than ZONES_SHELL_BG for clear separation */
    zoneZoneCard: {
        backgroundColor: ZONES_ROW_BG,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    weeklyChartBody: {
        position: 'relative',
        minHeight: CHART_H + X_LABEL_ROW_H + 8,
    },
    weeklyChartDismissLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    weeklyChartForeground: {
        position: 'relative',
        zIndex: 2,
    },
    barChartRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    barChartRowInteractive: {
        overflow: 'visible',
    },
    yAxisCol: {
        justifyContent: 'space-between',
        paddingRight: 6,
    },
    yAxisLabel: {
        color: META,
        fontSize: 10,
        textAlign: 'right',
        fontVariant: ['tabular-nums'],
    },
    barChartPlot: {
        flex: 1,
        minWidth: 0,
        overflow: 'visible',
    },
    chartPlotTop: {
        position: 'relative',
        overflow: 'visible',
    },
    /** L-shaped axes at origin (bottom-left of plot) — drawn above faint grid, under bars */
    chartAxisFrame: {
        ...StyleSheet.absoluteFillObject,
    },
    chartAxisY: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: 'rgba(230,230,235,0.88)',
        borderRadius: 2,
    },
    chartAxisX: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 3,
        backgroundColor: 'rgba(230,230,235,0.88)',
        borderRadius: 2,
    },
    gridLineSolid: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.24)',
    },
    barsRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingLeft: 4,
        paddingRight: 2,
        overflow: 'visible',
    },
    barCol: {
        flex: 1,
        alignItems: 'stretch',
        maxWidth: 44,
        minWidth: 0,
        overflow: 'visible',
    },
    barColPressable: {
        width: '100%',
        position: 'relative',
        overflow: 'visible',
    },
    barColumnHighlight: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 6,
    },
    barTrackWrap: {
        flex: 1,
        width: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
        zIndex: 1,
    },
    /** Wider than barCol (~44px) so tooltip text is not squeezed into one character per line */
    barTooltipAnchor: {
        position: 'absolute',
        left: -90,
        right: -90,
        alignItems: 'center',
        zIndex: 4,
    },
    barTooltip: {
        alignSelf: 'center',
        minWidth: 172,
        maxWidth: 280,
        backgroundColor: '#1E1E1E',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.12)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    barTooltipDay: {
        color: TEXT,
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 6,
    },
    barTooltipRevenue: {
        color: GOLD,
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    barTrack: {
        width: '78%',
        height: '100%',
        justifyContent: 'flex-end',
        borderRadius: 6,
        overflow: 'hidden',
    },
    barFill: {
        width: '100%',
        backgroundColor: GOLD,
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
    },
    barFillMin: {
        minHeight: 4,
    },
    xLabelsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: 4,
        paddingRight: 2,
        marginTop: 6,
    },
    xLabel: {
        flex: 1,
        color: META,
        fontSize: 10,
        textAlign: 'center',
        maxWidth: 44,
    },
    /** Glass-style shell for demographics (no blur dependency); stronger top sheen */
    guestDemoGlass: {
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 14,
        overflow: 'visible',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.26)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.42,
        shadowRadius: 28,
        elevation: 14,
    },
    guestDemoTitle: {
        marginBottom: 8,
    },
    guestDemoChartWrap: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    /** Match SVG viewBox aspect (incl. bottom padding for labels) */
    guestDemoWebView: {
        aspectRatio: 416 / 302,
        width: '100%',
        maxWidth: 380,
        maxHeight: 300,
        alignSelf: 'center',
        backgroundColor: 'transparent',
    },
    promoEmpty: {
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    promoEmptyTitle: {
        marginTop: 12,
        color: TEXT,
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    promoEmptyHint: {
        marginTop: 8,
        color: META,
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
    },
    promoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        gap: 8,
    },
    promoName: {
        width: 72,
        color: TEXT,
        fontSize: 13,
        fontWeight: '700',
    },
    promoBarWrap: {
        flex: 1,
        minWidth: 0,
    },
    promoBarTrack: {
        height: 8,
        backgroundColor: '#333',
        borderRadius: 4,
        overflow: 'hidden',
    },
    promoBarFill: {
        height: '100%',
        backgroundColor: GOLD,
        borderRadius: 4,
    },
    promoStats: {
        width: 76,
        alignItems: 'flex-end',
    },
    promoGuests: {
        color: TEXT,
        fontSize: 12,
        fontWeight: '800',
    },
    promoRev: {
        color: META,
        fontSize: 11,
        marginTop: 2,
    },
    zoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 0,
        gap: 10,
    },
    zoneRank: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#2C2C2E',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    zoneRankText: {
        color: TEXT,
        fontSize: 13,
        fontWeight: '800',
    },
    zoneName: {
        flex: 1,
        color: TEXT,
        fontSize: 17,
        fontWeight: '700',
        minWidth: 0,
    },
    zoneStats: {
        alignItems: 'flex-end',
    },
    zoneBookings: {
        color: TEXT,
        fontSize: 14,
        fontWeight: '800',
    },
    zoneRev: {
        color: META,
        fontSize: 13,
        marginTop: 2,
    },
});
