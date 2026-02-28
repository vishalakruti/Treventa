import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useAuthStore } from '../src/store/authStore';
import { kycAPI, authAPI } from '../src/services/api';
import { KYCDocument } from '../src/types';

const STEPS = [
  { id: 'kyc', title: 'KYC Documents', icon: 'document-attach' },
  { id: 'bank', title: 'Bank Details', icon: 'card' },
  { id: 'nda', title: 'NDA Acceptance', icon: 'document-lock' },
  { id: 'risk', title: 'Risk Acknowledgment', icon: 'warning' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, updateUser, checkAuth } = useAuthStore();
  const [activeStep, setActiveStep] = useState(0);
  const [kycDocs, setKycDocs] = useState<KYCDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Bank details state
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');

  useEffect(() => {
    fetchKYCDocuments();
    determineActiveStep();
  }, [user]);

  const fetchKYCDocuments = async () => {
    try {
      const response = await kycAPI.getMyDocuments();
      setKycDocs(response.data);
    } catch (error) {
      console.error('Fetch KYC error:', error);
    }
  };

  const determineActiveStep = () => {
    if (!user) return;
    
    const hasAllKYC = kycDocs.length >= 3;
    if (!hasAllKYC) {
      setActiveStep(0);
    } else if (!user.nda_accepted) {
      setActiveStep(2);
    } else if (!user.risk_acknowledged) {
      setActiveStep(3);
    } else {
      // All complete
      router.replace('/(tabs)');
    }
  };

  const pickDocument = async (documentType: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        setIsLoading(true);
        const file = result.assets[0];
        
        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        await kycAPI.uploadDocument({
          document_type: documentType,
          document_data: base64,
          file_name: file.name,
        });

        Alert.alert('Success', 'Document uploaded successfully');
        fetchKYCDocuments();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to upload document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBankDetails = async () => {
    if (!bankName || !accountNumber || !ifscCode || !accountHolderName) {
      Alert.alert('Error', 'Please fill all bank details');
      return;
    }

    setIsLoading(true);
    try {
      await kycAPI.updateBankDetails({
        bank_name: bankName,
        account_number: accountNumber,
        ifsc_code: ifscCode,
        account_holder_name: accountHolderName,
      });
      Alert.alert('Success', 'Bank details saved successfully');
      setActiveStep(2);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save bank details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptNDA = async () => {
    Alert.alert(
      'NDA Acceptance',
      'By accepting, you agree to keep all information about TREVENTA VENTURES and its ventures strictly confidential. Any disclosure may result in legal action.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I Accept',
          onPress: async () => {
            setIsLoading(true);
            try {
              await kycAPI.acceptNDA();
              const meRes = await authAPI.getMe();
              updateUser(meRes.data);
              setActiveStep(3);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to accept NDA');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAcknowledgeRisk = async () => {
    Alert.alert(
      'Risk Acknowledgment',
      'I understand that: \n\n1. Participation in ventures involves business risk\n2. No guaranteed returns are offered\n3. Capital is subject to market, operational, and business risks\n4. Past performance does not indicate future results\n\nI acknowledge these risks and wish to proceed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I Acknowledge',
          onPress: async () => {
            setIsLoading(true);
            try {
              await kycAPI.acknowledgeRisk();
              const meRes = await authAPI.getMe();
              updateUser(meRes.data);
              Alert.alert('Welcome!', 'Onboarding complete. You can now explore ventures.', [
                { text: 'Continue', onPress: () => router.replace('/(tabs)') },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to acknowledge risk');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const getDocumentStatus = (type: string) => {
    const doc = kycDocs.find((d) => d.document_type === type);
    return doc?.status || 'not_uploaded';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#38A169';
      case 'pending': return '#DD6B20';
      case 'rejected': return '#E53E3E';
      default: return '#718096';
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <View>
            <Text style={styles.stepDescription}>
              Upload the following documents for KYC verification:
            </Text>

            {/* PAN Card */}
            <View style={styles.documentCard}>
              <View style={styles.documentInfo}>
                <Ionicons name="card" size={24} color="#C9A227" />
                <View style={styles.documentDetails}>
                  <Text style={styles.documentTitle}>PAN Card</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(getDocumentStatus('pan'))}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(getDocumentStatus('pan')) }]}>
                      {getDocumentStatus('pan').replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickDocument('pan')}
                disabled={isLoading}
              >
                <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* ID Proof */}
            <View style={styles.documentCard}>
              <View style={styles.documentInfo}>
                <Ionicons name="id-card" size={24} color="#C9A227" />
                <View style={styles.documentDetails}>
                  <Text style={styles.documentTitle}>ID Proof (Aadhaar/Passport)</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(getDocumentStatus('id_proof'))}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(getDocumentStatus('id_proof')) }]}>
                      {getDocumentStatus('id_proof').replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickDocument('id_proof')}
                disabled={isLoading}
              >
                <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Address Proof */}
            <View style={styles.documentCard}>
              <View style={styles.documentInfo}>
                <Ionicons name="home" size={24} color="#C9A227" />
                <View style={styles.documentDetails}>
                  <Text style={styles.documentTitle}>Address Proof</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(getDocumentStatus('address_proof'))}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(getDocumentStatus('address_proof')) }]}>
                      {getDocumentStatus('address_proof').replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickDocument('address_proof')}
                disabled={isLoading}
              >
                <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.nextButton, kycDocs.length < 3 && styles.buttonDisabled]}
              onPress={() => setActiveStep(1)}
              disabled={kycDocs.length < 3}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        );

      case 1:
        return (
          <View>
            <Text style={styles.stepDescription}>
              Provide your bank account details for distributions:
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bank Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter bank name"
                placeholderTextColor="#718096"
                value={bankName}
                onChangeText={setBankName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account Holder Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter account holder name"
                placeholderTextColor="#718096"
                value={accountHolderName}
                onChangeText={setAccountHolderName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Account Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter account number"
                placeholderTextColor="#718096"
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>IFSC Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter IFSC code"
                placeholderTextColor="#718096"
                value={ifscCode}
                onChangeText={setIfscCode}
                autoCapitalize="characters"
              />
            </View>

            <TouchableOpacity
              style={[styles.nextButton, isLoading && styles.buttonDisabled]}
              onPress={handleSaveBankDetails}
              disabled={isLoading}
            >
              <Text style={styles.nextButtonText}>{isLoading ? 'Saving...' : 'Save & Continue'}</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View>
            <View style={styles.ndaCard}>
              <Ionicons name="document-lock" size={48} color="#C9A227" />
              <Text style={styles.ndaTitle}>Non-Disclosure Agreement</Text>
              <Text style={styles.ndaText}>
                By accepting this NDA, you agree to:\n\n
                • Keep all venture information strictly confidential\n
                • Not share details with unauthorized parties\n
                • Use information solely for investment decisions\n
                • Report any unauthorized disclosure immediately
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.acceptButton, isLoading && styles.buttonDisabled]}
              onPress={handleAcceptNDA}
              disabled={isLoading}
            >
              <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>
                {isLoading ? 'Processing...' : 'Accept NDA'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 3:
        return (
          <View>
            <View style={styles.riskCard}>
              <Ionicons name="warning" size={48} color="#DD6B20" />
              <Text style={styles.riskTitle}>Risk Acknowledgment</Text>
              <Text style={styles.riskText}>
                TREVENTA VENTURES operates as a private capital coordination and transparency platform for invited members only.\n\n
                Key risks include:\n\n
                • No guaranteed returns are offered\n
                • Capital is subject to market risks\n
                • Operational and business risks exist\n
                • Investments may lose value\n
                • Liquidity may be limited
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.acknowledgeButton, isLoading && styles.buttonDisabled]}
              onPress={handleAcknowledgeRisk}
              disabled={isLoading}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>
                {isLoading ? 'Processing...' : 'I Acknowledge & Proceed'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Complete Onboarding</Text>
      </View>

      {/* Progress Steps */}
      <View style={styles.stepsContainer}>
        {STEPS.map((step, index) => (
          <View key={step.id} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                index <= activeStep && styles.stepCircleActive,
                index < activeStep && styles.stepCircleComplete,
              ]}
            >
              {index < activeStep ? (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              ) : (
                <Ionicons name={step.icon as any} size={16} color={index <= activeStep ? '#FFFFFF' : '#718096'} />
              )}
            </View>
            <Text style={[styles.stepLabel, index <= activeStep && styles.stepLabelActive]}>
              {step.title}
            </Text>
            {index < STEPS.length - 1 && (
              <View style={[styles.stepLine, index < activeStep && styles.stepLineActive]} />
            )}
          </View>
        ))}
      </View>

      {/* Step Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderStepContent()}
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#C9A227',
  },
  stepCircleComplete: {
    backgroundColor: '#38A169',
  },
  stepLabel: {
    fontSize: 10,
    color: '#718096',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    position: 'absolute',
    top: 16,
    right: -20,
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  stepLineActive: {
    backgroundColor: '#38A169',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  stepDescription: {
    fontSize: 14,
    color: '#A0AEC0',
    marginBottom: 24,
    lineHeight: 20,
  },
  documentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentDetails: {
    marginLeft: 12,
    flex: 1,
  },
  documentTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  uploadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C9A227',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C9A227',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#A0AEC0',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  ndaCard: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  ndaTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 16,
  },
  ndaText: {
    fontSize: 14,
    color: '#A0AEC0',
    lineHeight: 24,
    textAlign: 'center',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C9A227',
    borderRadius: 12,
    paddingVertical: 16,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  riskCard: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(221,107,32,0.3)',
  },
  riskTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DD6B20',
    marginTop: 16,
    marginBottom: 16,
  },
  riskText: {
    fontSize: 14,
    color: '#A0AEC0',
    lineHeight: 24,
    textAlign: 'center',
  },
  acknowledgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DD6B20',
    borderRadius: 12,
    paddingVertical: 16,
  },
});
