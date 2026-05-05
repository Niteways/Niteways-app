import { Platform, StyleSheet } from 'react-native';

/** Venue app shell — dark theme + gold accents (aligned with web dashboard look) */
export const VP = {
    bg: '#0B0B0D',
    surface: '#141418',
    card: '#1A1A1F',
    cardBorder: 'rgba(251, 191, 36, 0.22)',
    muted: '#9CA3AF',
    text: '#F9FAFB',
    gold: '#FBBF24',
    goldDim: 'rgba(251, 191, 36, 0.55)',
    teal: '#2DD4BF',
    coral: '#FB7185',
    purple: '#A78BFA',
    statGoldBg: '#FBBF24',
    statTealBg: '#5EEAD4',
    statCoralBg: '#FDA4AF',
    statPurpleBg: '#C4B5FD',
};

const _hair = StyleSheet.hairlineWidth;

/**
 * Full-bleed hairline under primary headers (Guest list, Table booking, etc.).
 * Android: at least 1px so the line stays visible on dark backgrounds.
 */
export const VP_PARTITION_LINE = {
    height: Platform.OS === 'android' ? Math.max(_hair, 1) : _hair,
    backgroundColor: 'rgba(255,255,255,0.14)',
    width: '100%' as const,
    alignSelf: 'stretch' as const,
};
