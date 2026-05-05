import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

type NavTab = 'Home' | 'Events' | 'Map' | 'Profile';

interface BottomNavProps {
    activeTab: NavTab;
    navigation: any;
}

const tabs: { id: NavTab; label: string; icon: string; route: string }[] = [
    { id: 'Home', label: 'Home', icon: 'home-outline', route: 'Main' },
    { id: 'Events', label: 'Events', icon: 'calendar-outline', route: 'Events' },
    { id: 'Map', label: 'Map', icon: 'map-outline', route: 'Map' },
    { id: 'Profile', label: 'Profile', icon: 'person-outline', route: 'Profile' },
];

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, navigation }) => {
    return (
        <View style={styles.bottomNav}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <TouchableOpacity
                        key={tab.id}
                        style={styles.navItem}
                        onPress={() => navigation.navigate(tab.route)}
                    >
                        <Icon
                            name={isActive ? tab.icon.replace('-outline', '') : tab.icon}
                            size={18}
                            color={isActive ? '#fff' : '#6B7280'}
                        />
                        <Text style={[styles.navText, isActive && styles.activeNavText]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    bottomNav: {
        height: 80,
        backgroundColor: '#000',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: '#1F2937',
        paddingBottom: 20,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    navText: {
        fontSize: 10,
        marginTop: 4,
        color: '#6B7280',
    },
    activeNavText: {
        color: '#fff',
    },
});

export default BottomNav;
