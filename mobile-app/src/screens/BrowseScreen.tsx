import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Image,
    StatusBar,
    Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { getVenues, Venue } from '../services/database';

type BrowseScreenNavigationProp = StackNavigationProp<
    RootStackParamList,
    'Browse'
>;

type Props = {
    navigation: BrowseScreenNavigationProp;
};

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80';

function NightclubCard({ item, onPress }: { item: Venue; onPress: () => void }) {
    const [imgErr, setImgErr] = useState(false);
    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            {item.image_url && !imgErr ? (
                <Image
                    source={{ uri: item.image_url }}
                    style={styles.image}
                    onError={() => setImgErr(true)}
                />
            ) : (
                <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>🏢</Text>
                </View>
            )}
            <View style={styles.cardContent}>
                <Text style={styles.clubName}>{item.name}</Text>
                <Text style={styles.location}>📍 {item.address}</Text>
                <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            </View>
        </TouchableOpacity>
    );
}

export default function BrowseScreen({ navigation }: Props) {
    const [nightclubs, setNightclubs] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNightclubs();
    }, []);

    const loadNightclubs = async () => {
        try {
            const data = await getVenues();
            setNightclubs(data);
        } catch (error) {
            console.error('Failed to load nightclubs:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderNightclub = ({ item }: { item: Venue }) => (
        <NightclubCard
            item={item}
            onPress={() => navigation.navigate('VenueDetail', { club: {
                id: item.id,
                name: item.name,
                description: item.description,
                imageUrl: item.image_url,
                image: item.image_url,
                location: item.address,
                city: (item as any).cities?.name || '',
                latitude: item.latitude,
                longitude: item.longitude,
                genre: item.genre,
                vibe: item.vibe,
                minAge: item.min_age,
                dressCode: item.dress_code,
            }})}
        />
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#FBBF24" />
                <Text style={styles.loadingText}>Loading nightclubs...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <View style={styles.headerContainer}>
                <Text style={styles.header}>🎉 Browse Nightclubs</Text>
            </View>
            <FlatList
                data={nightclubs}
                renderItem={renderNightclub}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>
                        No nightclubs available. Add some via Admin Dashboard!
                    </Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    headerContainer: {
        paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 16,
        backgroundColor: '#000',
        borderBottomWidth: 1,
        borderBottomColor: '#1F2937',
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        paddingHorizontal: 20,
        paddingBottom: 16,
        color: '#fff',
    },
    list: {
        padding: 15,
    },
    card: {
        backgroundColor: '#1F2937',
        borderRadius: 12,
        marginBottom: 15,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    image: {
        width: '100%',
        height: 180,
        backgroundColor: '#111',
    },
    placeholderImage: {
        width: '100%',
        height: 180,
        backgroundColor: '#1F2937',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 60,
    },
    cardContent: {
        padding: 15,
    },
    clubName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    location: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 8,
    },
    description: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#9CA3AF',
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#6B7280',
        marginTop: 50,
    },
});
