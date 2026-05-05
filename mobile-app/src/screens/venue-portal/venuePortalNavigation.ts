import { CommonActions } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { VenuePortalStackParamList } from './venuePortalTypes';

type VenuePortalNav = StackNavigationProp<VenuePortalStackParamList>;

/**
 * Pops when possible; otherwise resets the venue stack to VenueMain.
 * Avoids "GO_BACK was not handled" when there is no previous route (e.g. odd remounts / nested state).
 */
export function venuePortalSafeGoBack(navigation: VenuePortalNav): void {
    if (navigation.canGoBack()) {
        navigation.goBack();
        return;
    }
    navigation.dispatch(
        CommonActions.reset({
            index: 0,
            routes: [{ name: 'VenueMain' }],
        })
    );
}
