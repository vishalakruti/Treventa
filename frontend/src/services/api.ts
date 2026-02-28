import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  const backendUrl = Constants.expoConfig?.extra?.backendUrl || 
                     process.env.EXPO_PUBLIC_BACKEND_URL || 
                     'https://private-capital-1.preview.emergentagent.com';
  return backendUrl;
};

const api = axios.create({
  baseURL: `${getBaseUrl()}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  return await SecureStore.getItemAsync('auth_token');
};

const setToken = async (token: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem('auth_token', token);
  } else {
    await SecureStore.setItemAsync('auth_token', token);
  }
};

const removeToken = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.removeItem('auth_token');
  } else {
    await SecureStore.deleteItemAsync('auth_token');
  }
};

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await removeToken();
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  requestInvite: (data: { email: string; full_name: string; phone?: string; message?: string }) =>
    api.post('/auth/request-invite', data),
  
  register: (data: { email: string; password: string; full_name: string; phone?: string; invite_code: string }) =>
    api.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  verifyOTP: (data: { email: string; otp: string }) =>
    api.post('/auth/verify-otp', data),
  
  getMe: () => api.get('/auth/me'),
};

// Project APIs
export const projectAPI = {
  list: () => api.get('/projects'),
  get: (id: string) => api.get(`/projects/${id}`),
  getFinancials: (id: string) => api.get(`/projects/${id}/financials`),
  getCapTable: (id: string) => api.get(`/projects/${id}/cap-table`),
  getVotes: (id: string) => api.get(`/projects/${id}/votes`),
  getDataRoom: (id: string) => api.get(`/projects/${id}/data-room`),
};

// Participation APIs
export const participationAPI = {
  request: (data: { project_id: string; amount: number; notes?: string }) =>
    api.post('/participations/request', data),
  getMy: () => api.get('/participations/my'),
};

// Portfolio APIs
export const portfolioAPI = {
  getSummary: () => api.get('/portfolio/summary'),
};

// Dashboard APIs
export const dashboardAPI = {
  getInvestorDashboard: () => api.get('/dashboard/investor'),
};

// Distribution APIs
export const distributionAPI = {
  getMy: () => api.get('/distributions/my'),
};

// Vote APIs
export const voteAPI = {
  cast: (data: { vote_id: string; choice: string }) =>
    api.post('/votes/cast', data),
};

// KYC APIs
export const kycAPI = {
  uploadDocument: (data: { document_type: string; document_data: string; file_name: string }) =>
    api.post('/kyc/upload-document', data),
  getMyDocuments: () => api.get('/kyc/my-documents'),
  updateBankDetails: (data: { bank_name: string; account_number: string; ifsc_code: string; account_holder_name: string }) =>
    api.post('/kyc/bank-details', data),
  acceptNDA: () => api.post('/kyc/accept-nda'),
  acknowledgeRisk: () => api.post('/kyc/acknowledge-risk'),
};

// Reports APIs
export const reportsAPI = {
  getMonthlySummary: () => api.get('/reports/monthly-summary'),
};

export { getToken, setToken, removeToken };
export default api;
