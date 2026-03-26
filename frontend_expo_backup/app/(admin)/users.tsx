import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adminUserAPI } from '../../src/services/adminApi';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [inviteRequests, setInviteRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'pending' | 'invites'>('users');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('investor');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [usersRes, requestsRes] = await Promise.all([
        adminUserAPI.listUsers(),
        adminUserAPI.listInviteRequests().catch(() => ({ data: [] })),
      ]);
      setUsers(usersRes.data || []);
      setInviteRequests(requestsRes.data || []);
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      await adminUserAPI.approveUser(userId);
      showAlert('Success', 'User approved successfully');
      fetchData();
    } catch (error: any) {
      showAlert('Error', error.response?.data?.detail || 'Failed to approve user');
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) {
      showAlert('Error', 'Please enter an email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await adminUserAPI.createInvite({ email: inviteEmail, role: inviteRole });
      showAlert('Invite Sent', `Invite code: ${response.data.code}\n\nShare this code with ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
    } catch (error: any) {
      showAlert('Error', error.response?.data?.detail || 'Failed to create invite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingUsers = users.filter(u => !u.is_approved);
  const approvedUsers = users.filter(u => u.is_approved);

  const renderUser = ({ item }: { item: any }) => (
    <View style={styles.userCard}>
      <View style={styles.userAvatar}>
        <Text style={styles.avatarText}>
          {item.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.full_name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <View style={styles.userMeta}>
          <View style={[styles.badge, { backgroundColor: item.is_approved ? 'rgba(56,161,105,0.1)' : 'rgba(221,107,32,0.1)' }]}>
            <Text style={[styles.badgeText, { color: item.is_approved ? '#38A169' : '#DD6B20' }]}>
              {item.is_approved ? 'Approved' : 'Pending'}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.role?.replace('_', ' ')}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: item.kyc_status === 'approved' ? 'rgba(56,161,105,0.1)' : 'rgba(113,128,150,0.1)' }]}>
            <Text style={[styles.badgeText, { color: item.kyc_status === 'approved' ? '#38A169' : '#718096' }]}>
              KYC: {item.kyc_status}
            </Text>
          </View>
        </View>
      </View>
      {!item.is_approved && (
        <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveUser(item.id)}>
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderInviteRequest = ({ item }: { item: any }) => (
    <View style={styles.userCard}>
      <View style={[styles.userAvatar, { backgroundColor: '#DD6B20' }]}>
        <Ionicons name="person-add" size={20} color="#FFFFFF" />
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.full_name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        {item.message && <Text style={styles.requestMessage}>{item.message}</Text>}
      </View>
      <TouchableOpacity style={styles.approveBtn} onPress={() => {
        setInviteEmail(item.email);
        setShowInviteModal(true);
      }}>
        <Ionicons name="send" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading users..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>User Management</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowInviteModal(true)}>
          <Ionicons name="person-add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
            All ({approvedUsers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending ({pendingUsers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invites' && styles.tabActive]}
          onPress={() => setActiveTab('invites')}
        >
          <Text style={[styles.tabText, activeTab === 'invites' && styles.tabTextActive]}>
            Requests ({inviteRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* User List */}
      <FlatList
        data={activeTab === 'users' ? approvedUsers : activeTab === 'pending' ? pendingUsers : inviteRequests}
        keyExtractor={(item) => item.id}
        renderItem={activeTab === 'invites' ? renderInviteRequest : renderUser}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E53E3E']} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#4A5568" />
            <Text style={styles.emptyTitle}>No {activeTab === 'invites' ? 'requests' : 'users'} found</Text>
          </View>
        }
      />

      {/* Invite Modal */}
      <Modal visible={showInviteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send Invite</Text>
            
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email"
              placeholderTextColor="#718096"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Role</Text>
            <View style={styles.roleSelector}>
              {['investor', 'project_manager', 'finance_admin'].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[styles.roleOption, inviteRole === role && styles.roleOptionActive]}
                  onPress={() => setInviteRole(role)}
                >
                  <Text style={[styles.roleText, inviteRole === role && styles.roleTextActive]}>
                    {role.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowInviteModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, isSubmitting && styles.btnDisabled]}
                onPress={handleSendInvite}
                disabled={isSubmitting}
              >
                <Text style={styles.sendBtnText}>{isSubmitting ? 'Sending...' : 'Send Invite'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1A2E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E53E3E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#E53E3E',
  },
  tabText: {
    color: '#718096',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#E53E3E',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3182CE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    color: '#A0AEC0',
    fontSize: 13,
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  badge: {
    backgroundColor: 'rgba(113,128,150,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
    marginTop: 4,
  },
  badgeText: {
    color: '#718096',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  requestMessage: {
    color: '#718096',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  approveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#38A169',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1A2332',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  inputLabel: {
    color: '#A0AEC0',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
  },
  roleSelector: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 8,
    borderRadius: 8,
  },
  roleOptionActive: {
    backgroundColor: '#E53E3E',
  },
  roleText: {
    color: '#718096',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  roleTextActive: {
    color: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 12,
  },
  cancelBtnText: {
    color: '#718096',
    fontSize: 16,
    fontWeight: '600',
  },
  sendBtn: {
    flex: 2,
    backgroundColor: '#E53E3E',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
