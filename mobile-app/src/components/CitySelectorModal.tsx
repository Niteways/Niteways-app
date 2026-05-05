import React, { useState, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    StatusBar,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface City {
    id: string;
    name: string;
    country: string;
}

interface CitySelectorModalProps {
    visible: boolean;
    onClose: () => void;
    cities: City[];
    selectedCity?: City;
    onCitySelect: (cityId: string | undefined) => void;
}

export const CitySelectorModal: React.FC<CitySelectorModalProps> = ({
    visible,
    onClose,
    cities,
    selectedCity,
    onCitySelect,
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter cities based on search
    const filteredCities = useMemo(() => {
        if (!searchQuery.trim()) return cities;
        const query = searchQuery.toLowerCase();
        return cities.filter(
            (city) =>
                city.name.toLowerCase().includes(query) ||
                city.country.toLowerCase().includes(query)
        );
    }, [cities, searchQuery]);

    // Group cities by country
    const citiesByCountry = useMemo(() => {
        const grouped: Record<string, City[]> = {};
        filteredCities.forEach((city) => {
            if (!grouped[city.country]) {
                grouped[city.country] = [];
            }
            grouped[city.country].push(city);
        });
        return grouped;
    }, [filteredCities]);

    const handleSelect = (cityId: string | undefined) => {
        onCitySelect(cityId);
        onClose();
        setSearchQuery('');
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.container}>
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Select City</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Icon name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Icon name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search cities or countries..."
                        placeholderTextColor="#6B7280"
                        autoFocus
                    />
                </View>

                {/* Current Selection */}
                {selectedCity && !searchQuery && (
                    <View style={styles.currentSelectionContainer}>
                        <Text style={styles.sectionLabel}>CURRENTLY SELECTED</Text>
                        <View style={styles.selectedCityCard}>
                            <View style={styles.selectedCityIcon}>
                                <Icon name="location" size={20} color="#FBBF24" />
                            </View>
                            <View style={styles.selectedCityInfo}>
                                <Text style={styles.selectedCityName}>{selectedCity.name}</Text>
                                <Text style={styles.selectedCityCountry}>{selectedCity.country}</Text>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.divider} />

                {/* Scrollable City List */}
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    <View style={styles.cityListContainer}>
                        {!searchQuery && (
                            <Text style={styles.sectionLabel}>ALL CITIES</Text>
                        )}

                        {/* All Cities option */}
                        {!searchQuery && (
                            <TouchableOpacity
                                onPress={() => handleSelect(undefined)}
                                style={[
                                    styles.cityItem,
                                    !selectedCity && styles.cityItemSelected,
                                ]}
                            >
                                <View style={[
                                    styles.cityIcon,
                                    !selectedCity && styles.cityIconSelected,
                                ]}>
                                    <Icon
                                        name="globe-outline"
                                        size={20}
                                        color={!selectedCity ? '#FBBF24' : '#9CA3AF'}
                                    />
                                </View>
                                <View style={styles.cityInfo}>
                                    <Text style={[
                                        styles.cityName,
                                        !selectedCity && styles.cityNameSelected,
                                    ]}>All Cities</Text>
                                    <Text style={styles.cityCountry}>Show clubs everywhere</Text>
                                </View>
                                <Icon name="chevron-forward" size={20} color="#6B7280" />
                            </TouchableOpacity>
                        )}

                        {Object.keys(citiesByCountry).length > 0 ? (
                            <View style={styles.cityList}>
                                {Object.entries(citiesByCountry).map(([country, countryCities]) => (
                                    <View key={country} style={styles.countryGroup}>
                                        <View style={styles.countryHeader}>
                                            <Icon name="globe-outline" size={12} color="#9CA3AF" />
                                            <Text style={styles.countryName}>{country}</Text>
                                        </View>
                                        <View style={styles.cityItems}>
                                            {countryCities.map((city) => (
                                                <TouchableOpacity
                                                    key={city.id}
                                                    onPress={() => handleSelect(city.id)}
                                                    style={[
                                                        styles.cityItem,
                                                        selectedCity?.id === city.id && styles.cityItemSelected,
                                                    ]}
                                                >
                                                    <View
                                                        style={[
                                                            styles.cityIcon,
                                                            selectedCity?.id === city.id && styles.cityIconSelected,
                                                        ]}
                                                    >
                                                        <Icon
                                                            name="location"
                                                            size={20}
                                                            color={selectedCity?.id === city.id ? '#FBBF24' : '#9CA3AF'}
                                                        />
                                                    </View>
                                                    <View style={styles.cityInfo}>
                                                        <Text
                                                            style={[
                                                                styles.cityName,
                                                                selectedCity?.id === city.id && styles.cityNameSelected,
                                                            ]}
                                                        >
                                                            {city.name}
                                                        </Text>
                                                        <Text style={styles.cityCountry}>{city.country}</Text>
                                                    </View>
                                                    <Icon name="chevron-forward" size={20} color="#6B7280" />
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <Icon name="location-outline" size={48} color="#4B5563" />
                                <Text style={styles.emptyStateText}>No cities found</Text>
                                <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 48 : (StatusBar.currentHeight || 0) + 16,
        paddingBottom: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeButton: {
        padding: 8,
        borderRadius: 20,
    },
    searchContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.5)',
        paddingHorizontal: 12,
        height: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 15,
        padding: 0,
    },
    currentSelectionContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 8,
    },
    sectionLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 12,
    },
    selectedCityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.3)',
    },
    selectedCityIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedCityInfo: {
        flex: 1,
    },
    selectedCityName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FBBF24',
    },
    selectedCityCountry: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#374151',
    },
    scrollView: {
        flex: 1,
    },
    cityListContainer: {
        padding: 16,
        paddingBottom: 80,
    },
    cityList: {
        gap: 16,
    },
    countryGroup: {
        marginBottom: 16,
    },
    countryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    countryName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#9CA3AF',
    },
    cityItems: {
        gap: 4,
    },
    cityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 12,
    },
    cityItemSelected: {
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.3)',
    },
    cityIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1F2937',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cityIconSelected: {
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
    },
    cityInfo: {
        flex: 1,
    },
    cityName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#fff',
    },
    cityNameSelected: {
        color: '#FBBF24',
    },
    cityCountry: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#9CA3AF',
        marginTop: 12,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
});
