import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { TableItem, Landmark, ClubTableLayout } from '../data/tableLayouts';

const MAP_HEIGHT = 360;
const BADGE_W = 72;
const BADGE_H = 50;
const LANDMARK_W = 70;
const LANDMARK_H = 32;

interface TableLayoutMapProps {
    layout: ClubTableLayout;
    selectedTableId: string | null;
    onSelectTable: (table: TableItem) => void;
}

const TableLayoutMap: React.FC<TableLayoutMapProps> = ({
    layout,
    selectedTableId,
    onSelectTable,
}) => {
    return (
        <View style={styles.wrapper}>
            <Text style={styles.title}>Select a Table</Text>

            {/* Floor Plan Canvas */}
            <View style={[styles.canvas, { height: MAP_HEIGHT }]}>
                {/* Landmarks */}
                {layout.landmarks.map(landmark => (
                    <View
                        key={landmark.id}
                        style={[
                            styles.landmark,
                            {
                                left: `${landmark.x}%`,
                                top: `${landmark.y}%`,
                                marginLeft: -(LANDMARK_W / 2),
                                marginTop: -(LANDMARK_H / 2),
                            },
                        ]}
                    >
                        <Icon name={landmark.icon} size={13} color="#6B7280" />
                        <Text style={styles.landmarkText}>{landmark.label}</Text>
                    </View>
                ))}

                {/* Tables */}
                {layout.tables.map(table => {
                    const isSelected = selectedTableId === table.id;
                    const isVip = table.type === 'vip';

                    return (
                        <TouchableOpacity
                            key={table.id}
                            activeOpacity={0.7}
                            onPress={() => onSelectTable(table)}
                            style={[
                                styles.tableButton,
                                {
                                    left: `${table.x}%`,
                                    top: `${table.y}%`,
                                    marginLeft: -(BADGE_W / 2),
                                    marginTop: -(BADGE_H / 2),
                                },
                            ]}
                        >
                            <View
                                style={[
                                    styles.tableBadge,
                                    isVip ? styles.vipBadge : styles.stdBadge,
                                    isSelected && styles.selectedBadge,
                                ]}
                            >
                                <Icon
                                    name="people"
                                    size={12}
                                    color={isVip ? '#FBBF24' : '#9CA3AF'}
                                />
                                <Text style={[
                                    styles.tableLabel,
                                    isVip ? styles.vipLabel : styles.stdLabel,
                                ]}>
                                    {table.label}
                                </Text>
                                <Text style={[
                                    styles.tablePrice,
                                    isVip ? styles.vipPrice : styles.stdPrice,
                                ]}>
                                    {table.currency}{table.price}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#9CA3AF' }]} />
                    <Text style={styles.legendText}>Standard</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FBBF24' }]} />
                    <Text style={styles.legendText}>VIP</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: 20,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    canvas: {
        backgroundColor: '#0D0F14',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1F2937',
        position: 'relative',
        overflow: 'hidden',
    },
    // Landmarks — subtle gray
    landmark: {
        position: 'absolute',
        width: LANDMARK_W,
        height: LANDMARK_H,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: '#15171D',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#23262E',
    },
    landmarkText: {
        color: '#6B7280',
        fontSize: 11,
        fontWeight: '600',
    },
    // Table base
    tableButton: {
        position: 'absolute',
        width: BADGE_W,
        height: BADGE_H,
        zIndex: 1,
    },
    tableBadge: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    tableLabel: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 1,
    },
    tablePrice: {
        fontSize: 10,
        fontWeight: '600',
    },
    // === VIP — gold filled ===
    vipBadge: {
        backgroundColor: '#2A2008',
        borderWidth: 2,
        borderColor: '#FBBF24',
    },
    vipLabel: {
        color: '#FBBF24',
    },
    vipPrice: {
        color: '#FBBF24',
    },
    // === Standard — dark outline ===
    stdBadge: {
        backgroundColor: '#111318',
        borderWidth: 1.5,
        borderColor: '#4B5563',
    },
    stdLabel: {
        color: '#D1D5DB',
    },
    stdPrice: {
        color: '#9CA3AF',
    },
    // === Selected ===
    selectedBadge: {
        borderColor: '#4ADE80',
        backgroundColor: '#0A1F12',
    },
    // Legend
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        marginTop: 14,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 2,
    },
    legendText: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '500',
    },
});

export default TableLayoutMap;
