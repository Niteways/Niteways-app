import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: screenWidth } = Dimensions.get('window');

interface CalendarPickerProps {
    visible: boolean;
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    onClose: () => void;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const CalendarPicker: React.FC<CalendarPickerProps> = ({
    visible,
    selectedDate,
    onSelectDate,
    onClose,
}) => {
    const [viewDate, setViewDate] = useState(new Date(selectedDate));

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    const isToday = (day: number) =>
        day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

    const isSelected = (day: number) =>
        day === selectedDate.getDate() &&
        month === selectedDate.getMonth() &&
        year === selectedDate.getFullYear();

    const goToPrevMonth = () => {
        setViewDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setViewDate(new Date(year, month + 1, 1));
    };

    const handleDayPress = (day: number) => {
        const newDate = new Date(year, month, day);
        onSelectDate(newDate);
        onClose();
    };

    // Build calendar grid
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push(d);
    }

    // Fill remaining cells to complete the last row
    while (cells.length % 7 !== 0) {
        cells.push(null);
    }

    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
        rows.push(cells.slice(i, i + 7));
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity activeOpacity={1} style={styles.calendarContainer}>
                    {/* Month Navigation */}
                    <View style={styles.monthHeader}>
                        <TouchableOpacity onPress={goToPrevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Icon name="chevron-back" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                        <Text style={styles.monthTitle}>
                            {MONTHS[month]} {year}
                        </Text>
                        <TouchableOpacity onPress={goToNextMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Icon name="chevron-forward" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>

                    {/* Day Headers */}
                    <View style={styles.dayHeaderRow}>
                        {DAYS.map(day => (
                            <Text key={day} style={styles.dayHeaderText}>{day}</Text>
                        ))}
                    </View>

                    {/* Calendar Grid */}
                    {rows.map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.weekRow}>
                            {row.map((day, colIndex) => (
                                <TouchableOpacity
                                    key={colIndex}
                                    style={styles.dayCell}
                                    onPress={() => day && handleDayPress(day)}
                                    disabled={!day}
                                >
                                    {day && (
                                        <View
                                            style={[
                                                styles.dayCircle,
                                                (isSelected(day) || isToday(day)) && styles.selectedDayCircle,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.dayText,
                                                    (isSelected(day) || isToday(day)) && styles.selectedDayText,
                                                ]}
                                            >
                                                {day}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const cellSize = (screenWidth - 80) / 7;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarContainer: {
        backgroundColor: '#161B22',
        borderRadius: 16,
        paddingVertical: 20,
        paddingHorizontal: 16,
        width: screenWidth - 48,
    },
    monthHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    monthTitle: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    dayHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 8,
    },
    dayHeaderText: {
        color: '#6B7280',
        fontSize: 13,
        fontWeight: '600',
        width: cellSize,
        textAlign: 'center',
    },
    weekRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    dayCell: {
        width: cellSize,
        height: cellSize,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedDayCircle: {
        backgroundColor: '#F87171',
    },
    dayText: {
        color: '#D1D5DB',
        fontSize: 14,
        fontWeight: '500',
    },
    selectedDayText: {
        color: '#fff',
        fontWeight: '700',
    },
});

export default CalendarPicker;
