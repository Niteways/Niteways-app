import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
    // Add any custom props here
}

const Input: React.FC<InputProps> = (props) => {
    return (
        <TextInput
            style={[styles.input, props.style]}
            placeholderTextColor="#9CA3AF"
            {...props}
        />
    );
};

const styles = StyleSheet.create({
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#111827',
        marginBottom: 16,
    },
});

export default Input;
