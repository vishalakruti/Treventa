import api from './api';

export const authService = {
  // Login - Step 1: Send credentials, receive OTP
  async login(email, password) {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },

  // Verify OTP - Step 2: Verify OTP, receive token
  async verifyOtp(email, otp) {
    const response = await api.post('/api/auth/verify-otp', { email, otp });
    return response.data;
  },

  // Get current user
  async getMe() {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  // Request invite
  async requestInvite(data) {
    const response = await api.post('/api/auth/request-invite', data);
    return response.data;
  },

  // Register with invite code
  async register(data) {
    const response = await api.post('/api/auth/register', data);
    return response.data;
  },

  // Logout
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

export const projectService = {
  // Get all projects
  async getProjects() {
    const response = await api.get('/api/projects');
    return response.data;
  },

  // Get project details
  async getProject(projectId) {
    const response = await api.get(`/api/projects/${projectId}`);
    return response.data;
  },

  // Get project financials
  async getProjectFinancials(projectId) {
    const response = await api.get(`/api/projects/${projectId}/financials`);
    return response.data;
  },

  // Get project cap table
  async getCapTable(projectId) {
    const response = await api.get(`/api/projects/${projectId}/cap-table`);
    return response.data;
  },

  // Get project votes
  async getProjectVotes(projectId) {
    const response = await api.get(`/api/projects/${projectId}/votes`);
    return response.data;
  },

  // Get data room documents
  async getDataRoom(projectId) {
    const response = await api.get(`/api/projects/${projectId}/data-room`);
    return response.data;
  },
};

export const participationService = {
  // Request participation
  async requestParticipation(data) {
    const response = await api.post('/api/participations/request', data);
    return response.data;
  },

  // Get my participations
  async getMyParticipations() {
    const response = await api.get('/api/participations/my');
    return response.data;
  },
};

export const portfolioService = {
  // Get portfolio summary
  async getPortfolioSummary() {
    const response = await api.get('/api/portfolio/summary');
    return response.data;
  },

  // Get investor dashboard
  async getDashboard() {
    const response = await api.get('/api/dashboard/investor');
    return response.data;
  },
};

export const distributionService = {
  // Get my distributions
  async getMyDistributions() {
    const response = await api.get('/api/distributions/my');
    return response.data;
  },
};

export const governanceService = {
  // Cast vote
  async castVote(voteId, choice) {
    const response = await api.post('/api/votes/cast', { vote_id: voteId, choice });
    return response.data;
  },
};

export const kycService = {
  // Accept NDA
  async acceptNda() {
    const response = await api.post('/api/kyc/accept-nda');
    return response.data;
  },

  // Acknowledge risk
  async acknowledgeRisk() {
    const response = await api.post('/api/kyc/acknowledge-risk');
    return response.data;
  },

  // Get my KYC documents
  async getMyDocuments() {
    const response = await api.get('/api/kyc/my-documents');
    return response.data;
  },

  // Upload KYC document
  async uploadDocument(data) {
    const response = await api.post('/api/kyc/upload-document', data);
    return response.data;
  },

  // Update bank details
  async updateBankDetails(data) {
    const response = await api.post('/api/kyc/bank-details', data);
    return response.data;
  },
};
