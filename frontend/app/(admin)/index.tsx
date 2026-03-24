import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { adminUserAPI, adminParticipationAPI, adminAuditAPI } from '../../src/services/adminApi';
import { projectAPI } from '../../src/services/api';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    totalProjects: 0,
    pendingParticipations: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const [usersRes, projectsRes, participationsRes, logsRes] = await Promise.all([
        adminUserAPI.listUsers().catch(() => ({ data: [] })),
        projectAPI.list().catch(() => ({ data: [] })),
        adminParticipationAPI.list('pending').catch(() => ({ data: [] })),
        adminAuditAPI.getLogs(undefined, 10).catch(() => ({ data: [] })),
      ]);

      const users = usersRes.data || [];
      const pendingUsers = users.filter((u: any) => !u.is_approved);

      setStats({
        totalUsers: users.length,
        pendingApprovals: pendingUsers.length,
        totalProjects: (projectsRes.data || []).length,
        pendingParticipations: (participationsRes.data || []).length,
      });

      setRecentLogs(logsRes.data || []);
    } catch (error) {
      console.error('Admin dashboard error:', error);
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

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading admin dashboard..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E53E3E']} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.adminBadge}>
              <Ionicons name="shield" size={12} color="#E53E3E" />
              <Text style={styles.adminBadgeText}>ADMIN PANEL</Text>
            </View>
            <Text style={styles.welcomeText}>Welcome, {user?.full_name}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color="#E53E3E" />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(admin)/users')}>
            <Ionicons name="people" size={28} color="#3182CE" />
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.statCard, stats.pendingApprovals > 0 && styles.statCardAlert]} onPress={() => router.push('/(admin)/users')}>
            <Ionicons name="time" size={28} color={stats.pendingApprovals > 0 ? '#E53E3E' : '#DD6B20'} />
            <Text style={[styles.statValue, stats.pendingApprovals > 0 && { color: '#E53E3E' }]}>{stats.pendingApprovals}</Text>
            <Text style={styles.statLabel}>Pending Approvals</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(admin)/ventures')}>
            <Ionicons name="briefcase" size={28} color="#38A169" />
            <Text style={styles.statValue}>{stats.totalProjects}</Text>
            <Text style={styles.statLabel}>Total Ventures</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.statCard, stats.pendingParticipations > 0 && styles.statCardAlert]} onPress={() => router.push('/(admin)/participations')}>
            <Ionicons name="hand-left" size={28} color={stats.pendingParticipations > 0 ? '#E53E3E' : '#9F7AEA'} />
            <Text style={[styles.statValue, stats.pendingParticipations > 0 && { color: '#E53E3E' }]}>{stats.pendingParticipations}</Text>
            <Text style={styles.statLabel}>Pending Requests</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(admin)/ventures?action=create')}>
              <Ionicons name="add-circle" size={24} color="#38A169" />
              <Text style={styles.actionText}>Create Venture</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(admin)/users?action=invite')}>
              <Ionicons name="person-add" size={24} color="#3182CE" />
              <Text style={styles.actionText}>Send Invite</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(admin)/more')}>
              <Ionicons name="document-text" size={24} color="#9F7AEA" />
              <Text style={styles.actionText}>Audit Logs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(tabs)')}>
              <Ionicons name="phone-portrait" size={24} color="#718096" />
              <Text style={styles.actionText}>Investor View</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {recentLogs.length > 0 ? (
            recentLogs.slice(0, 5).map((log, index) => (
              <View key={index} style={styles.logItem}>
                <View style={styles.logIcon}>
                  <Ionicons name="time" size={16} color="#718096" />
                </View>
                <View style={styles.logContent}>
                  <Text style={styles.logAction}>{log.action?.replace(/_/g, ' ')}</Text>
                  <Text style={styles.logMeta}>{log.resource_type} • {new Date(log.timestamp).toLocaleDateString()}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No recent activity</Text>
          )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229,62,62,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  adminBadgeText: {
    color: '#E53E3E',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(229,62,62,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    alignItems: 'center',
  },
  statCardAlert: {
    borderWidth: 1,
    borderColor: 'rgba(229,62,62,0.5)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  actionBtn: {
    width: '48%',
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    alignItems: 'center',
  },
  actionText: {
    color: '#E2E8F0',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2332',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  logIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(113,128,150,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logContent: {
    flex: 1,
  },
  logAction: {
    color: '#E2E8F0',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  logMeta: {
    color: '#718096',
    fontSize: 11,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  emptyText: {
    color: '#718096',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
