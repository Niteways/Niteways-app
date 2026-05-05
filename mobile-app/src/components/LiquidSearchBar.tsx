import React, { useRef } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface LiquidSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onFocus?: () => void;
    onBlur?: () => void;
}

const LiquidSearchBar: React.FC<LiquidSearchBarProps> = ({
    value,
    onChange,
    placeholder = 'What club are you looking for?',
    onFocus,
    onBlur,
}) => {
    const inputRef = useRef<TextInput>(null);

    return (
        <View style={styles.container}>
            <Icon name="search-outline" size={17} color="#414040ff" style={styles.icon} />
            <TextInput
                ref={inputRef}
                style={styles.input}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor="#999"
                onFocus={onFocus}
                onBlur={onBlur}
                returnKeyType="search"
                autoCorrect={false}
            />
            {value.length > 0 && (
                <TouchableOpacity
                    onPress={() => { onChange(''); inputRef.current?.blur(); }}
                    style={styles.clear}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Icon name="close-circle" size={18} color="#666" />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#090909ff',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#333',
        paddingHorizontal: 16,
        height: 48,
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 15,
        padding: 0,
    },
    clear: {
        marginLeft: 8,
    },
});

export default LiquidSearchBar;
