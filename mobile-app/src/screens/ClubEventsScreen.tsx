import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Image,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import apiClient from '../services/api';

type Props = StackScreenProps<RootStackParamList, 'ClubEvents'>;

interface Event {
    id: string;
    name: string;
    description: string;
    date: string;
    price: number;
    imageUrl?: string;
}

export default function ClubEventsScreen({ route }: Props) {
    const { club } = route.params;
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            const response = await apiClient.get('/events');
            // Filter events for this specific club
            const clubEvents = response.data.filter(
                (event: any) => event.nightclubId === club.id
            );
            setEvents(clubEvents);
        } catch (error) {
            console.error('Failed to load events:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const renderEvent = ({ item }: { item: Event }) => (
        <View style={styles.eventCard}>
            {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.eventImage} />
            ) : (
                <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>📅</Text>
                </View>
            )}
            <View style={styles.eventContent}>
                <Text style={styles.eventName}>{item.name}</Text>
                <Text style={styles.eventDate}>📅 {formatDate(item.date)}</Text>
                <Text style={styles.eventDescription} numberOfLines={2}>
                    {item.description}
                </Text>
                <Text style={styles.eventPrice}>${item.price.toFixed(2)}</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text style={styles.loadingText}>Loading events...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Club Header */}
            <View style={styles.clubHeader}>
                <Text style={styles.clubName}>{club.name}</Text>
                <Text style={styles.clubLocation}>📍 {club.location}</Text>
                <Text style={styles.clubDescription}>{club.description}</Text>
            </View>

            {/* Events List */}
            <View style={styles.eventsSection}>
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
                <FlatList
                    data={events}
                    renderItem={renderEvent}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            No events scheduled yet. Check back soon!
                        </Text>
                    }
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    clubHeader: {
        backgroundColor: 'white',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    clubName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1d29',
        marginBottom: 5,
    },
    clubLocation: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 10,
    },
    clubDescription: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    eventsSection: {
        flex: 1,
        paddingTop: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1d29',
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    list: {
        padding: 15,
        paddingTop: 0,
    },
    eventCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 15,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    eventImage: {
        width: '100%',
        height: 150,
        backgroundColor: '#e5e7eb',
    },
    placeholderImage: {
        width: '100%',
        height: 150,
        backgroundColor: '#7C3AED',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 50,
    },
    eventContent: {
        padding: 15,
    },
    eventName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1d29',
        marginBottom: 5,
    },
    eventDate: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    eventDescription: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
        marginBottom: 10,
    },
    eventPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#7C3AED',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#6B7280',
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#6B7280',
        marginTop: 50,
    },
});
