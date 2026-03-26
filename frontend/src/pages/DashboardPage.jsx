import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { portfolioService } from '../services/apiService';
import Layout from '../components/Layout';

export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await portfolioService.getDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load dashboard');
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
        {/* Welcome Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome, {user?.full_name || 'Investor'}</h1>
            <p className="text-dark-400">Here's your portfolio overview</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${user?.is_approved ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
            {user?.is_approved ? 'Verified' : 'Pending Approval'}
          </span>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
            <p className="text-dark-400 text-sm">Total Deployed</p>
            <p className="text-2xl font-bold text-white mt-1">
              {formatCurrency(dashboard?.summary?.total_capital_deployed)}
            </p>
          </div>
          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
            <p className="text-dark-400 text-sm">Current Valuation</p>
            <p className="text-2xl font-bold text-white mt-1">
              {formatCurrency(dashboard?.summary?.current_portfolio_valuation)}
            </p>
          </div>
          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
            <p className="text-dark-400 text-sm">Net Gain/Loss</p>
            <p className={`text-2xl font-bold mt-1 ${(dashboard?.summary?.net_gain_loss || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(dashboard?.summary?.net_gain_loss)}
            </p>
          </div>
          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
            <p className="text-dark-400 text-sm">Active Ventures</p>
            <p className="text-2xl font-bold text-white mt-1">
              {dashboard?.summary?.active_ventures || 0}
            </p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Portfolio Items */}
          <div className="bg-dark-800 rounded-lg border border-dark-700">
            <div className="p-4 border-b border-dark-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Portfolio</h2>
              <Link to="/investments" className="text-primary-400 text-sm hover:text-primary-300">
                View All
              </Link>
            </div>
            <div className="p-4">
              {dashboard?.portfolio_items?.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.portfolio_items.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-dark-700 last:border-0">
                      <div>
                        <p className="text-white font-medium">{item.project_name}</p>
                        <p className="text-dark-400 text-sm">{item.sector}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white">{formatCurrency(item.invested_amount)}</p>
                        <p className={`text-sm ${item.unrealized_gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.unrealized_gain >= 0 ? '+' : ''}{formatCurrency(item.unrealized_gain)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-dark-400 text-center py-8">No investments yet</p>
              )}
            </div>
          </div>

          {/* Sector Allocation */}
          <div className="bg-dark-800 rounded-lg border border-dark-700">
            <div className="p-4 border-b border-dark-700">
              <h2 className="text-lg font-semibold text-white">Sector Allocation</h2>
            </div>
            <div className="p-4">
              {dashboard?.sector_allocation?.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.sector_allocation.map((sector, index) => {
                    const total = dashboard.sector_allocation.reduce((sum, s) => sum + s.amount, 0);
                    const percentage = total > 0 ? (sector.amount / total * 100).toFixed(1) : 0;
                    return (
                      <div key={index}>
                        <div className="flex justify-between mb-1">
                          <span className="text-dark-300">{sector.sector}</span>
                          <span className="text-white">{percentage}%</span>
                        </div>
                        <div className="w-full bg-dark-700 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-dark-400 text-center py-8">No allocation data</p>
              )}
            </div>
          </div>
        </div>

        {/* Vote Notices */}
        {dashboard?.vote_notices?.length > 0 && (
          <div className="bg-dark-800 rounded-lg border border-dark-700">
            <div className="p-4 border-b border-dark-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Active Votes</h2>
              <Link to="/governance" className="text-primary-400 text-sm hover:text-primary-300">
                View All
              </Link>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {dashboard.vote_notices.map((vote, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-dark-700 last:border-0">
                    <div>
                      <p className="text-white font-medium">{vote.title}</p>
                      <p className="text-dark-400 text-sm">{vote.project_name}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${vote.has_voted ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                      {vote.has_voted ? 'Voted' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
