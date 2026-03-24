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
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { projectAPI } from '../../src/services/api';
import { adminProjectAPI } from '../../src/services/adminApi';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';

export default function AdminVenturesScreen() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFinancialsModal, setShowFinancialsModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [formData, setFormData] = useState({
    name: '',
    sector: 'Technology',
    description: '',
    business_model: '',
    capital_required: '',
    minimum_participation: '',
    timeline: '',
    risk_level: 'medium',
    status: 'open',
    overview: '',
    risk_disclosure: '',
  });

  // Financials form state
  const [financialData, setFinancialData] = useState({
    revenue: '',
    operating_expenses: '',
    net_profit: '',
    ebitda: '',
    cash_reserves: '',
    liabilities: '',
    asset_value: '',
    valuation: '',
    period: '',
  });

  const fetchData = async () => {
    try {
      const response = await projectAPI.list();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Fetch ventures error:', error);
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

  const handleCreateVenture = async () => {
    if (!formData.name || !formData.description || !formData.capital_required) {
      showAlert('Error', 'Please fill required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminProjectAPI.create({
        ...formData,
        capital_required: parseFloat(formData.capital_required),
        minimum_participation: parseFloat(formData.minimum_participation) || parseFloat(formData.capital_required) * 0.02,
      });
      showAlert('Success', 'Venture created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      showAlert('Error', error.response?.data?.detail || 'Failed to create venture');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateFinancials = async () => {
    if (!financialData.period) {
      showAlert('Error', 'Please specify the period');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminProjectAPI.updateFinancials(selectedProject.id, {
        project_id: selectedProject.id,
        revenue: parseFloat(financialData.revenue) || 0,
        operating_expenses: parseFloat(financialData.operating_expenses) || 0,
        net_profit: parseFloat(financialData.net_profit) || 0,
        ebitda: parseFloat(financialData.ebitda) || 0,
        cash_reserves: parseFloat(financialData.cash_reserves) || 0,
        liabilities: parseFloat(financialData.liabilities) || 0,
        asset_value: parseFloat(financialData.asset_value) || 0,
        valuation: parseFloat(financialData.valuation) || 0,
        period: financialData.period,
      });
      showAlert('Success', 'Financial data updated successfully');
      setShowFinancialsModal(false);
      fetchData();
    } catch (error: any) {
      showAlert('Error', error.response?.data?.detail || 'Failed to update financials');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sector: 'Technology',
      description: '',
      business_model: '',
      capital_required: '',
      minimum_participation: '',
      timeline: '',
      risk_level: 'medium',
      status: 'open',
      overview: '',
      risk_disclosure: '',
    });
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `\u20B9${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `\u20B9${(amount / 100000).toFixed(1)}L`;
    return `\u20B9${amount.toLocaleString()}`;
  };

  const openFinancialsModal = (project: any) => {
    setSelectedProject(project);
    setFinancialData({
      revenue: '',
      operating_expenses: '',
      net_profit: '',
      ebitda: '',
      cash_reserves: '',
      liabilities: '',
      asset_value: '',
      valuation: '',
      period: new Date().toISOString().slice(0, 7),
    });
    setShowFinancialsModal(true);
  };

  const renderProject = ({ item }: { item: any }) => (
    <View style={styles.projectCard}>
      <View style={styles.projectHeader}>
        <View style={styles.projectInfo}>
          <Text style={styles.projectName}>{item.name}</Text>
          <Text style={styles.projectSector}>{item.sector}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'open' ? 'rgba(56,161,105,0.1)' : 'rgba(113,128,150,0.1)' }]}>
          <Text style={[styles.statusText, { color: item.status === 'open' ? '#38A169' : '#718096' }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.projectStats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Capital Required</Text>
          <Text style={styles.statValue}>{formatCurrency(item.capital_required)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Raised</Text>
          <Text style={[styles.statValue, { color: '#38A169' }]}>{formatCurrency(item.total_raised || 0)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Investors</Text>
          <Text style={styles.statValue}>{item.investor_count || 0}</Text>
        </View>
      </View>

      <View style={styles.projectActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openFinancialsModal(item)}>
          <Ionicons name="stats-chart" size={16} color="#3182CE" />
          <Text style={[styles.actionText, { color: '#3182CE' }]}>Financials</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="create" size={16} color="#DD6B20" />
          <Text style={[styles.actionText, { color: '#DD6B20' }]}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading ventures..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Venture Management</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Projects List */}
      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={renderProject}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E53E3E']} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={48} color="#4A5568" />
            <Text style={styles.emptyTitle}>No ventures yet</Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
              <Text style={styles.createBtnText}>Create First Venture</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Create Venture Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Venture</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Venture Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter name"
                placeholderTextColor="#718096"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />

              <Text style={styles.inputLabel}>Sector</Text>
              <View style={styles.sectorRow}>
                {['Technology', 'Healthcare', 'Clean Energy', 'Finance'].map((sector) => (
                  <TouchableOpacity
                    key={sector}
                    style={[styles.sectorOption, formData.sector === sector && styles.sectorOptionActive]}
                    onPress={() => setFormData({ ...formData, sector })}
                  >
                    <Text style={[styles.sectorText, formData.sector === sector && styles.sectorTextActive]}>
                      {sector}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter description"
                placeholderTextColor="#718096"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
              />

              <Text style={styles.inputLabel}>Capital Required * (\u20B9)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 5000000"
                placeholderTextColor="#718096"
                value={formData.capital_required}
                onChangeText={(text) => setFormData({ ...formData, capital_required: text })}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Min. Participation (\u20B9)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 100000"
                placeholderTextColor="#718096"
                value={formData.minimum_participation}
                onChangeText={(text) => setFormData({ ...formData, minimum_participation: text })}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Timeline</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 36 months"
                placeholderTextColor="#718096"
                value={formData.timeline}
                onChangeText={(text) => setFormData({ ...formData, timeline: text })}
              />

              <Text style={styles.inputLabel}>Risk Level</Text>
              <View style={styles.riskRow}>
                {['low', 'medium', 'high'].map((risk) => (
                  <TouchableOpacity
                    key={risk}
                    style={[styles.riskOption, formData.risk_level === risk && styles.riskOptionActive]}
                    onPress={() => setFormData({ ...formData, risk_level: risk })}
                  >
                    <Text style={[styles.riskText, formData.risk_level === risk && styles.riskTextActive]}>
                      {risk}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Risk Disclosure</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter risk disclosure"
                placeholderTextColor="#718096"
                value={formData.risk_disclosure}
                onChangeText={(text) => setFormData({ ...formData, risk_disclosure: text })}
                multiline
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleCreateVenture}
              disabled={isSubmitting}
            >
              <Text style={styles.submitBtnText}>{isSubmitting ? 'Creating...' : 'Create Venture'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Financials Modal */}
      <Modal visible={showFinancialsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Financials</Text>
              <TouchableOpacity onPress={() => setShowFinancialsModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.projectNameLabel}>{selectedProject?.name}</Text>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Period * (YYYY-MM)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 2025-01"
                placeholderTextColor="#718096"
                value={financialData.period}
                onChangeText={(text) => setFinancialData({ ...financialData, period: text })}
              />

              <View style={styles.financialRow}>
                <View style={styles.financialField}>
                  <Text style={styles.inputLabel}>Revenue</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="#718096"
                    value={financialData.revenue}
                    onChangeText={(text) => setFinancialData({ ...financialData, revenue: text })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.financialField}>
                  <Text style={styles.inputLabel}>Expenses</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="#718096"
                    value={financialData.operating_expenses}
                    onChangeText={(text) => setFinancialData({ ...financialData, operating_expenses: text })}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.financialRow}>
                <View style={styles.financialField}>
                  <Text style={styles.inputLabel}>Net Profit</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="#718096"
                    value={financialData.net_profit}
                    onChangeText={(text) => setFinancialData({ ...financialData, net_profit: text })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.financialField}>
                  <Text style={styles.inputLabel}>Valuation</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="#718096"
                    value={financialData.valuation}
                    onChangeText={(text) => setFinancialData({ ...financialData, valuation: text })}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.financialRow}>
                <View style={styles.financialField}>
                  <Text style={styles.inputLabel}>Cash Reserves</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="#718096"
                    value={financialData.cash_reserves}
                    onChangeText={(text) => setFinancialData({ ...financialData, cash_reserves: text })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.financialField}>
                  <Text style={styles.inputLabel}>EBITDA</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="#718096"
                    value={financialData.ebitda}
                    onChangeText={(text) => setFinancialData({ ...financialData, ebitda: text })}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleUpdateFinancials}
              disabled={isSubmitting}
            >
              <Text style={styles.submitBtnText}>{isSubmitting ? 'Saving...' : 'Update Financials'}</Text>
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
    backgroundColor: '#38A169',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  projectCard: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  projectSector: {
    color: '#A0AEC0',
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  projectStats: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    color: '#718096',
    fontSize: 11,
    marginBottom: 2,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  projectActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
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
    marginBottom: 16,
  },
  createBtn: {
    backgroundColor: '#38A169',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createBtnText: {
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalScroll: {
    maxHeight: 400,
  },
  projectNameLabel: {
    color: '#C9A227',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputLabel: {
    color: '#A0AEC0',
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  sectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  sectorOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  sectorOptionActive: {
    backgroundColor: '#3182CE',
  },
  sectorText: {
    color: '#718096',
    fontSize: 12,
    fontWeight: '600',
  },
  sectorTextActive: {
    color: '#FFFFFF',
  },
  riskRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  riskOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 8,
    borderRadius: 6,
  },
  riskOptionActive: {
    backgroundColor: '#DD6B20',
  },
  riskText: {
    color: '#718096',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  riskTextActive: {
    color: '#FFFFFF',
  },
  financialRow: {
    flexDirection: 'row',
    marginHorizontal: -6,
  },
  financialField: {
    flex: 1,
    marginHorizontal: 6,
  },
  submitBtn: {
    backgroundColor: '#E53E3E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
