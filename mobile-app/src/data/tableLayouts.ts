import { Nightclub } from '../types';

export interface TableItem {
    id: string;
    label: string;
    type: 'standard' | 'vip';
    price: number;
    currency: string;
    /** Position as percentage of container (0-100) */
    x: number;
    y: number;
    /** Number of guests */
    capacity: number;
}

export interface Landmark {
    id: string;
    label: string;
    icon: string;
    x: number;
    y: number;
}

export interface ClubTableLayout {
    tables: TableItem[];
    landmarks: Landmark[];
}

const DEFAULT_LAYOUT: ClubTableLayout = {
    tables: [
        { id: 't-vip3', label: 'VIP 3', type: 'vip', price: 5000, currency: '€', x: 50, y: 12, capacity: 16 },
        { id: 't-vip2', label: 'VIP 2', type: 'vip', price: 3000, currency: '€', x: 15, y: 30, capacity: 12 },
        { id: 't-vip1', label: 'VIP 1', type: 'vip', price: 3000, currency: '€', x: 82, y: 30, capacity: 12 },
        { id: 't-1', label: 'T1', type: 'standard', price: 1500, currency: '€', x: 18, y: 60, capacity: 8 },
        { id: 't-2', label: 'T2', type: 'standard', price: 1500, currency: '€', x: 80, y: 60, capacity: 8 },
    ],
    landmarks: [
        { id: 'dj', label: 'DJ', icon: 'musical-notes', x: 50, y: 42 },
        { id: 'bar', label: 'Bar', icon: 'beer-outline', x: 50, y: 85 },
        { id: 'entry', label: 'Entry', icon: 'enter-outline', x: 85, y: 85 },
        { id: 'entry2', label: 'Entry 2', icon: 'enter-outline', x: 15, y: 85 },
    ],
};

const CUSTOM_LAYOUTS: Record<number, ClubTableLayout> = {
    1: {
        tables: [
            { id: 'liv-vip3', label: 'VIP 3', type: 'vip', price: 10000, currency: '$', x: 50, y: 10, capacity: 20 },
            { id: 'liv-vip1', label: 'VIP 1', type: 'vip', price: 8000, currency: '$', x: 82, y: 22, capacity: 16 },
            { id: 'liv-vip2', label: 'VIP 2', type: 'vip', price: 8000, currency: '$', x: 15, y: 22, capacity: 16 },
            { id: 'liv-t1', label: 'T1', type: 'standard', price: 3000, currency: '$', x: 15, y: 50, capacity: 10 },
            { id: 'liv-t2', label: 'T2', type: 'standard', price: 3000, currency: '$', x: 82, y: 50, capacity: 10 },
            { id: 'liv-t3', label: 'T3', type: 'standard', price: 2500, currency: '$', x: 15, y: 68, capacity: 8 },
            { id: 'liv-t4', label: 'T4', type: 'standard', price: 2500, currency: '$', x: 82, y: 68, capacity: 8 },
        ],
        landmarks: [
            { id: 'dj', label: 'DJ', icon: 'musical-notes', x: 50, y: 38 },
            { id: 'bar', label: 'Main Bar', icon: 'beer-outline', x: 50, y: 85 },
            { id: 'entry', label: 'Entry', icon: 'enter-outline', x: 85, y: 85 },
        ],
    },
    2: {
        tables: [
            { id: 'spy-vip3', label: 'VIP 3', type: 'vip', price: 7000, currency: '€', x: 50, y: 10, capacity: 16 },
            { id: 'spy-vip1', label: 'VIP 1', type: 'vip', price: 5000, currency: '€', x: 82, y: 26, capacity: 12 },
            { id: 'spy-vip2', label: 'VIP 2', type: 'vip', price: 5000, currency: '€', x: 15, y: 26, capacity: 12 },
            { id: 'spy-t1', label: 'T1', type: 'standard', price: 2000, currency: '€', x: 18, y: 55, capacity: 8 },
            { id: 'spy-t2', label: 'T2', type: 'standard', price: 2000, currency: '€', x: 80, y: 55, capacity: 8 },
        ],
        landmarks: [
            { id: 'dj', label: 'DJ', icon: 'musical-notes', x: 50, y: 40 },
            { id: 'bar', label: 'Bar', icon: 'beer-outline', x: 50, y: 85 },
            { id: 'entry', label: 'Entry', icon: 'enter-outline', x: 85, y: 85 },
            { id: 'entry2', label: 'Entry 2', icon: 'enter-outline', x: 15, y: 85 },
        ],
    },
};

export function getTableLayout(clubId: number): ClubTableLayout {
    return CUSTOM_LAYOUTS[clubId] || DEFAULT_LAYOUT;
}
