import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { VP } from './venuePortalTheme';

export function VenuePlaceholderTab({ title, body }: { title: string; body?: string }) {
    return (
        <View style={styles.wrap}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>
                {body ??
                    'This area will be built in the next step. Use the menu (More) to open other sections.'}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        flex: 1,
        backgroundColor: VP.bg,
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    title: { color: VP.text, fontSize: 28, fontWeight: '800', marginBottom: 12 },
    body: { color: VP.muted, fontSize: 15, lineHeight: 22 },
});
