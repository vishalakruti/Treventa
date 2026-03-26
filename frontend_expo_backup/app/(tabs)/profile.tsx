import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const getKYCStatusColor = () => {
    switch (user?.kyc_status) {
      case 'approved': return '#38A169';
      case 'pending': return '#DD6B20';
      case 'rejected': return '#E53E3E';
      default: return '#718096';
    }
  };

  const getRoleName = () => {
    switch (user?.role) {
      case 'super_admin': return 'Super Admin';
      case 'finance_admin': return 'Finance Admin';
      case 'project_manager': return 'Project Manager';
      case 'investor': return 'Investor';
      default: return user?.role;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.full_name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield" size={14} color="#C9A227" />
            <Text style={styles.roleText}>{getRoleName()}</Text>
          </View>
        </View>

        {/* Status Cards */}
        <View style={styles.statusGrid}>
          <View style={styles.statusCard}>
            <View style={[styles.statusIcon, { backgroundColor: user?.is_approved ? 'rgba(56,161,105,0.1)' : 'rgba(221,107,32,0.1)' }]}>
              <Ionicons
                name={user?.is_approved ? 'checkmark-circle' : 'time'}
                size={24}
                color={user?.is_approved ? '#38A169' : '#DD6B20'}
              />
            </View>
            <Text style={styles.statusLabel}>Account Status</Text>
            <Text style={[styles.statusValue, { color: user?.is_approved ? '#38A169' : '#DD6B20' }]}>
              {user?.is_approved ? 'Approved' : 'Pending'}
            </Text>
          </View>

          <View style={styles.statusCard}>
            <View style={[styles.statusIcon, { backgroundColor: `${getKYCStatusColor()}15` }]}>
              <Ionicons name="document-text" size={24} color={getKYCStatusColor()} />
            </View>
            <Text style={styles.statusLabel}>KYC Status</Text>
            <Text style={[styles.statusValue, { color: getKYCStatusColor() }]}>
              {user?.kyc_status?.charAt(0).toUpperCase() + user?.kyc_status?.slice(1) || 'Pending'}
            </Text>
          </View>
        </View>

        {/* Compliance Status */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Compliance Status</Text>
          
          <View style={styles.complianceItem}>
            <View style={styles.complianceLeft}>
              <Ionicons name="document-lock" size={20} color={user?.nda_accepted ? '#38A169' : '#718096'} />
              <Text style={styles.complianceText}>NDA Acceptance</Text>
            </View>
            <View style={[styles.complianceBadge, { backgroundColor: user?.nda_accepted ? 'rgba(56,161,105,0.1)' : 'rgba(113,128,150,0.1)' }]}>
              <Text style={[styles.complianceBadgeText, { color: user?.nda_accepted ? '#38A169' : '#718096' }]}>
                {user?.nda_accepted ? 'Accepted' : 'Pending'}
              </Text>
            </View>
          </View>

          <View style={styles.complianceItem}>
            <View style={styles.complianceLeft}>
              <Ionicons name="warning" size={20} color={user?.risk_acknowledged ? '#38A169' : '#718096'} />
              <Text style={styles.complianceText}>Risk Acknowledgment</Text>
            </View>
            <View style={[styles.complianceBadge, { backgroundColor: user?.risk_acknowledged ? 'rgba(56,161,105,0.1)' : 'rgba(113,128,150,0.1)' }]}>
              <Text style={[styles.complianceBadgeText, { color: user?.risk_acknowledged ? '#38A169' : '#718096' }]}>
                {user?.risk_acknowledged ? 'Acknowledged' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        {/* Admin Panel Link - Only for Admins */}
        {user && ['super_admin', 'finance_admin', 'project_manager'].includes(user.role) && (
          <TouchableOpacity style={styles.adminCard} onPress={() => router.push('/(admin)')}>
            <View style={styles.adminIcon}>
              <Ionicons name="shield" size={24} color="#E53E3E" />
            </View>
            <View style={styles.adminInfo}>
              <Text style={styles.adminTitle}>Admin Panel</Text>
              <Text style={styles.adminDesc}>Manage users, ventures & more</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#E53E3E" />
          </TouchableOpacity>
        )}

        {/* Menu Items */}
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/onboarding')}>
            <View style={styles.menuLeft}>
              <Ionicons name="document-attach" size={20} color="#C9A227" />
              <Text style={styles.menuText}>KYC Documents</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#718096" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="card" size={20} color="#C9A227" />
              <Text style={styles.menuText}>Bank Details</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#718096" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="document" size={20} color="#C9A227" />
              <Text style={styles.menuText}>Reports</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#718096" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons name="notifications" size={20} color="#C9A227" />
              <Text style={styles.menuText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#718096" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#E53E3E" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Version Info */}
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>TREVENTA VENTURES v1.0.0</Text>
          <Text style={styles.copyrightText}>Private Capital Circle</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1A2E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileCard: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#C9A227',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#A0AEC0',
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201,162,39,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    color: '#C9A227',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  statusGrid: {
    flexDirection: 'row',
    marginHorizontal: -6,
    marginBottom: 16,
  },
  statusCard: {
    flex: 1,
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: '#A0AEC0',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229,62,62,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,62,62,0.3)',
  },
  adminIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(229,62,62,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adminInfo: {
    flex: 1,
  },
  adminTitle: {
    color: '#E53E3E',
    fontSize: 16,
    fontWeight: '700',
  },
  adminDesc: {
    color: '#A0AEC0',
    fontSize: 12,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  complianceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  complianceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  complianceText: {
    color: '#E2E8F0',
    fontSize: 14,
    marginLeft: 12,
  },
  complianceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  complianceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  menuCard: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    color: '#E2E8F0',
    fontSize: 14,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(229,62,62,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  logoutText: {
    color: '#E53E3E',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  versionInfo: {
    alignItems: 'center',
  },
  versionText: {
    color: '#4A5568',
    fontSize: 12,
  },
  copyrightText: {
    color: '#4A5568',
    fontSize: 11,
    marginTop: 4,
  },
});
