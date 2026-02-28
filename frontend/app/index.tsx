import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        // Check if onboarding is complete
        if (!user.nda_accepted || !user.risk_acknowledged) {
          router.replace('/onboarding');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isLoading, isAuthenticated, user]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoIcon}>
          <Ionicons name="shield-checkmark" size={48} color="#FFFFFF" />
        </View>
        <Text style={styles.logoText}>TREVENTA</Text>
        <Text style={styles.logoSubtext}>VENTURES</Text>
      </View>
      <Text style={styles.tagline}>Strategic Capital. Real Ventures. Transparent Outcomes.</Text>
      <ActivityIndicator size="large" color="#C9A227" style={styles.loader} />
      <View style={styles.confidentialBadge}>
        <Ionicons name="lock-closed" size={12} color="#718096" />
        <Text style={styles.confidentialText}>CONFIDENTIAL</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F1A2E',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#1A365D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  logoSubtext: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C9A227',
    letterSpacing: 8,
    marginTop: 4,
  },
  tagline: {
    fontSize: 12,
    color: '#A0AEC0',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  loader: {
    marginTop: 40,
  },
  confidentialBadge: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  confidentialText: {
    fontSize: 10,
    color: '#718096',
    marginLeft: 4,
    letterSpacing: 2,
  },
});
