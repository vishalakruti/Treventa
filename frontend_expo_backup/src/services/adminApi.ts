import api from './api';

// Admin User Management
export const adminUserAPI = {
  listUsers: () => api.get('/admin/users'),
  approveUser: (userId: string) => api.post(`/admin/users/${userId}/approve`),
  listInviteRequests: () => api.get('/admin/invite-requests'),
  createInvite: (data: { email: string; role: string }) => api.post('/admin/invites', data),
};

// Admin KYC Management
export const adminKYCAPI = {
  listAllKYC: () => api.get('/admin/kyc/documents'),
  approveKYC: (documentId: string) => api.post(`/admin/kyc/${documentId}/approve`),
  rejectKYC: (documentId: string, reason: string) => api.post(`/admin/kyc/${documentId}/reject`, { reason }),
};

// Admin Project Management
export const adminProjectAPI = {
  create: (data: any) => api.post('/projects', data),
  update: (projectId: string, data: any) => api.put(`/projects/${projectId}`, data),
  updateFinancials: (projectId: string, data: any) => api.post(`/admin/projects/${projectId}/financials`, data),
};

// Admin Participation Management
export const adminParticipationAPI = {
  list: (status?: string) => api.get('/admin/participations', { params: { status } }),
  approve: (participationId: string) => api.post(`/admin/participations/${participationId}/approve`),
  reject: (participationId: string) => api.post(`/admin/participations/${participationId}/reject`),
};

// Admin Distribution Management
export const adminDistributionAPI = {
  create: (data: { project_id: string; total_amount: number; distribution_type: string; notes?: string }) =>
    api.post('/admin/distributions', data),
  list: () => api.get('/admin/distributions'),
};

// Admin Voting Management
export const adminVoteAPI = {
  create: (data: { project_id: string; resolution_title: string; resolution_description: string; voting_deadline: string; approval_threshold: number }) =>
    api.post('/admin/votes', data),
  closeVote: (voteId: string) => api.post(`/admin/votes/${voteId}/close`),
};

// Admin Data Room
export const adminDataRoomAPI = {
  upload: (data: { project_id: string; document_name: string; document_type: string; document_data: string; version: number }) =>
    api.post('/admin/data-room/upload', data),
};

// Admin Audit Logs
export const adminAuditAPI = {
  getLogs: (resourceType?: string, limit?: number) =>
    api.get('/admin/audit-logs', { params: { resource_type: resourceType, limit } }),
};
