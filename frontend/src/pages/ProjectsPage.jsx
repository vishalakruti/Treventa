import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectService } from '../services/apiService';
import Layout from '../components/Layout';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const filteredProjects = projects.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-900/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30';
      case 'high': return 'text-red-400 bg-red-900/30';
      default: return 'text-dark-400 bg-dark-700';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'text-green-400 bg-green-900/30';
      case 'closed': return 'text-red-400 bg-red-900/30';
      case 'allocated': return 'text-blue-400 bg-blue-900/30';
      default: return 'text-dark-400 bg-dark-700';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Ventures</h1>
            <p className="text-dark-400">Explore investment opportunities</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'open', 'closed', 'allocated'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="bg-dark-800 rounded-lg border border-dark-700 hover:border-primary-500/50 transition-colors"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                    <p className="text-dark-400 text-sm">{project.sector}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </div>

                <p className="text-dark-300 text-sm mb-4 line-clamp-2">{project.description}</p>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-dark-400 text-sm">Capital Required</span>
                    <span className="text-white font-medium">{formatCurrency(project.capital_required)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400 text-sm">Min. Participation</span>
                    <span className="text-white">{formatCurrency(project.minimum_participation)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400 text-sm">Timeline</span>
                    <span className="text-white">{project.timeline}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-dark-400 text-sm">Risk Level</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(project.risk_level)}`}>
                      {project.risk_level}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-dark-400">Raised</span>
                    <span className="text-white">
                      {formatCurrency(project.total_raised)} / {formatCurrency(project.capital_required)}
                    </span>
                  </div>
                  <div className="w-full bg-dark-700 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full"
                      style={{ width: `${Math.min((project.total_raised / project.capital_required) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-dark-400 text-xs mt-1">{project.investor_count} investors</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-dark-400">No projects found</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
