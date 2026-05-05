import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { VenuePortalProvider } from '../../context/VenuePortalContext';
import type { VenuePortalStackParamList } from './venuePortalTypes';
import VenueMainScreen from './VenueMainScreen';
import VenueBookingDetailScreen from './VenueBookingDetailScreen';
import VenueUserProfileScreen from './VenueUserProfileScreen';
import VenueNotificationsScreen from './VenueNotificationsScreen';
import VenueCreateGuestListScreen from './VenueCreateGuestListScreen';
import VenueGuestListDetailScreen from './VenueGuestListDetailScreen';
import VenueGuestListSettingsScreen from './VenueGuestListSettingsScreen';
import VenueTicketTypeFormScreen from './VenueTicketTypeFormScreen';
import VenueTicketDetailScreen from './VenueTicketDetailScreen';

const Stack = createStackNavigator<VenuePortalStackParamList>();

/**
 * Phase 2: Venue app shell — same Supabase tables as the web dashboard
 * (table_bookings, guest lists, venues, profiles).
 */
export default function VenuePortalNavigator() {
    return (
        <VenuePortalProvider>
            <Stack.Navigator
                screenOptions={{ headerShown: false }}
                detachInactiveScreens={false}
            >
                <Stack.Screen name="VenueMain" component={VenueMainScreen} />
                <Stack.Screen name="VenueBookingDetail" component={VenueBookingDetailScreen} />
                <Stack.Screen name="VenueUserProfile" component={VenueUserProfileScreen} />
                <Stack.Screen name="VenueNotifications" component={VenueNotificationsScreen} />
                <Stack.Screen name="VenueCreateGuestList" component={VenueCreateGuestListScreen} />
                <Stack.Screen name="VenueGuestListDetail" component={VenueGuestListDetailScreen} />
                <Stack.Screen name="VenueGuestListSettings" component={VenueGuestListSettingsScreen} />
                <Stack.Screen name="VenueTicketTypeForm" component={VenueTicketTypeFormScreen} />
                <Stack.Screen name="VenueTicketDetail" component={VenueTicketDetailScreen} />
            </Stack.Navigator>
        </VenuePortalProvider>
    );
}
