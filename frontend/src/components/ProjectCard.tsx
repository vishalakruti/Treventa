import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Project } from '../types';

interface Props {
  project: Project;
  onPress: () => void;
}

export const ProjectCard: React.FC<Props> = ({ project, onPress }) => {
  const getRiskColor = () => {
    switch (project.risk_level) {
      case 'low': return '#38A169';
      case 'medium': return '#DD6B20';
      case 'high': return '#E53E3E';
      default: return '#718096';
    }
  };

  const getStatusColor = () => {
    switch (project.status) {
      case 'open': return '#38A169';
      case 'closed': return '#E53E3E';
      case 'allocated': return '#3182CE';
      default: return '#718096';
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `\u20B9${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `\u20B9${(amount / 100000).toFixed(1)}L`;
    return `\u20B9${amount.toLocaleString()}`;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.name}>{project.name}</Text>
          <View style={[styles.sectorBadge]}>
            <Text style={styles.sectorText}>{project.sector}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {project.description}
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Capital Required</Text>
          <Text style={styles.statValue}>{formatCurrency(project.capital_required)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Min. Participation</Text>
          <Text style={styles.statValue}>{formatCurrency(project.minimum_participation)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons name="time-outline" size={14} color="#718096" />
          <Text style={styles.footerText}>{project.timeline}</Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="warning-outline" size={14} color={getRiskColor()} />
          <Text style={[styles.footerText, { color: getRiskColor() }]}>
            {project.risk_level.charAt(0).toUpperCase() + project.risk_level.slice(1)} Risk
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#1A365D" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A365D',
    marginBottom: 4,
  },
  sectorBadge: {
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  sectorText: {
    fontSize: 11,
    color: '#3182CE',
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#718096',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#718096',
    marginLeft: 4,
  },
});
