import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import Input from '../components/Input';
import Button from '../components/Button';
import { authService } from '../services/auth';

const VerificationScreen = ({ route, navigation }: any) => {
    const { mobile } = route.params;
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        if (code.length !== 6) {
            Alert.alert('Error', 'Please enter a 6-digit code');
            return;
        }

        try {
            setLoading(true);
            await authService.verify(mobile, code);
            navigation.replace('Main');
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <View style={styles.content}>
                <Text style={styles.emoji}>📱</Text>
                <Text style={styles.title}>Enter Code</Text>
                <Text style={styles.subtitle}>
                    We sent a verification code to{'\n'}
                    <Text style={styles.mobile}>{mobile}</Text>
                </Text>
                <Text style={styles.hint}>💡 For POC, use any 6-digit code</Text>

                <View style={styles.form}>
                    <Input
                        placeholder="000000"
                        value={code}
                        onChangeText={setCode}
                        keyboardType="number-pad"
                        maxLength={6}
                        textAlign="center"
                        style={styles.codeInput}
                        placeholderTextColor="#6B7280"
                    />
                    <Button
                        title="Verify"
                        onPress={handleVerify}
                        loading={loading}
                        disabled={code.length !== 6}
                    />
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    content: {
        flex: 1,
        padding: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 16,
        justifyContent: 'center',
    },
    emoji: {
        fontSize: 64,
        textAlign: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 16,
    },
    mobile: {
        fontWeight: '600',
        color: '#FBBF24',
    },
    hint: {
        fontSize: 14,
        color: '#FBBF24',
        textAlign: 'center',
        marginBottom: 32,
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        padding: 12,
        borderRadius: 8,
    },
    form: {
        width: '100%',
    },
    codeInput: {
        fontSize: 24,
        fontWeight: '600',
        letterSpacing: 8,
        color: '#fff',
        backgroundColor: '#1F2937',
        borderRadius: 12,
        marginBottom: 20,
    },
});

export default VerificationScreen;
