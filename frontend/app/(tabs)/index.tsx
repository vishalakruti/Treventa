import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { dashboardAPI } from '../../src/services/api';
import { StatCard } from '../../src/components/StatCard';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { DashboardData } from '../../src/types';
import { PieChart } from 'react-native-gifted-charts';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const response = await dashboardAPI.getInvestorDashboard();
      setData(response.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `\u20B9${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `\u20B9${(amount / 100000).toFixed(2)}L`;
    return `\u20B9${amount.toLocaleString()}`;
  };

  const getPieData = () => {
    if (!data?.sector_allocation?.length) return [];
    const colors = ['#3182CE', '#38A169', '#DD6B20', '#9F7AEA', '#E53E3E', '#319795'];
    return data.sector_allocation.map((item, index) => ({
      value: item.amount,
      color: colors[index % colors.length],
      text: item.sector,
    }));
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  const summary = data?.summary || {
    total_capital_deployed: 0,
    current_portfolio_valuation: 0,
    net_gain_loss: 0,
    distributed_capital: 0,
    active_ventures: 0,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#C9A227']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.full_name || 'Investor'}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.confidentialBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#C9A227" />
              <Text style={styles.confidentialText}>Verified</Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <StatCard
              title="Capital Deployed"
              value={formatCurrency(summary.total_capital_deployed)}
              icon="wallet"
              color="#3182CE"
            />
            <StatCard
              title="Current Valuation"
              value={formatCurrency(summary.current_portfolio_valuation)}
              icon="trending-up"
              color="#38A169"
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title="Net Gain/Loss"
              value={formatCurrency(summary.net_gain_loss)}
              icon={summary.net_gain_loss >= 0 ? 'arrow-up-circle' : 'arrow-down-circle'}
              color={summary.net_gain_loss >= 0 ? '#38A169' : '#E53E3E'}
            />
            <StatCard
              title="Distributed"
              value={formatCurrency(summary.distributed_capital)}
              icon="cash"
              color="#9F7AEA"
            />
          </View>
        </View>

        {/* Active Ventures Card */}
        <View style={styles.venturesCard}>
          <View style={styles.venturesCardContent}>
            <Ionicons name="briefcase" size={32} color="#C9A227" />
            <View style={styles.venturesInfo}>
              <Text style={styles.venturesCount}>{summary.active_ventures}</Text>
              <Text style={styles.venturesLabel}>Active Ventures</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push('/(tabs)/ventures')}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color="#C9A227" />
          </TouchableOpacity>
        </View>

        {/* Sector Allocation */}
        {data?.sector_allocation && data.sector_allocation.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.sectionTitle}>Sector Allocation</Text>
            <View style={styles.chartContainer}>
              <PieChart
                data={getPieData()}
                donut
                showText
                textColor="#FFFFFF"
                textSize={10}
                radius={80}
                innerRadius={50}
                innerCircleColor="#1A2332"
                centerLabelComponent={() => (
                  <View style={styles.centerLabel}>
                    <Text style={styles.centerLabelValue}>{data?.sector_allocation?.length || 0}</Text>
                    <Text style={styles.centerLabelText}>Sectors</Text>
                  </View>
                )}
              />
              <View style={styles.legendContainer}>
                {getPieData().map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendText}>{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Vote Notices */}
        {data?.vote_notices && data.vote_notices.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkbox" size={20} color="#C9A227" />
              <Text style={styles.sectionTitle}>Governance Votes</Text>
            </View>
            {data.vote_notices.map((vote, index) => (
              <TouchableOpacity key={index} style={styles.voteItem}>
                <View style={styles.voteInfo}>
                  <Text style={styles.voteTitle}>{vote.title}</Text>
                  <Text style={styles.voteProject}>{vote.project_name}</Text>
                </View>
                {vote.has_voted ? (
                  <View style={styles.votedBadge}>
                    <Ionicons name="checkmark" size={14} color="#38A169" />
                    <Text style={styles.votedText}>Voted</Text>
                  </View>
                ) : (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Vote Now</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Activity */}
        {data?.recent_activity && data.recent_activity.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={20} color="#C9A227" />
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>
            {data.recent_activity.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Ionicons name="cash" size={16} color="#38A169" />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityAmount}>{formatCurrency(activity.amount)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {(!data?.portfolio_items || data.portfolio_items.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={48} color="#4A5568" />
            <Text style={styles.emptyTitle}>No Active Investments</Text>
            <Text style={styles.emptyText}>Explore available ventures to start building your portfolio</Text>
            <TouchableOpacity style={styles.exploreButton} onPress={() => router.push('/(tabs)/ventures')}>
              <Text style={styles.exploreButtonText}>Explore Ventures</Text>
            </TouchableOpacity>
          </View>
        )}
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
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 14,
    color: '#A0AEC0',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  confidentialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201,162,39,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidentialText: {
    color: '#C9A227',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsContainer: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  venturesCard: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  venturesCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  venturesInfo: {
    marginLeft: 12,
  },
  venturesCount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  venturesLabel: {
    fontSize: 13,
    color: '#A0AEC0',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: '#C9A227',
    fontSize: 14,
    fontWeight: '600',
  },
  chartCard: {
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
    marginLeft: 8,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  centerLabel: {
    alignItems: 'center',
  },
  centerLabelValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  centerLabelText: {
    fontSize: 11,
    color: '#A0AEC0',
  },
  legendContainer: {
    flex: 1,
    marginLeft: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    color: '#E2E8F0',
    fontSize: 12,
  },
  sectionCard: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  voteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  voteInfo: {
    flex: 1,
  },
  voteTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  voteProject: {
    color: '#A0AEC0',
    fontSize: 12,
    marginTop: 2,
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56,161,105,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  votedText: {
    color: '#38A169',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  pendingBadge: {
    backgroundColor: '#C9A227',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56,161,105,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  activityAmount: {
    color: '#38A169',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    color: '#A0AEC0',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  exploreButton: {
    backgroundColor: '#C9A227',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
