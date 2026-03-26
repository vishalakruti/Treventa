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
import { portfolioAPI, distributionAPI } from '../../src/services/api';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { PortfolioItem, Distribution } from '../../src/types';

export default function PortfolioScreen() {
  const router = useRouter();
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'holdings' | 'distributions'>('holdings');

  const fetchData = async () => {
    try {
      const [portfolioRes, distRes] = await Promise.all([
        portfolioAPI.getSummary(),
        distributionAPI.getMy(),
      ]);
      setPortfolioData(portfolioRes.data);
      setDistributions(distRes.data);
    } catch (error) {
      console.error('Portfolio fetch error:', error);
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

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `\u20B9${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `\u20B9${(amount / 100000).toFixed(2)}L`;
    return `\u20B9${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading portfolio..." />;
  }

  const summary = portfolioData?.summary || {};
  const portfolioItems: PortfolioItem[] = portfolioData?.portfolio_items || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Portfolio</Text>
        <Text style={styles.subtitle}>Track your investments</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#C9A227']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Deployed</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary.total_capital_deployed || 0)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Current Value</Text>
              <Text style={[styles.summaryValue, { color: '#38A169' }]}>
                {formatCurrency(summary.current_portfolio_valuation || 0)}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Net Gain/Loss</Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: (summary.net_gain_loss || 0) >= 0 ? '#38A169' : '#E53E3E' },
                ]}
              >
                {formatCurrency(summary.net_gain_loss || 0)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Distributed</Text>
              <Text style={[styles.summaryValue, { color: '#9F7AEA' }]}>
                {formatCurrency(summary.distributed_capital || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'holdings' && styles.tabActive]}
            onPress={() => setActiveTab('holdings')}
          >
            <Text style={[styles.tabText, activeTab === 'holdings' && styles.tabTextActive]}>Holdings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'distributions' && styles.tabActive]}
            onPress={() => setActiveTab('distributions')}
          >
            <Text style={[styles.tabText, activeTab === 'distributions' && styles.tabTextActive]}>Distributions</Text>
          </TouchableOpacity>
        </View>

        {/* Holdings List */}
        {activeTab === 'holdings' && (
          <View>
            {portfolioItems.length > 0 ? (
              portfolioItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.holdingCard}
                  onPress={() => router.push(`/venture/${item.project_id}`)}
                >
                  <View style={styles.holdingHeader}>
                    <View>
                      <Text style={styles.holdingName}>{item.project_name}</Text>
                      <Text style={styles.holdingSector}>{item.sector}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'open' ? 'rgba(56,161,105,0.1)' : 'rgba(113,128,150,0.1)' }]}>
                      <Text style={[styles.statusText, { color: item.status === 'open' ? '#38A169' : '#718096' }]}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.holdingStats}>
                    <View style={styles.holdingStat}>
                      <Text style={styles.holdingStatLabel}>Invested</Text>
                      <Text style={styles.holdingStatValue}>{formatCurrency(item.invested_amount)}</Text>
                    </View>
                    <View style={styles.holdingStat}>
                      <Text style={styles.holdingStatLabel}>Equity</Text>
                      <Text style={styles.holdingStatValue}>{item.equity_percentage.toFixed(2)}%</Text>
                    </View>
                    <View style={styles.holdingStat}>
                      <Text style={styles.holdingStatLabel}>Value</Text>
                      <Text style={[styles.holdingStatValue, { color: '#38A169' }]}>
                        {formatCurrency(item.current_valuation)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.holdingFooter}>
                    <View style={styles.gainContainer}>
                      <Ionicons
                        name={item.unrealized_gain >= 0 ? 'trending-up' : 'trending-down'}
                        size={14}
                        color={item.unrealized_gain >= 0 ? '#38A169' : '#E53E3E'}
                      />
                      <Text
                        style={[styles.gainText, { color: item.unrealized_gain >= 0 ? '#38A169' : '#E53E3E' }]}
                      >
                        {formatCurrency(item.unrealized_gain)} unrealized
                      </Text>
                    </View>
                    {item.realized_profit > 0 && (
                      <Text style={styles.realizedText}>{formatCurrency(item.realized_profit)} realized</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="pie-chart-outline" size={48} color="#4A5568" />
                <Text style={styles.emptyTitle}>No Holdings Yet</Text>
                <Text style={styles.emptyText}>Your approved investments will appear here</Text>
              </View>
            )}
          </View>
        )}

        {/* Distributions List */}
        {activeTab === 'distributions' && (
          <View>
            {distributions.length > 0 ? (
              distributions.map((dist, index) => (
                <View key={index} style={styles.distributionCard}>
                  <View style={styles.distributionIcon}>
                    <Ionicons name="cash" size={24} color="#38A169" />
                  </View>
                  <View style={styles.distributionInfo}>
                    <Text style={styles.distributionProject}>{dist.project_name}</Text>
                    <Text style={styles.distributionType}>
                      {dist.distribution_type.charAt(0).toUpperCase() + dist.distribution_type.slice(1)} Distribution
                    </Text>
                  </View>
                  <View style={styles.distributionAmount}>
                    <Text style={styles.distributionValue}>{formatCurrency(dist.amount)}</Text>
                    <Text style={styles.distributionStatus}>{dist.status}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="cash-outline" size={48} color="#4A5568" />
                <Text style={styles.emptyTitle}>No Distributions Yet</Text>
                <Text style={styles.emptyText}>Profit distributions will appear here</Text>
              </View>
            )}
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#A0AEC0',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#A0AEC0',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1A2332',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#C9A227',
  },
  tabText: {
    color: '#A0AEC0',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  holdingCard: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  holdingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  holdingName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  holdingSector: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  holdingStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  holdingStat: {
    flex: 1,
  },
  holdingStatLabel: {
    fontSize: 11,
    color: '#718096',
    marginBottom: 2,
  },
  holdingStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  holdingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  gainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gainText: {
    fontSize: 12,
    marginLeft: 4,
  },
  realizedText: {
    fontSize: 12,
    color: '#9F7AEA',
  },
  distributionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  distributionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(56,161,105,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  distributionInfo: {
    flex: 1,
  },
  distributionProject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  distributionType: {
    fontSize: 12,
    color: '#A0AEC0',
    marginTop: 2,
  },
  distributionAmount: {
    alignItems: 'flex-end',
  },
  distributionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#38A169',
  },
  distributionStatus: {
    fontSize: 11,
    color: '#A0AEC0',
    marginTop: 2,
    textTransform: 'capitalize',
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
    marginTop: 8,
    textAlign: 'center',
  },
});
