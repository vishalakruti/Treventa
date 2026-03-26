import { useState, useEffect } from 'react';
import { distributionService } from '../services/apiService';
import Layout from '../components/Layout';

export default function DistributionsPage() {
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDistributions();
  }, []);

  const loadDistributions = async () => {
    try {
      const data = await distributionService.getMyDistributions();
      setDistributions(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load distributions');
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

  const totalDistributed = distributions.reduce((sum, d) => sum + (d.amount || 0), 0);

  const getTypeColor = (type) => {
    switch (type) {
      case 'profit': return 'bg-green-900/30 text-green-400';
      case 'dividend': return 'bg-blue-900/30 text-blue-400';
      case 'exit': return 'bg-purple-900/30 text-purple-400';
      default: return 'bg-dark-700 text-dark-400';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-900/30 text-green-400';
      case 'pending': return 'bg-yellow-900/30 text-yellow-400';
      default: return 'bg-dark-700 text-dark-400';
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
          <h1 className="text-2xl font-bold text-white">Distributions</h1>
          <p className="text-dark-400">Track your profit distributions and payouts</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Summary Card */}
        <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-dark-400 text-sm">Total Distributed</p>
              <p className="text-3xl font-bold text-white mt-1">{formatCurrency(totalDistributed)}</p>
            </div>
            <div className="text-right">
              <p className="text-dark-400 text-sm">Total Distributions</p>
              <p className="text-3xl font-bold text-white mt-1">{distributions.length}</p>
            </div>
          </div>
        </div>

        {/* Distributions Table */}
        <div className="bg-dark-800 rounded-lg border border-dark-700">
          <div className="p-4 border-b border-dark-700">
            <h2 className="text-lg font-semibold text-white">Distribution History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left p-4 text-dark-400 font-medium">Venture</th>
                  <th className="text-left p-4 text-dark-400 font-medium">Type</th>
                  <th className="text-right p-4 text-dark-400 font-medium">Amount</th>
                  <th className="text-center p-4 text-dark-400 font-medium">Status</th>
                  <th className="text-right p-4 text-dark-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {distributions.length > 0 ? (
                  distributions.map((dist, index) => (
                    <tr key={index} className="border-b border-dark-700 last:border-0 hover:bg-dark-700/50">
                      <td className="p-4 text-white font-medium">{dist.project_name}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(dist.distribution_type)}`}>
                          {dist.distribution_type}
                        </span>
                      </td>
                      <td className="p-4 text-right text-green-400 font-medium">
                        +{formatCurrency(dist.amount)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(dist.status)}`}>
                          {dist.status}
                        </span>
                      </td>
                      <td className="p-4 text-right text-dark-400">
                        {new Date(dist.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-dark-400">
                      No distributions yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
