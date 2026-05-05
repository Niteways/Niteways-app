import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { Nightclub } from '../types';

interface VenueCardProps {
    venue: Nightclub;
    onPress: (venue: Nightclub) => void;
    onHeartPress?: () => void;
    isFavorited?: boolean;
    width?: number;
}

const getFallback = (name: string) => `https://picsum.photos/seed/${encodeURIComponent(name)}/800/600`;

const VenueCard: React.FC<VenueCardProps> = ({ venue, onPress, onHeartPress, isFavorited = false, width = 200 }) => {
    const fallback = getFallback(venue.name);
    const primaryImage =
        (venue.galleryImages && venue.galleryImages.length > 0)
            ? venue.galleryImages[0]
            : (venue.imageUrl && venue.imageUrl.length > 0 && !venue.imageUrl.includes('example.com'))
                ? venue.imageUrl
                : fallback;

    const [imageSource, setImageSource] = useState(primaryImage);
    const [imgError, setImgError] = useState(false);

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onPress(venue)}
            style={[styles.container, { width }]}
        >
            <ImageBackground
                source={{ uri: imageSource }}
                style={styles.imageBackground}
                imageStyle={styles.image}
                resizeMode="cover"
                onError={() => {
                    if (!imgError) {
                        setImgError(true);
                        setImageSource(fallback);
                    }
                }}
            >
                <LinearGradient 
                    colors={['transparent', '#0A0A0A']} 
                    locations={[0, 1]}
                    style={styles.gradientOverlay} 
                />

                {/* Heart button - top right */}
                <TouchableOpacity
                    style={styles.heartButton}
                    onPress={onHeartPress}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Icon
                        name={isFavorited ? 'heart' : 'heart-outline'}
                        size={18}
                        color={isFavorited ? '#EF4444' : '#fff'}
                    />
                </TouchableOpacity>

                {/* Info overlay - bottom */}
                <View style={styles.infoOverlay}>
                    <Text style={styles.name} numberOfLines={1}>{venue.name}</Text>
                    <View style={styles.detailsRow}>
                        <Text style={styles.price}>{venue.priceLevel || '$$'}</Text>
                        <Text style={styles.dot}>·</Text>
                        <Text style={styles.category}>{venue.category || 'Nightclub'}</Text>
                    </View>
                </View>
            </ImageBackground>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 14,
        overflow: 'hidden',
        marginRight: 12,
    },
    imageBackground: {
        height: 160,
        width: '100%',
        justifyContent: 'flex-end',
        backgroundColor: '#1A1A2E',
    },
    image: {
        borderRadius: 14,
    },
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '35%',
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
        overflow: 'hidden',
    },
    heartButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.35)',
        padding: 6,
        borderRadius: 20,
    },
    infoOverlay: {
        paddingHorizontal: 12,
        paddingBottom: 12,
        paddingTop: 28,
        // Dark gradient from bottom (overlay effect)
        backgroundColor: 'transparent',
    },
    name: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    price: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        fontWeight: '500',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    dot: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        marginHorizontal: 5,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    category: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        fontWeight: '500',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
});

export default VenueCard;
