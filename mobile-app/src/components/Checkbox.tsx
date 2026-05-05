import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

interface CheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    style?: any;
}

const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, label, style }) => {
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.container, style]}
            onPress={() => onChange(!checked)}
        >
            <View style={[styles.box, checked && styles.checkedBox]}>
                {checked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            {label && <Text style={styles.label}>{label}</Text>}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    box: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        backgroundColor: '#fff',
    },
    checkedBox: {
        backgroundColor: '#000',
        borderColor: '#000',
    },
    checkmark: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    label: {
        fontSize: 14,
        color: '#4B5563',
        flex: 1, // Allow text to wrap if needed
    },
});

export default Checkbox;
