import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { authService } from '../services/auth';

const MIN_SPLASH_MS = 1800;
const AUTH_CHECK_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => {
            setTimeout(() => resolve(fallback), ms);
        }),
    ]);
}

const SplashScreen = ({ navigation }: any) => {
    useEffect(() => {
        let cancelled = false;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        const resetTo = (name: 'Welcome' | 'Main' | 'VenuePortal') => {
            if (cancelled) return;
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name }],
                }),
            );
        };

        const run = async () => {
            const startedAt = Date.now();
            try {
                const isAuth = await withTimeout(
                    authService.isAuthenticated(),
                    AUTH_CHECK_TIMEOUT_MS,
                    false,
                );
                if (cancelled) return;

                if (isAuth) {
                    try {
                        await authService.refreshUserCache();
                    } catch {
                        /* offline / Supabase issues — still route by session */
                    }
                    const role = await authService.getAppRole();
                    if (cancelled) return;
                    const target = role === 'venue_owner' ? 'VenuePortal' : 'Main';
                    const wait = Math.max(0, MIN_SPLASH_MS - (Date.now() - startedAt));
                    timeoutId = setTimeout(() => resetTo(target), wait);
                    return;
                }

                const wait = Math.max(0, MIN_SPLASH_MS - (Date.now() - startedAt));
                timeoutId = setTimeout(() => resetTo('Welcome'), wait);
            } catch {
                if (cancelled) return;
                const wait = Math.max(0, MIN_SPLASH_MS - (Date.now() - startedAt));
                timeoutId = setTimeout(() => resetTo('Welcome'), wait);
            }
        };

        void run();

        return () => {
            cancelled = true;
            if (timeoutId !== undefined) clearTimeout(timeoutId);
        };
    }, [navigation]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🎉</Text>
            <Text style={styles.appName}>Nightclub App</Text>
            <ActivityIndicator size="large" color="#7C3AED" style={styles.loader} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 80,
        marginBottom: 16,
    },
    appName: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    loader: {
        marginTop: 32,
    },
});

export default SplashScreen;
