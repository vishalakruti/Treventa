import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adminParticipationAPI } from '../../src/services/adminApi';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';

export default function AdminParticipationsScreen() {
  const [participations, setParticipations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all'>('pending');

  const fetchData = async () => {
    try {
      const response = await adminParticipationAPI.list();
      setParticipations(response.data || []);
    } catch (error) {
      console.error('Fetch participations error:', error);
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

  const handleApprove = async (participationId: string) => {
    try {
      await adminParticipationAPI.approve(participationId);
      showAlert('Success', 'Participation approved and cap table updated');
      fetchData();
    } catch (error: any) {
      showAlert('Error', error.response?.data?.detail || 'Failed to approve');
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `\u20B9${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `\u20B9${(amount / 100000).toFixed(2)}L`;
    return `\u20B9${amount.toLocaleString()}`;
  };

  const filteredParticipations = participations.filter(p => {
    if (activeTab === 'all') return true;
    return p.status === activeTab;
  });

  const renderParticipation = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.investorInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.investor_name?.charAt(0) || 'I'}
            </Text>
          </View>
          <View>
            <Text style={styles.investorName}>{item.investor_name}</Text>
            <Text style={styles.projectName}>Project ID: {item.project_id?.slice(0, 8)}...</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, {
          backgroundColor: item.status === 'approved' ? 'rgba(56,161,105,0.1)' :
            item.status === 'pending' ? 'rgba(221,107,32,0.1)' : 'rgba(229,62,62,0.1)'
        }]}>
          <Text style={[styles.statusText, {
            color: item.status === 'approved' ? '#38A169' :
              item.status === 'pending' ? '#DD6B20' : '#E53E3E'
          }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Investment Amount</Text>
        <Text style={styles.amountValue}>{formatCurrency(item.amount)}</Text>
      </View>

      {item.notes && (
        <Text style={styles.notes}>Note: {item.notes}</Text>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => handleApprove(item.id)}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.approveBtnText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading participation requests..." />;
  }

  const pendingCount = participations.filter(p => p.status === 'pending').length;
  const approvedCount = participations.filter(p => p.status === 'approved').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Participation Requests</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending ({pendingCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'approved' && styles.tabActive]}
          onPress={() => setActiveTab('approved')}
        >
          <Text style={[styles.tabText, activeTab === 'approved' && styles.tabTextActive]}>
            Approved ({approvedCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All ({participations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={filteredParticipations}
        keyExtractor={(item) => item.id}
        renderItem={renderParticipation}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E53E3E']} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="hand-left-outline" size={48} color="#4A5568" />
            <Text style={styles.emptyTitle}>No {activeTab} requests</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1A2E',
  },
  header: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
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
  card: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  investorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  investorName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  projectName: {
    color: '#718096',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  amountLabel: {
    color: '#A0AEC0',
    fontSize: 13,
  },
  amountValue: {
    color: '#38A169',
    fontSize: 20,
    fontWeight: '700',
  },
  notes: {
    color: '#718096',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12,
  },
  dateText: {
    color: '#718096',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38A169',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
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
});
