declare module 'react-native-config' {
    export interface NativeConfig {
        SUPABASE_URL?: string;
        SUPABASE_ANON_KEY?: string;
    }

    const Config: NativeConfig;
    export default Config;
}
