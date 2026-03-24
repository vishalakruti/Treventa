import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { projectAPI } from '../../src/services/api';
import { adminDistributionAPI, adminVoteAPI, adminAuditAPI, adminDataRoomAPI } from '../../src/services/adminApi';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export default function AdminMoreScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showDataRoomModal, setShowDataRoomModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Distribution form
  const [distributionData, setDistributionData] = useState({
    project_id: '',
    total_amount: '',
    distribution_type: 'profit',
    notes: '',
  });

  // Vote form
  const [voteData, setVoteData] = useState({
    project_id: '',
    resolution_title: '',
    resolution_description: '',
    voting_deadline: '',
    approval_threshold: '51',
  });

  // Data room form
  const [dataRoomData, setDataRoomData] = useState({
    project_id: '',
    document_name: '',
    document_type: 'report',
    document_data: '',
    version: 1,
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.list();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Fetch projects error:', error);
    }
  };

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const response = await adminAuditAPI.getLogs(undefined, 50);
      setAuditLogs(response.data || []);
    } catch (error) {
      console.error('Fetch audit logs error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleCreateDistribution = async () => {
    if (!distributionData.project_id || !distributionData.total_amount) {
      showAlert('Error', 'Please select project and enter amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await adminDistributionAPI.create({
        project_id: distributionData.project_id,
        total_amount: parseFloat(distributionData.total_amount),
        distribution_type: distributionData.distribution_type,
        notes: distributionData.notes || undefined,
      });
      showAlert('Success', `Distribution created! ${response.data.breakdown?.length || 0} investors will receive funds.`);
      setShowDistributionModal(false);
      setDistributionData({ project_id: '', total_amount: '', distribution_type: 'profit', notes: '' });
    } catch (error: any) {
      showAlert('Error', error.response?.data?.detail || 'Failed to create distribution');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateVote = async () => {
    if (!voteData.project_id || !voteData.resolution_title || !voteData.voting_deadline) {
      showAlert('Error', 'Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminVoteAPI.create({
        project_id: voteData.project_id,
        resolution_title: voteData.resolution_title,
        resolution_description: voteData.resolution_description,
        voting_deadline: new Date(voteData.voting_deadline).toISOString(),
        approval_threshold: parseFloat(voteData.approval_threshold),
      });
      showAlert('Success', 'Governance vote created successfully');
      setShowVoteModal(false);
      setVoteData({ project_id: '', resolution_title: '', resolution_description: '', voting_deadline: '', approval_threshold: '51' });
    } catch (error: any) {
      showAlert('Error', error.response?.data?.detail || 'Failed to create vote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!dataRoomData.project_id || !dataRoomData.document_name) {
      showAlert('Error', 'Please select project and enter document name');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        setIsSubmitting(true);
        const file = result.assets[0];
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await adminDataRoomAPI.upload({
          project_id: dataRoomData.project_id,
          document_name: dataRoomData.document_name,
          document_type: dataRoomData.document_type,
          document_data: base64,
          version: dataRoomData.version,
        });

        showAlert('Success', 'Document uploaded to data room');
        setShowDataRoomModal(false);
        setDataRoomData({ project_id: '', document_name: '', document_type: 'report', document_data: '', version: 1 });
      }
    } catch (error: any) {
      showAlert('Error', error.response?.data?.detail || 'Failed to upload document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `\u20B9${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `\u20B9${(amount / 100000).toFixed(1)}L`;
    return `\u20B9${amount.toLocaleString()}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>More Actions</Text>

        {/* Action Cards */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => setShowDistributionModal(true)}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(56,161,105,0.1)' }]}>
              <Ionicons name="cash" size={28} color="#38A169" />
            </View>
            <Text style={styles.actionTitle}>Create Distribution</Text>
            <Text style={styles.actionDesc}>Distribute profits to investors</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => setShowVoteModal(true)}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(159,122,234,0.1)' }]}>
              <Ionicons name="checkbox" size={28} color="#9F7AEA" />
            </View>
            <Text style={styles.actionTitle}>Create Vote</Text>
            <Text style={styles.actionDesc}>Launch governance resolution</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => setShowDataRoomModal(true)}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(49,130,206,0.1)' }]}>
              <Ionicons name="folder" size={28} color="#3182CE" />
            </View>
            <Text style={styles.actionTitle}>Data Room</Text>
            <Text style={styles.actionDesc}>Upload confidential documents</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => { fetchAuditLogs(); setShowAuditModal(true); }}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(221,107,32,0.1)' }]}>
              <Ionicons name="list" size={28} color="#DD6B20" />
            </View>
            <Text style={styles.actionTitle}>Audit Logs</Text>
            <Text style={styles.actionDesc}>View system activity</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Links */}
        <Text style={styles.sectionTitle}>Quick Navigation</Text>
        <TouchableOpacity style={styles.linkItem} onPress={() => router.push('/(tabs)')}>
          <Ionicons name="phone-portrait" size={20} color="#718096" />
          <Text style={styles.linkText}>Switch to Investor View</Text>
          <Ionicons name="chevron-forward" size={20} color="#4A5568" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkItem} onPress={() => router.push('/(admin)/users')}>
          <Ionicons name="people" size={20} color="#718096" />
          <Text style={styles.linkText}>Manage Users</Text>
          <Ionicons name="chevron-forward" size={20} color="#4A5568" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkItem} onPress={() => router.push('/(admin)/ventures')}>
          <Ionicons name="briefcase" size={20} color="#718096" />
          <Text style={styles.linkText}>Manage Ventures</Text>
          <Ionicons name="chevron-forward" size={20} color="#4A5568" />
        </TouchableOpacity>
      </ScrollView>

      {/* Distribution Modal */}
      <Modal visible={showDistributionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Distribution</Text>
              <TouchableOpacity onPress={() => setShowDistributionModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Select Project</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectSelector}>
              {projects.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.projectOption, distributionData.project_id === p.id && styles.projectOptionActive]}
                  onPress={() => setDistributionData({ ...distributionData, project_id: p.id })}
                >
                  <Text style={[styles.projectOptionText, distributionData.project_id === p.id && styles.projectOptionTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Total Amount (\u20B9)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              placeholderTextColor="#718096"
              value={distributionData.total_amount}
              onChangeText={(text) => setDistributionData({ ...distributionData, total_amount: text })}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Distribution Type</Text>
            <View style={styles.typeRow}>
              {['profit', 'dividend', 'exit'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeOption, distributionData.distribution_type === type && styles.typeOptionActive]}
                  onPress={() => setDistributionData({ ...distributionData, distribution_type: type })}
                >
                  <Text style={[styles.typeText, distributionData.distribution_type === type && styles.typeTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add notes"
              placeholderTextColor="#718096"
              value={distributionData.notes}
              onChangeText={(text) => setDistributionData({ ...distributionData, notes: text })}
              multiline
            />

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleCreateDistribution}
              disabled={isSubmitting}
            >
              <Text style={styles.submitBtnText}>{isSubmitting ? 'Creating...' : 'Create Distribution'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Vote Modal */}
      <Modal visible={showVoteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Governance Vote</Text>
              <TouchableOpacity onPress={() => setShowVoteModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Select Project</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectSelector}>
                {projects.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.projectOption, voteData.project_id === p.id && styles.projectOptionActive]}
                    onPress={() => setVoteData({ ...voteData, project_id: p.id })}
                  >
                    <Text style={[styles.projectOptionText, voteData.project_id === p.id && styles.projectOptionTextActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Resolution Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter title"
                placeholderTextColor="#718096"
                value={voteData.resolution_title}
                onChangeText={(text) => setVoteData({ ...voteData, resolution_title: text })}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter description"
                placeholderTextColor="#718096"
                value={voteData.resolution_description}
                onChangeText={(text) => setVoteData({ ...voteData, resolution_description: text })}
                multiline
              />

              <Text style={styles.inputLabel}>Voting Deadline * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 2025-03-15"
                placeholderTextColor="#718096"
                value={voteData.voting_deadline}
                onChangeText={(text) => setVoteData({ ...voteData, voting_deadline: text })}
              />

              <Text style={styles.inputLabel}>Approval Threshold (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="51"
                placeholderTextColor="#718096"
                value={voteData.approval_threshold}
                onChangeText={(text) => setVoteData({ ...voteData, approval_threshold: text })}
                keyboardType="numeric"
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: '#9F7AEA' }, isSubmitting && styles.btnDisabled]}
              onPress={handleCreateVote}
              disabled={isSubmitting}
            >
              <Text style={styles.submitBtnText}>{isSubmitting ? 'Creating...' : 'Create Vote'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Data Room Modal */}
      <Modal visible={showDataRoomModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload to Data Room</Text>
              <TouchableOpacity onPress={() => setShowDataRoomModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Select Project</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.projectSelector}>
              {projects.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.projectOption, dataRoomData.project_id === p.id && styles.projectOptionActive]}
                  onPress={() => setDataRoomData({ ...dataRoomData, project_id: p.id })}
                >
                  <Text style={[styles.projectOptionText, dataRoomData.project_id === p.id && styles.projectOptionTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Document Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter document name"
              placeholderTextColor="#718096"
              value={dataRoomData.document_name}
              onChangeText={(text) => setDataRoomData({ ...dataRoomData, document_name: text })}
            />

            <Text style={styles.inputLabel}>Document Type</Text>
            <View style={styles.typeRow}>
              {['report', 'agreement', 'financial', 'legal'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeOption, dataRoomData.document_type === type && styles.typeOptionActive]}
                  onPress={() => setDataRoomData({ ...dataRoomData, document_type: type })}
                >
                  <Text style={[styles.typeText, dataRoomData.document_type === type && styles.typeTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: '#3182CE' }, isSubmitting && styles.btnDisabled]}
              onPress={handleUploadDocument}
              disabled={isSubmitting}
            >
              <Ionicons name="cloud-upload" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>{isSubmitting ? 'Uploading...' : 'Select & Upload File'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Audit Logs Modal */}
      <Modal visible={showAuditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Audit Logs</Text>
              <TouchableOpacity onPress={() => setShowAuditModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading logs...</Text>
              </View>
            ) : (
              <ScrollView style={styles.logsScroll}>
                {auditLogs.map((log, index) => (
                  <View key={index} style={styles.logItem}>
                    <View style={styles.logHeader}>
                      <Text style={styles.logAction}>{log.action?.replace(/_/g, ' ')}</Text>
                      <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleString()}</Text>
                    </View>
                    <Text style={styles.logResource}>{log.resource_type} • {log.resource_id?.slice(0, 8)}...</Text>
                  </View>
                ))}
                {auditLogs.length === 0 && (
                  <Text style={styles.emptyText}>No audit logs found</Text>
                )}
              </ScrollView>
            )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionDesc: {
    color: '#718096',
    fontSize: 11,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2332',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  linkText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 14,
    marginLeft: 12,
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalScroll: {
    maxHeight: 350,
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
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  projectSelector: {
    marginBottom: 16,
  },
  projectOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    marginRight: 8,
  },
  projectOptionActive: {
    backgroundColor: '#E53E3E',
  },
  projectOptionText: {
    color: '#718096',
    fontSize: 13,
    fontWeight: '600',
  },
  projectOptionTextActive: {
    color: '#FFFFFF',
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 8,
    borderRadius: 6,
  },
  typeOptionActive: {
    backgroundColor: '#38A169',
  },
  typeText: {
    color: '#718096',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  typeTextActive: {
    color: '#FFFFFF',
  },
  submitBtn: {
    backgroundColor: '#38A169',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#718096',
  },
  logsScroll: {
    maxHeight: 400,
  },
  logItem: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logAction: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  logTime: {
    color: '#718096',
    fontSize: 11,
  },
  logResource: {
    color: '#718096',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  emptyText: {
    color: '#718096',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
