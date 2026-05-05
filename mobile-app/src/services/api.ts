import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';

// Railway production backend (used in both dev and production for mobile app)
const PRODUCTION_API = 'https://nightclub-production-0053.up.railway.app/api';

const API_BASE_URL = PRODUCTION_API;

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000, // 15s so login doesn't spin forever if backend is down
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests automatically
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
