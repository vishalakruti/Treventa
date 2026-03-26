import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { projectAPI } from '../../src/services/api';
import { ProjectCard } from '../../src/components/ProjectCard';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { Project } from '../../src/types';

const SECTORS = ['All', 'Technology', 'Healthcare', 'Clean Energy', 'Real Estate', 'Finance'];
const STATUSES = ['All', 'Open', 'Closed', 'Allocated'];

export default function VenturesScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.list();
      setProjects(response.data);
      setFilteredProjects(response.data);
    } catch (error) {
      console.error('Projects fetch error:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    let filtered = projects;

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedSector !== 'All') {
      filtered = filtered.filter((p) => p.sector === selectedSector);
    }

    if (selectedStatus !== 'All') {
      filtered = filtered.filter((p) => p.status.toLowerCase() === selectedStatus.toLowerCase());
    }

    setFilteredProjects(filtered);
  }, [searchQuery, selectedSector, selectedStatus, projects]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjects();
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading ventures..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore Ventures</Text>
        <Text style={styles.subtitle}>Discover investment opportunities</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#718096" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search ventures..."
          placeholderTextColor="#718096"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#718096" />
          </TouchableOpacity>
        )}
      </View>

      {/* Sector Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SECTORS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, selectedSector === item && styles.filterChipActive]}
              onPress={() => setSelectedSector(item)}
            >
              <Text style={[styles.filterChipText, selectedSector === item && styles.filterChipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Status Filter */}
      <View style={styles.statusFilterContainer}>
        {STATUSES.map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.statusChip, selectedStatus === status && styles.statusChipActive]}
            onPress={() => setSelectedStatus(status)}
          >
            <Text style={[styles.statusChipText, selectedStatus === status && styles.statusChipTextActive]}>
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Projects List */}
      <FlatList
        data={filteredProjects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard project={item} onPress={() => router.push(`/venture/${item.id}`)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#C9A227']} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={48} color="#4A5568" />
            <Text style={styles.emptyTitle}>No ventures found</Text>
            <Text style={styles.emptyText}>Try adjusting your filters</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2332',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: '#FFFFFF',
    fontSize: 16,
  },
  filterContainer: {
    paddingLeft: 16,
    marginBottom: 8,
  },
  filterChip: {
    backgroundColor: '#1A2332',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#C9A227',
  },
  filterChipText: {
    color: '#A0AEC0',
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  statusFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  statusChipActive: {
    backgroundColor: 'rgba(201,162,39,0.1)',
    borderColor: '#C9A227',
  },
  statusChipText: {
    color: '#718096',
    fontSize: 12,
    fontWeight: '500',
  },
  statusChipTextActive: {
    color: '#C9A227',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
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
  },
});
