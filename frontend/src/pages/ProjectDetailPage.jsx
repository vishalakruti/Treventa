import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectService, participationService } from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [capTable, setCapTable] = useState(null);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showParticipateModal, setShowParticipateModal] = useState(false);
  const [participationAmount, setParticipationAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadProjectData();
  }, [id]);

  const loadProjectData = async () => {
    try {
      const [projectData, capTableData, votesData] = await Promise.all([
        projectService.getProject(id),
        projectService.getCapTable(id).catch(() => null),
        projectService.getProjectVotes(id).catch(() => []),
      ]);
      setProject(projectData);
      setCapTable(capTableData);
      setVotes(votesData);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load project');
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

  const handleParticipate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await participationService.requestParticipation({
        project_id: id,
        amount: parseFloat(participationAmount),
      });
      setSuccessMessage('Participation request submitted successfully!');
      setShowParticipateModal(false);
      setParticipationAmount('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit participation request');
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-900/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30';
      case 'high': return 'text-red-400 bg-red-900/30';
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

  if (!project) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-dark-400">Project not found</p>
          <Link to="/projects" className="text-primary-400 hover:text-primary-300 mt-4 inline-block">
            Back to Projects
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back Button */}
        <Link to="/projects" className="inline-flex items-center text-dark-400 hover:text-white">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Ventures
        </Link>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-900/30 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Project Header */}
        <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{project.name}</h1>
              <p className="text-dark-400">{project.sector}</p>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded text-sm font-medium ${getRiskColor(project.risk_level)}`}>
                {project.risk_level} risk
              </span>
              <span className={`px-3 py-1 rounded text-sm font-medium ${
                project.status === 'open' ? 'bg-green-900/30 text-green-400' : 'bg-dark-700 text-dark-400'
              }`}>
                {project.status}
              </span>
            </div>
          </div>

          <p className="text-dark-300 mb-6">{project.description}</p>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-dark-900 rounded-lg p-4">
              <p className="text-dark-400 text-sm">Capital Required</p>
              <p className="text-xl font-bold text-white">{formatCurrency(project.capital_required)}</p>
            </div>
            <div className="bg-dark-900 rounded-lg p-4">
              <p className="text-dark-400 text-sm">Min. Participation</p>
              <p className="text-xl font-bold text-white">{formatCurrency(project.minimum_participation)}</p>
            </div>
            <div className="bg-dark-900 rounded-lg p-4">
              <p className="text-dark-400 text-sm">Timeline</p>
              <p className="text-xl font-bold text-white">{project.timeline}</p>
            </div>
            <div className="bg-dark-900 rounded-lg p-4">
              <p className="text-dark-400 text-sm">Total Raised</p>
              <p className="text-xl font-bold text-white">{formatCurrency(project.total_raised)}</p>
            </div>
          </div>

          {/* Participate Button */}
          {project.status === 'open' && user?.is_approved && (
            <button
              onClick={() => setShowParticipateModal(true)}
              className="mt-6 w-full md:w-auto px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              Request Participation
            </button>
          )}

          {!user?.is_approved && (
            <p className="mt-6 text-yellow-400 text-sm">Your account must be approved to participate in ventures.</p>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Model */}
          <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Business Model</h2>
            <p className="text-dark-300">{project.business_model || 'Not specified'}</p>
          </div>

          {/* Overview */}
          {project.overview && (
            <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Overview</h2>
              <p className="text-dark-300">{project.overview}</p>
            </div>
          )}

          {/* Financial Snapshot */}
          {project.financial_snapshot && (
            <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Financial Snapshot</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-dark-400">Revenue</span>
                  <span className="text-white">{formatCurrency(project.financial_snapshot.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">EBITDA</span>
                  <span className="text-white">{formatCurrency(project.financial_snapshot.ebitda)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Valuation</span>
                  <span className="text-white">{formatCurrency(project.financial_snapshot.valuation)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cap Table Summary */}
          {project.cap_table_summary && (
            <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Cap Table Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-dark-400">Authorized Capital</span>
                  <span className="text-white">{formatCurrency(project.cap_table_summary.total_authorized)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Issued Capital</span>
                  <span className="text-white">{formatCurrency(project.cap_table_summary.issued_capital)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Investors</span>
                  <span className="text-white">{project.cap_table_summary.investor_count}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Risk Disclosure */}
        {project.risk_disclosure && (
          <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Risk Disclosure</h2>
            <p className="text-dark-300">{project.risk_disclosure}</p>
          </div>
        )}
      </div>

      {/* Participate Modal */}
      {showParticipateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-white mb-4">Request Participation</h2>
            <p className="text-dark-400 mb-4">
              Minimum participation: {formatCurrency(project.minimum_participation)}
            </p>

            <form onSubmit={handleParticipate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Investment Amount (USD)
                </label>
                <input
                  type="number"
                  value={participationAmount}
                  onChange={(e) => setParticipationAmount(e.target.value)}
                  min={project.minimum_participation}
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowParticipateModal(false)}
                  className="flex-1 py-3 px-4 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
