import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
    VENUE_FLOOR_MAP_TABLES,
    VENUE_FLOOR_MAP_LANDMARKS,
    type VenueFloorTable,
} from './venueTableBookingFloorData';
import { VP } from './venuePortalTheme';

const MAP_H = 340;

const VISUAL: Record<string, { bg: string; border: string; label: string; sub: string }> = {
    available: { bg: 'rgba(54, 186, 152, 0.35)', border: '#36BA98', label: '#ECFDF5', sub: 'rgba(236,253,245,0.85)' },
    reserved: { bg: 'rgba(233, 196, 106, 0.35)', border: '#E9C46A', label: '#FFFBEB', sub: 'rgba(255,251,235,0.85)' },
    pending: { bg: 'rgba(59, 130, 246, 0.35)', border: '#3B82F6', label: '#EFF6FF', sub: 'rgba(239,246,255,0.85)' },
    blocked: { bg: 'rgba(239, 68, 68, 0.35)', border: '#EF4444', label: '#FEF2F2', sub: 'rgba(254,242,242,0.85)' },
    vip: { bg: 'rgba(232, 121, 249, 0.3)', border: '#E879F9', label: '#FDF4FF', sub: 'rgba(253,244,255,0.85)' },
    yellow: { bg: 'rgba(233, 196, 106, 0.4)', border: '#E9C46A', label: '#1A1408', sub: 'rgba(26,20,8,0.75)' },
    pink: { bg: 'rgba(244, 114, 182, 0.45)', border: '#F472B6', label: '#1A0A12', sub: 'rgba(26,10,18,0.75)' },
    teal: { bg: 'rgba(45, 212, 191, 0.4)', border: '#2DD4BF', label: '#042F2E', sub: 'rgba(4,47,46,0.8)' },
    purple: { bg: 'rgba(155, 89, 182, 0.45)', border: '#9B59B6', label: '#FAF5FF', sub: 'rgba(250,245,255,0.85)' },
    green: { bg: 'rgba(34, 197, 94, 0.4)', border: '#22C55E', label: '#F0FDF4', sub: 'rgba(240,253,244,0.85)' },
    red: { bg: 'rgba(239, 68, 68, 0.4)', border: '#EF4444', label: '#FEF2F2', sub: 'rgba(254,242,242,0.85)' },
    blue: { bg: 'rgba(59, 130, 246, 0.4)', border: '#3B82F6', label: '#EFF6FF', sub: 'rgba(239,246,255,0.85)' },
};

/** Tight blueprint-style square grid (near-black field + faint lines) */
function GridLines() {
    const cols = 24;
    const rows = 28;
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {Array.from({ length: cols + 1 }).map((_, i) => (
                <View
                    key={`v${i}`}
                    style={[
                        styles.gridLineV,
                        i % 4 === 0 ? styles.gridLineMajor : null,
                        { left: `${(i / cols) * 100}%` },
                    ]}
                />
            ))}
            {Array.from({ length: rows + 1 }).map((_, i) => (
                <View
                    key={`h${i}`}
                    style={[
                        styles.gridLineH,
                        i % 4 === 0 ? styles.gridLineMajor : null,
                        { top: `${(i / rows) * 100}%` },
                    ]}
                />
            ))}
        </View>
    );
}

const LEGEND = [
    { key: 'available', label: 'Available', dot: '#36BA98', bg: 'rgba(54, 186, 152, 0.18)' },
    { key: 'reserved', label: 'Reserved', dot: '#E9C46A', bg: 'rgba(233, 196, 106, 0.18)' },
    { key: 'pending', label: 'Pending', dot: '#3B82F6', bg: 'rgba(59, 130, 246, 0.18)' },
    { key: 'blocked', label: 'Blocked', dot: '#EF4444', bg: 'rgba(239, 68, 68, 0.18)' },
    { key: 'vip', label: 'VIP', dot: '#F472B6', bg: 'rgba(244, 114, 182, 0.18)' },
];

export function VenueTableBookingFloorMap({ onTablePress }: { onTablePress?: (t: VenueFloorTable) => void }) {
    const [mapW, setMapW] = useState(0);

    const px = (pct: number) => (mapW * pct) / 100;

    return (
        <View style={styles.section}>
            <Text style={styles.floorTitle}>Floor Map</Text>
            <View style={styles.legendWrap}>
                {LEGEND.map((L) => (
                    <View key={L.key} style={[styles.legendPill, { backgroundColor: L.bg }]}>
                        <View style={[styles.legendDot, { backgroundColor: L.dot }]} />
                        <Text style={styles.legendText}>{L.label}</Text>
                    </View>
                ))}
            </View>

            <View
                style={[styles.mapBox, { height: MAP_H }]}
                onLayout={(e) => setMapW(e.nativeEvent.layout.width)}
            >
                <GridLines />
                {mapW > 0 &&
                    VENUE_FLOOR_MAP_LANDMARKS.map((lm) => {
                        const lw = px(lm.w);
                        const lh = (MAP_H * lm.h) / 100;
                        const left = px(lm.x) - lw / 2;
                        const top = (MAP_H * lm.y) / 100 - lh / 2;
                        return (
                            <View
                                key={lm.id}
                                style={[
                                    styles.landmark,
                                    {
                                        width: lw,
                                        height: lh,
                                        left,
                                        top,
                                    },
                                ]}
                            >
                                <Icon name={lm.icon as any} size={14} color="#9CA3AF" />
                                <Text style={styles.landmarkText}>{lm.label}</Text>
                            </View>
                        );
                    })}
                {mapW > 0 &&
                    VENUE_FLOOR_MAP_TABLES.map((t) => {
                        const tw = px(t.w);
                        const th = (MAP_H * t.h) / 100;
                        const left = px(t.x) - tw / 2;
                        const top = (MAP_H * t.y) / 100 - th / 2;
                        const v = VISUAL[t.visual] || VISUAL.available;
                        return (
                            <TouchableOpacity
                                key={t.id}
                                activeOpacity={0.85}
                                onPress={() => onTablePress?.(t)}
                                style={[
                                    styles.tableChip,
                                    {
                                        width: tw,
                                        height: th,
                                        left,
                                        top,
                                        backgroundColor: v.bg,
                                        borderColor: v.border,
                                    },
                                ]}
                            >
                                <Text style={[styles.tableLabel, { color: v.label }]} numberOfLines={1}>
                                    {t.label}
                                </Text>
                                <Text style={[styles.tablePax, { color: v.sub }]}>{t.pax} pax</Text>
                                <Text style={[styles.tablePrice, { color: v.label }]}>${t.price}</Text>
                            </TouchableOpacity>
                        );
                    })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: 8,
    },
    floorTitle: {
        color: VP.text,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 22,
    },
    legendWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14,
    },
    legendPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        gap: 8,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        color: VP.text,
        fontSize: 12,
        fontWeight: '700',
    },
    mapBox: {
        backgroundColor: VP.bg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
        position: 'relative',
        overflow: 'hidden',
    },
    gridLineV: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.045)',
    },
    gridLineH: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.045)',
    },
    gridLineMajor: {
        backgroundColor: 'rgba(255,255,255,0.085)',
    },
    landmark: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: 'rgba(30,30,36,0.92)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        zIndex: 0,
    },
    landmarkText: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '700',
    },
    tableChip: {
        position: 'absolute',
        borderRadius: 10,
        borderWidth: 2,
        paddingHorizontal: 4,
        paddingVertical: 3,
        zIndex: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tableLabel: {
        fontSize: 10,
        fontWeight: '800',
    },
    tablePax: {
        fontSize: 9,
        fontWeight: '600',
    },
    tablePrice: {
        fontSize: 9,
        fontWeight: '800',
        marginTop: 1,
    },
});
