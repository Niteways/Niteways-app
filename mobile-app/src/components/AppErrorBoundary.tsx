import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';

type Props = { children: ReactNode };

type State = { error: Error | null };

/** Surfaces JS render errors instead of a blank black screen. */
export class AppErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error('[AppErrorBoundary]', error.message, info.componentStack);
    }

    render(): ReactNode {
        if (this.state.error) {
            return (
                <View style={styles.wrap}>
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.sub}>
                        The app hit a JavaScript error. Check Metro / Logcat for details.
                    </Text>
                    <ScrollView style={styles.box}>
                        <Text style={styles.trace}>{this.state.error.message}</Text>
                    </ScrollView>
                    <TouchableOpacity
                        style={styles.btn}
                        onPress={() => this.setState({ error: null })}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.btnText}>Try again</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    wrap: {
        flex: 1,
        backgroundColor: '#111',
        padding: 24,
        justifyContent: 'center',
    },
    title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
    sub: { color: '#9CA3AF', fontSize: 14, marginBottom: 16 },
    box: {
        maxHeight: 200,
        backgroundColor: '#000',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    trace: {
        color: '#F87171',
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    btn: { backgroundColor: '#7C3AED', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
