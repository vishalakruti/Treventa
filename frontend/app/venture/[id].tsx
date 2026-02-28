import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { projectAPI, participationAPI, voteAPI } from '../../src/services/api';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { Project, Vote, CapTable } from '../../src/types';
import { useAuthStore } from '../../src/store/authStore';

export default function VentureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [project, setProject] = useState<Project | null>(null);
  const [capTable, setCapTable] = useState<CapTable | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'captable' | 'votes' | 'documents'>('overview');
  const [showParticipationModal, setShowParticipationModal] = useState(false);
  const [participationAmount, setParticipationAmount] = useState('');
  const [participationNotes, setParticipationNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [projectRes, capTableRes, votesRes] = await Promise.all([
        projectAPI.get(id!),
        projectAPI.getCapTable(id!).catch(() => ({ data: null })),
        projectAPI.getVotes(id!).catch(() => ({ data: [] })),
      ]);
      setProject(projectRes.data);
      setCapTable(capTableRes.data);
      setVotes(votesRes.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load venture details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `\u20B9${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `\u20B9${(amount / 100000).toFixed(2)}L`;
    return `\u20B9${amount.toLocaleString()}`;
  };

  const handleRequestParticipation = async () => {
    const amount = parseFloat(participationAmount);
    if (!amount || amount < (project?.minimum_participation || 0)) {
      Alert.alert('Error', `Minimum participation is ${formatCurrency(project?.minimum_participation || 0)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await participationAPI.request({
        project_id: id!,
        amount,
        notes: participationNotes || undefined,
      });
      Alert.alert('Success', 'Participation request submitted successfully. Waiting for admin approval.');
      setShowParticipationModal(false);
      setParticipationAmount('');
      setParticipationNotes('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (voteId: string, choice: string) => {
    try {
      await voteAPI.cast({ vote_id: voteId, choice });
      Alert.alert('Success', 'Vote recorded successfully');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to cast vote');
    }
  };

  const getRiskColor = () => {
    switch (project?.risk_level) {
      case 'low': return '#38A169';
      case 'medium': return '#DD6B20';
      case 'high': return '#E53E3E';
      default: return '#718096';
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading venture..." />;
  }

  if (!project) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Venture not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const financials = project.financial_snapshot;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.projectName} numberOfLines={1}>{project.name}</Text>
          <View style={styles.headerBadges}>
            <View style={styles.sectorBadge}>
              <Text style={styles.sectorText}>{project.sector}</Text>
            </View>
            <View style={[styles.riskBadge, { backgroundColor: `${getRiskColor()}20` }]}>
              <Text style={[styles.riskText, { color: getRiskColor() }]}>
                {project.risk_level?.charAt(0).toUpperCase() + project.risk_level?.slice(1)} Risk
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['overview', 'financials', 'captable', 'votes', 'documents'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab as any)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Overview</Text>
              <Text style={styles.description}>{project.overview || project.description}</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Capital Required</Text>
                <Text style={styles.statValue}>{formatCurrency(project.capital_required)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Min. Participation</Text>
                <Text style={styles.statValue}>{formatCurrency(project.minimum_participation)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Raised</Text>
                <Text style={[styles.statValue, { color: '#38A169' }]}>{formatCurrency(project.total_raised)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Timeline</Text>
                <Text style={styles.statValue}>{project.timeline}</Text>
              </View>
            </View>

            {project.business_model && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Business Model</Text>
                <Text style={styles.description}>{project.business_model}</Text>
              </View>
            )}

            {project.capital_structure && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Capital Structure</Text>
                <Text style={styles.description}>{project.capital_structure}</Text>
              </View>
            )}

            {project.risk_disclosure && (
              <View style={[styles.card, styles.riskCard]}>
                <View style={styles.riskHeader}>
                  <Ionicons name="warning" size={20} color="#DD6B20" />
                  <Text style={styles.riskTitle}>Risk Disclosure</Text>
                </View>
                <Text style={styles.riskDescription}>{project.risk_disclosure}</Text>
              </View>
            )}
          </View>
        )}

        {/* Financials Tab */}
        {activeTab === 'financials' && (
          <View>
            {financials ? (
              <View>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Financial Snapshot - {financials.period}</Text>
                  <View style={styles.financialGrid}>
                    <View style={styles.financialItem}>
                      <Text style={styles.financialLabel}>Revenue</Text>
                      <Text style={styles.financialValue}>{formatCurrency(financials.revenue)}</Text>
                    </View>
                    <View style={styles.financialItem}>
                      <Text style={styles.financialLabel}>Operating Expenses</Text>
                      <Text style={[styles.financialValue, { color: '#E53E3E' }]}>
                        {formatCurrency(financials.operating_expenses)}
                      </Text>
                    </View>
                    <View style={styles.financialItem}>
                      <Text style={styles.financialLabel}>Net Profit</Text>
                      <Text style={[styles.financialValue, { color: financials.net_profit >= 0 ? '#38A169' : '#E53E3E' }]}>
                        {formatCurrency(financials.net_profit)}
                      </Text>
                    </View>
                    <View style={styles.financialItem}>
                      <Text style={styles.financialLabel}>EBITDA</Text>
                      <Text style={styles.financialValue}>{formatCurrency(financials.ebitda)}</Text>
                    </View>
                    <View style={styles.financialItem}>
                      <Text style={styles.financialLabel}>Cash Reserves</Text>
                      <Text style={[styles.financialValue, { color: '#3182CE' }]}>
                        {formatCurrency(financials.cash_reserves)}
                      </Text>
                    </View>
                    <View style={styles.financialItem}>
                      <Text style={styles.financialLabel}>Valuation</Text>
                      <Text style={[styles.financialValue, { color: '#9F7AEA' }]}>
                        {formatCurrency(financials.valuation)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color="#4A5568" />
                <Text style={styles.emptyTitle}>No Financial Data</Text>
                <Text style={styles.emptyText}>Financial updates will appear here</Text>
              </View>
            )}
          </View>
        )}

        {/* Cap Table Tab */}
        {activeTab === 'captable' && (
          <View>
            {capTable ? (
              <View>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Capital Summary</Text>
                  <View style={styles.capSummary}>
                    <View style={styles.capItem}>
                      <Text style={styles.capLabel}>Authorized Capital</Text>
                      <Text style={styles.capValue}>{formatCurrency(capTable.total_authorized_capital)}</Text>
                    </View>
                    <View style={styles.capItem}>
                      <Text style={styles.capLabel}>Issued Capital</Text>
                      <Text style={styles.capValue}>{formatCurrency(capTable.issued_capital)}</Text>
                    </View>
                    <View style={styles.capItem}>
                      <Text style={styles.capLabel}>Utilization</Text>
                      <Text style={styles.capValue}>
                        {((capTable.issued_capital / capTable.total_authorized_capital) * 100).toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                </View>

                {capTable.entries && capTable.entries.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardTitle}>Investor Holdings</Text>
                    {capTable.entries.map((entry, index) => (
                      <View key={index} style={styles.capTableRow}>
                        <View style={styles.investorInfo}>
                          <View style={styles.investorAvatar}>
                            <Text style={styles.investorInitial}>
                              {entry.investor_name?.charAt(0) || 'I'}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.investorName}>{entry.investor_name}</Text>
                            <Text style={styles.investorAmount}>{formatCurrency(entry.invested_amount)}</Text>
                          </View>
                        </View>
                        <Text style={styles.equityPercentage}>{entry.equity_percentage.toFixed(2)}%</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#4A5568" />
                <Text style={styles.emptyTitle}>No Cap Table Data</Text>
                <Text style={styles.emptyText}>Cap table will appear when investments are made</Text>
              </View>
            )}
          </View>
        )}

        {/* Votes Tab */}
        {activeTab === 'votes' && (
          <View>
            {votes.length > 0 ? (
              votes.map((vote, index) => (
                <View key={index} style={styles.voteCard}>
                  <View style={styles.voteHeader}>
                    <Text style={styles.voteTitle}>{vote.resolution_title}</Text>
                    <View style={[styles.voteStatus, { backgroundColor: vote.status === 'open' ? 'rgba(56,161,105,0.1)' : 'rgba(113,128,150,0.1)' }]}>
                      <Text style={[styles.voteStatusText, { color: vote.status === 'open' ? '#38A169' : '#718096' }]}>
                        {vote.status.charAt(0).toUpperCase() + vote.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.voteDescription}>{vote.resolution_description}</Text>
                  <View style={styles.voteInfo}>
                    <Text style={styles.voteInfoText}>Deadline: {new Date(vote.voting_deadline).toLocaleDateString()}</Text>
                    <Text style={styles.voteInfoText}>Threshold: {vote.approval_threshold}%</Text>
                  </View>
                  {vote.status === 'open' && !vote.user_voted && (
                    <View style={styles.voteButtons}>
                      <TouchableOpacity
                        style={[styles.voteButton, styles.voteYes]}
                        onPress={() => handleVote(vote.id, 'yes')}
                      >
                        <Text style={styles.voteButtonText}>Vote Yes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.voteButton, styles.voteNo]}
                        onPress={() => handleVote(vote.id, 'no')}
                      >
                        <Text style={styles.voteButtonText}>Vote No</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.voteButton, styles.voteAbstain]}
                        onPress={() => handleVote(vote.id, 'abstain')}
                      >
                        <Text style={styles.voteButtonText}>Abstain</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {vote.user_voted && (
                    <View style={styles.votedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#38A169" />
                      <Text style={styles.votedText}>You have voted</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="checkbox-outline" size={48} color="#4A5568" />
                <Text style={styles.emptyTitle}>No Active Votes</Text>
                <Text style={styles.emptyText}>Governance votes will appear here</Text>
              </View>
            )}
          </View>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color="#4A5568" />
            <Text style={styles.emptyTitle}>Data Room</Text>
            <Text style={styles.emptyText}>Access confidential documents after NDA acceptance</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Request Participation Button */}
      {project.status === 'open' && user?.is_approved && user?.nda_accepted && user?.risk_acknowledged && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.participateButton}
            onPress={() => setShowParticipationModal(true)}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.participateButtonText}>Request Participation</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Participation Modal */}
      <Modal visible={showParticipationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Participation</Text>
              <TouchableOpacity onPress={() => setShowParticipationModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Investment Amount</Text>
            <View style={styles.modalInputContainer}>
              <Text style={styles.currencyPrefix}>\u20B9</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter amount"
                placeholderTextColor="#718096"
                value={participationAmount}
                onChangeText={setParticipationAmount}
                keyboardType="numeric"
              />
            </View>
            <Text style={styles.minAmount}>Minimum: {formatCurrency(project.minimum_participation)}</Text>

            <Text style={styles.modalLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.notesInput]}
              placeholder="Add any notes for admin"
              placeholderTextColor="#718096"
              value={participationNotes}
              onChangeText={setParticipationNotes}
              multiline
            />

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleRequestParticipation}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Text>
            </TouchableOpacity>
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
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  projectName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerBadges: {
    flexDirection: 'row',
  },
  sectorBadge: {
    backgroundColor: 'rgba(49,130,206,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  sectorText: {
    color: '#3182CE',
    fontSize: 11,
    fontWeight: '600',
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  riskText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 8,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#C9A227',
  },
  tabText: {
    color: '#A0AEC0',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
  },
  statLabel: {
    fontSize: 12,
    color: '#A0AEC0',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  riskCard: {
    borderWidth: 1,
    borderColor: 'rgba(221,107,32,0.3)',
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DD6B20',
    marginLeft: 8,
  },
  riskDescription: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 22,
  },
  financialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  financialItem: {
    width: '50%',
    paddingVertical: 12,
  },
  financialLabel: {
    fontSize: 12,
    color: '#A0AEC0',
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  capSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  capItem: {
    flex: 1,
  },
  capLabel: {
    fontSize: 11,
    color: '#A0AEC0',
    marginBottom: 4,
  },
  capValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  capTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  investorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  investorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C9A227',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  investorInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  investorName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  investorAmount: {
    color: '#A0AEC0',
    fontSize: 12,
    marginTop: 2,
  },
  equityPercentage: {
    color: '#38A169',
    fontSize: 16,
    fontWeight: '700',
  },
  voteCard: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  voteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  voteTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  voteStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  voteStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  voteDescription: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
    marginBottom: 12,
  },
  voteInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  voteInfoText: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  voteButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  voteButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  voteYes: {
    backgroundColor: '#38A169',
  },
  voteNo: {
    backgroundColor: '#E53E3E',
  },
  voteAbstain: {
    backgroundColor: '#718096',
  },
  voteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56,161,105,0.1)',
    paddingVertical: 8,
    borderRadius: 8,
  },
  votedText: {
    color: '#38A169',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#0F1A2E',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  participateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C9A227',
    borderRadius: 12,
    paddingVertical: 16,
  },
  participateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 18,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#C9A227',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A2332',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalLabel: {
    fontSize: 14,
    color: '#A0AEC0',
    marginBottom: 8,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  currencyPrefix: {
    color: '#C9A227',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  modalInput: {
    flex: 1,
    height: 52,
    color: '#FFFFFF',
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  minAmount: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 16,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 16,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: '#C9A227',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
