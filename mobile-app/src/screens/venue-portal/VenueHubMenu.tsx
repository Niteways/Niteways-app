import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

/**
 * Venue hub — matches reference: #0D0D0D shell, #161616 row cards
 * (muted gray icon left, white label), gray section headers, large radius.
 */
export const HUB_MENU_BG = '#0D0D0D';
const CARD_BG = '#161616';
const SECTION_MUTED = '#A0A0A0';
const ICON_MUTED = '#8E8E8E';
const SUBTITLE = '#9CA3AF';
const LABEL = '#FFFFFF';
const RULE = 'rgba(255, 255, 255, 0.06)';

const GUTTER = 16;
const PAD = 18;
const CARD_RADIUS = 20;

export type VenueHubAction =
    | 'dashboard'
    | 'table_booking'
    | 'booking_requests'
    | 'guest_list'
    | 'ticketing'
    | 'team'
    | 'team_statistics'
    | 'check_in'
    | 'security'
    | 'analytics'
    | 'reports'
    | 'settings'
    | 'venue_info';

type Props = {
    onAction: (action: VenueHubAction) => void;
    /** Bell + profile avatar (top-right of hub title row) */
    profileTray?: ReactNode;
};

function SectionTitle({ children }: { children: string }) {
    return (
        <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>{children}</Text>
            <View style={styles.sectionRule} />
        </View>
    );
}

function MenuTile({
    icon,
    label,
    onPress,
    expand,
    center,
    iconSize = 24,
}: {
    /** Omit to show label only (keeps text aligned with icon tiles). */
    icon?: string;
    label: string;
    onPress: () => void;
    expand?: boolean;
    /** Label-only tile: center text in the pill (e.g. Dashboard). */
    center?: boolean;
    iconSize?: number;
}) {
    const centeredLabelOnly = center && !icon;
    return (
        <TouchableOpacity
            style={[styles.tile, expand && styles.tileExpand]}
            onPress={onPress}
            activeOpacity={0.85}
        >
            <View
                style={[
                    styles.tileRowInner,
                    !icon && !centeredLabelOnly && styles.tileRowInnerSansIcon,
                    centeredLabelOnly && styles.tileRowInnerCentered,
                ]}
            >
                {icon ? (
                    <View style={styles.tileIconWrap}>
                        <Icon name={icon} size={iconSize} color={ICON_MUTED} />
                    </View>
                ) : null}
                <Text
                    style={[styles.tileLabel, centeredLabelOnly && styles.tileLabelCentered]}
                    numberOfLines={2}
                >
                    {label}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

function TileRow({ children }: { children: ReactNode }) {
    return <View style={styles.tileRow}>{children}</View>;
}

export function VenueHubMenu({ onAction, profileTray }: Props) {
    return (
        <View style={styles.root}>
            <View style={styles.pageHeader}>
                <View style={styles.pageHeaderRow}>
                    <View style={styles.pageHeaderTextCol}>
                        <Text style={styles.pageTitle}>Venue app</Text>
                        <Text style={styles.pageSub}>
                            Choose a section — we will open each area step by step.
                        </Text>
                    </View>
                    {profileTray}
                </View>
            </View>

            <ScrollView
                style={styles.flexBody}
                contentContainerStyle={styles.flexBodyScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.block1}>
                    <SectionTitle>OVERVIEW</SectionTitle>
                    <TileRow>
                        <MenuTile label="Dashboard" expand center onPress={() => onAction('dashboard')} />
                        <View style={styles.gutter} />
                        <View style={styles.tileRowHalfSpacer} />
                    </TileRow>
                </View>

                <View style={styles.block2}>
                    <SectionTitle>BOOKING MANAGEMENT</SectionTitle>
                    <View style={styles.block2Body}>
                        <TileRow>
                            <MenuTile icon="calendar-outline" label="Table Booking" expand onPress={() => onAction('table_booking')} />
                            <View style={styles.gutter} />
                            <MenuTile
                                icon="clipboard-outline"
                                label="Booking Requests"
                                expand
                                onPress={() => onAction('booking_requests')}
                            />
                        </TileRow>
                        <TileRow>
                            <MenuTile icon="id-card-outline" label="Guest List" expand onPress={() => onAction('guest_list')} />
                            <View style={styles.gutter} />
                            <MenuTile icon="sparkles-outline" label="Ticketing" expand onPress={() => onAction('ticketing')} />
                        </TileRow>
                    </View>
                </View>

                <View style={styles.block2}>
                    <SectionTitle>TEAM & SECURITY</SectionTitle>
                    <View style={styles.block2Body}>
                        <TileRow>
                            <MenuTile icon="person-outline" label="Team" expand onPress={() => onAction('team')} />
                            <View style={styles.gutter} />
                            <MenuTile
                                icon="bar-chart-outline"
                                label="Team Statistics"
                                expand
                                onPress={() => onAction('team_statistics')}
                            />
                        </TileRow>
                        <TileRow>
                            <MenuTile icon="qr-code-outline" label="Check In" expand onPress={() => onAction('check_in')} />
                            <View style={styles.gutter} />
                            <MenuTile icon="shield-outline" label="Security" expand onPress={() => onAction('security')} />
                        </TileRow>
                    </View>
                </View>

                <View style={styles.block1}>
                    <SectionTitle>REPORTS & ANALYTICS</SectionTitle>
                    <TileRow>
                        <MenuTile icon="bar-chart-outline" label="Analytics" expand onPress={() => onAction('analytics')} />
                        <View style={styles.gutter} />
                        <MenuTile icon="document-text-outline" label="Reports" expand onPress={() => onAction('reports')} />
                    </TileRow>
                </View>

                <View style={styles.block1}>
                    <SectionTitle>SETTINGS</SectionTitle>
                    <TileRow>
                        <MenuTile icon="settings-outline" label="Settings" expand onPress={() => onAction('settings')} />
                        <View style={styles.gutter} />
                        <MenuTile icon="business-outline" label="Venue Info" expand onPress={() => onAction('venue_info')} />
                    </TileRow>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: HUB_MENU_BG,
        paddingHorizontal: PAD,
        paddingTop: 10,
        paddingBottom: 4,
        minHeight: 0,
    },
    pageHeader: {
        marginBottom: 20,
    },
    pageHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
    },
    pageHeaderTextCol: {
        flex: 1,
        minWidth: 0,
        paddingRight: Platform.OS === 'ios' ? 4 : 0,
    },
    pageTitle: {
        color: LABEL,
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    pageSub: {
        color: SUBTITLE,
        fontSize: 15,
        lineHeight: 22,
    },
    flexBody: {
        flex: 1,
        minHeight: 0,
    },
    flexBodyScroll: {
        paddingBottom: 24,
    },
    sectionBlock: {
        marginBottom: 12,
    },
    sectionTitle: {
        color: SECTION_MUTED,
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    sectionRule: {
        height: StyleSheet.hairlineWidth,
        width: '100%',
        backgroundColor: RULE,
    },
    block1: {
        marginBottom: 14,
    },
    block2: {
        marginBottom: 14,
    },
    block2Body: {
        marginTop: 4,
        gap: GUTTER,
    },
    tileRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    gutter: {
        width: GUTTER,
    },
    /** Balances OVERVIEW row so Dashboard matches half-width tiles in other sections */
    tileRowHalfSpacer: {
        flex: 1,
        minWidth: 0,
        minHeight: 0,
    },
    tile: {
        backgroundColor: CARD_BG,
        borderRadius: CARD_RADIUS,
        minWidth: 0,
        minHeight: 20,
        justifyContent: 'center',
        overflow: 'visible',
    },
    tileExpand: {
        flex: 1,
    },
    tileRowInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingLeft: 20,
        paddingRight: 16,
        flex: 1,
        gap: 12,
        overflow: 'visible',
    },
    /** Match horizontal start of labels next to 36px icon + 12 gap */
    tileRowInnerSansIcon: {
        paddingLeft: 68,
    },
    /** Label-only tile centered in pill (Dashboard) */
    tileRowInnerCentered: {
        paddingLeft: 16,
        paddingRight: 16,
        justifyContent: 'center',
    },
    /** Fixed slot so vector icons are not clipped at the left edge of flex tiles */
    tileIconWrap: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
    },
    tileLabel: {
        flex: 1,
        color: LABEL,
        fontSize: 18,
        fontWeight: '700',
        lineHeight: 22,
    },
    tileLabelCentered: {
        flex: 0,
        flexShrink: 1,
        textAlign: 'center',
    },
});
