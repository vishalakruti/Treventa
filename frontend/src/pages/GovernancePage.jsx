import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectService, governanceService } from '../services/apiService';
import Layout from '../components/Layout';

export default function GovernancePage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votesLoading, setVotesLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProject(data[0].id);
        loadVotes(data[0].id);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadVotes = async (projectId) => {
    setVotesLoading(true);
    try {
      const data = await projectService.getProjectVotes(projectId);
      setVotes(data);
    } catch (err) {
      setVotes([]);
    } finally {
      setVotesLoading(false);
    }
  };

  const handleProjectChange = (projectId) => {
    setSelectedProject(projectId);
    loadVotes(projectId);
  };

  const handleVote = async (voteId, choice) => {
    try {
      await governanceService.castVote(voteId, choice);
      setSuccessMessage('Vote cast successfully!');
      loadVotes(selectedProject);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to cast vote');
      setTimeout(() => setError(''), 3000);
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
        <div>
          <h1 className="text-2xl font-bold text-white">Governance</h1>
          <p className="text-dark-400">Participate in venture decisions</p>
        </div>

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

        {/* Project Selector */}
        <div className="bg-dark-800 rounded-lg border border-dark-700 p-4">
          <label className="block text-sm font-medium text-dark-300 mb-2">Select Venture</label>
          <select
            value={selectedProject || ''}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full md:w-64 px-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Votes List */}
        <div className="bg-dark-800 rounded-lg border border-dark-700">
          <div className="p-4 border-b border-dark-700">
            <h2 className="text-lg font-semibold text-white">Active Resolutions</h2>
          </div>

          {votesLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : votes.length > 0 ? (
            <div className="divide-y divide-dark-700">
              {votes.map((vote) => (
                <div key={vote.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-white">{vote.resolution_title}</h3>
                      <p className="text-dark-400 mt-1">{vote.resolution_description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      vote.status === 'open' ? 'bg-green-900/30 text-green-400' : 'bg-dark-700 text-dark-400'
                    }`}>
                      {vote.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-dark-400 mb-4">
                    <span>Approval Threshold: {vote.approval_threshold}%</span>
                    <span>Total Votes: {vote.total_votes}</span>
                    <span>Deadline: {new Date(vote.voting_deadline).toLocaleDateString()}</span>
                  </div>

                  {vote.status === 'open' && !vote.user_voted ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleVote(vote.id, 'yes')}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        Vote Yes
                      </button>
                      <button
                        onClick={() => handleVote(vote.id, 'no')}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        Vote No
                      </button>
                      <button
                        onClick={() => handleVote(vote.id, 'abstain')}
                        className="px-6 py-2 bg-dark-600 hover:bg-dark-500 text-white rounded-lg transition-colors"
                      >
                        Abstain
                      </button>
                    </div>
                  ) : vote.user_voted ? (
                    <p className="text-green-400">You have already voted on this resolution</p>
                  ) : (
                    <p className="text-dark-400">Voting is closed</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-dark-400">
              No active votes for this venture
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
