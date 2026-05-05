import React, { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../config/supabase';
import { useVenuePortal } from '../../context/VenuePortalContext';
import { useRealtimeTicketPurchases, type TicketPurchaseRow } from '../../hooks/useRealtimeTicketPurchases';
import type { VenueTicketType } from '../../hooks/useVenueTicketTypes';
import { isMissingSchemaTableError } from '../../utils/supabasePostgrestErrors';
import { VP, VP_PARTITION_LINE } from './venuePortalTheme';
import type { VenuePortalStackParamList } from './venuePortalTypes';
import { venuePortalSafeGoBack } from './venuePortalNavigation';

type Nav = StackNavigationProp<VenuePortalStackParamList, 'VenueTicketDetail'>;
type R = RouteProp<VenuePortalStackParamList, 'VenueTicketDetail'>;

export default function VenueTicketDetailScreen({ navigation, route }: { navigation: Nav; route: R }) {
    const { ticketId } = route.params;
    const { venueId, loading: venueLoading } = useVenuePortal();
    const { purchases, isLoading: purchasesLoading, refetch: refetchPurchases } = useRealtimeTicketPurchases({
        venueId,
    });

    const [ticket, setTicket] = useState<VenueTicketType | null>(null);
    const [ticketLoading, setTicketLoading] = useState(true);
    const [ticketErr, setTicketErr] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadTicket = useCallback(async () => {
        if (!venueId) {
            setTicket(null);
            setTicketLoading(false);
            return;
        }
        setTicketLoading(true);
        setTicketErr(null);
        try {
            const { data, error } = await supabase
                .from('venue_tickets')
                .select('*')
                .eq('id', ticketId)
                .eq('venue_id', venueId)
                .maybeSingle();

            if (error) throw error;
            setTicket(data as VenueTicketType | null);
        } catch (e) {
            if (!isMissingSchemaTableError(e)) {
                console.warn('[VenueTicketDetail] load ticket', e);
            }
            setTicketErr(e instanceof Error ? e.message : 'Failed to load');
            setTicket(null);
        } finally {
            setTicketLoading(false);
        }
    }, [ticketId, venueId]);

    useFocusEffect(
        useCallback(() => {
            void loadTicket();
            void refetchPurchases();
        }, [loadTicket, refetchPurchases])
    );

    const relatedPurchases = useMemo(() => {
        if (!ticket) return [];
        return purchases.filter((p) => p.ticket_type === ticket.name);
    }, [purchases, ticket]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadTicket();
        await refetchPurchases();
        setRefreshing(false);
    };

    const renderPurchase = ({ item }: { item: TicketPurchaseRow }) => {
        const total = Number(item.price) * (item.quantity || 1);
        return (
            <View style={styles.orderCard}>
                <Text style={styles.orderName}>{item.guest_name}</Text>
                <Text style={styles.orderMeta}>
                    {item.ticket_id} · {item.status}
                </Text>
                <Text style={styles.orderMeta}>
                    {item.event_date} · Qty {item.quantity ?? 1} · ${total.toFixed(2)}
                </Text>
            </View>
        );
    };

    if (venueLoading && !venueId) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={VP.gold} />
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

    return (
        <View style={styles.fill}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => venuePortalSafeGoBack(navigation)} hitSlop={12} style={styles.hIcon}>
                    <Icon name="chevron-back" size={26} color={VP.gold} />
                </TouchableOpacity>
                <Text style={styles.hTitle} numberOfLines={1}>
                    {ticket?.name || 'Ticket'}
                </Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('VenueTicketTypeForm', { mode: 'edit', ticketId })}
                    hitSlop={8}
                    style={styles.hIcon}
                >
                    <Icon name="create-outline" size={22} color={VP.gold} />
                </TouchableOpacity>
            </View>
            <View style={VP_PARTITION_LINE} />
            {ticketLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={VP.gold} />
                </View>
            ) : ticketErr ? (
                <Text style={styles.muted}>{ticketErr}</Text>
            ) : !ticket ? (
                <Text style={styles.muted}>Ticket not found.</Text>
            ) : (
                <>
                    <View style={styles.summary}>
                        <Text style={styles.price}>${Number(ticket.price).toFixed(2)}</Text>
                        <Text style={styles.meta}>
                            {ticket.type} · {ticket.status} · Sold {ticket.sold} / {ticket.quantity}
                        </Text>
                        {ticket.description ? <Text style={styles.desc}>{ticket.description}</Text> : null}
                    </View>
                    <Text style={styles.sectionTitle}>Orders for this type</Text>
                    <View style={styles.listFlex}>
                        {purchasesLoading && !refreshing ? (
                            <ActivityIndicator color={VP.gold} style={{ marginTop: 16 }} />
                        ) : (
                            <FlatList
                                data={relatedPurchases}
                                keyExtractor={(i) => i.id}
                                renderItem={renderPurchase}
                                contentContainerStyle={styles.listPad}
                                style={styles.listFlex}
                                refreshControl={
                                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={VP.gold} />
                                }
                                ListEmptyComponent={
                                    <Text style={styles.muted}>No purchases for this ticket name yet.</Text>
                                }
                            />
                        )}
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1, backgroundColor: VP.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    muted: { color: VP.muted, textAlign: 'center', marginTop: 24, paddingHorizontal: 24 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 8,
    },
    hIcon: { width: 40, alignItems: 'center' },
    hTitle: { flex: 1, color: VP.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
    summary: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)' },
    price: { color: VP.teal, fontSize: 28, fontWeight: '800' },
    meta: { color: VP.muted, marginTop: 6, fontSize: 13 },
    desc: { color: VP.text, marginTop: 10, fontSize: 14, lineHeight: 20 },
    sectionTitle: {
        color: VP.text,
        fontWeight: '800',
        fontSize: 15,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    listFlex: { flex: 1 },
    listPad: { paddingHorizontal: 16, paddingBottom: 32 },
    orderCard: {
        backgroundColor: VP.card,
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: VP.cardBorder,
    },
    orderName: { color: VP.text, fontWeight: '700', fontSize: 16 },
    orderMeta: { color: VP.muted, fontSize: 12, marginTop: 4 },
});
