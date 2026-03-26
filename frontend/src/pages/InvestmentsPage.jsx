import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { participationService, portfolioService } from '../services/apiService';
import Layout from '../components/Layout';

export default function InvestmentsPage() {
  const [participations, setParticipations] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [participationsData, portfolioData] = await Promise.all([
        participationService.getMyParticipations(),
        portfolioService.getPortfolioSummary(),
      ]);
      setParticipations(participationsData);
      setPortfolio(portfolioData);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load investments');
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-900/30 text-green-400';
      case 'pending': return 'bg-yellow-900/30 text-yellow-400';
      case 'rejected': return 'bg-red-900/30 text-red-400';
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
          <h1 className="text-2xl font-bold text-white">My Investments</h1>
          <p className="text-dark-400">Track your venture participations</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {portfolio && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
              <p className="text-dark-400 text-sm">Total Deployed</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(portfolio.summary?.total_capital_deployed)}
              </p>
            </div>
            <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
              <p className="text-dark-400 text-sm">Current Valuation</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(portfolio.summary?.current_portfolio_valuation)}
              </p>
            </div>
            <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
              <p className="text-dark-400 text-sm">Distributed</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(portfolio.summary?.distributed_capital)}
              </p>
            </div>
            <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
              <p className="text-dark-400 text-sm">Net Gain/Loss</p>
              <p className={`text-2xl font-bold mt-1 ${(portfolio.summary?.net_gain_loss || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(portfolio.summary?.net_gain_loss)}
              </p>
            </div>
          </div>
        )}

        {/* Portfolio Items */}
        <div className="bg-dark-800 rounded-lg border border-dark-700">
          <div className="p-4 border-b border-dark-700">
            <h2 className="text-lg font-semibold text-white">Portfolio Holdings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left p-4 text-dark-400 font-medium">Venture</th>
                  <th className="text-left p-4 text-dark-400 font-medium">Sector</th>
                  <th className="text-right p-4 text-dark-400 font-medium">Invested</th>
                  <th className="text-right p-4 text-dark-400 font-medium">Equity %</th>
                  <th className="text-right p-4 text-dark-400 font-medium">Current Value</th>
                  <th className="text-right p-4 text-dark-400 font-medium">Gain/Loss</th>
                  <th className="text-center p-4 text-dark-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {portfolio?.portfolio_items?.length > 0 ? (
                  portfolio.portfolio_items.map((item, index) => (
                    <tr key={index} className="border-b border-dark-700 last:border-0 hover:bg-dark-700/50">
                      <td className="p-4">
                        <Link to={`/projects/${item.project_id}`} className="text-white hover:text-primary-400 font-medium">
                          {item.project_name}
                        </Link>
                      </td>
                      <td className="p-4 text-dark-300">{item.sector}</td>
                      <td className="p-4 text-right text-white">{formatCurrency(item.invested_amount)}</td>
                      <td className="p-4 text-right text-white">{item.equity_percentage?.toFixed(2)}%</td>
                      <td className="p-4 text-right text-white">{formatCurrency(item.current_valuation)}</td>
                      <td className={`p-4 text-right ${item.unrealized_gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.unrealized_gain >= 0 ? '+' : ''}{formatCurrency(item.unrealized_gain)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${item.status === 'open' ? 'bg-green-900/30 text-green-400' : 'bg-dark-700 text-dark-400'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-dark-400">
                      No investments yet. <Link to="/projects" className="text-primary-400 hover:text-primary-300">Explore ventures</Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Participation Requests */}
        <div className="bg-dark-800 rounded-lg border border-dark-700">
          <div className="p-4 border-b border-dark-700">
            <h2 className="text-lg font-semibold text-white">Participation Requests</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left p-4 text-dark-400 font-medium">Venture</th>
                  <th className="text-right p-4 text-dark-400 font-medium">Amount</th>
                  <th className="text-center p-4 text-dark-400 font-medium">Status</th>
                  <th className="text-right p-4 text-dark-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {participations?.length > 0 ? (
                  participations.map((p, index) => (
                    <tr key={index} className="border-b border-dark-700 last:border-0 hover:bg-dark-700/50">
                      <td className="p-4 text-white">{p.investor_name || p.project_id}</td>
                      <td className="p-4 text-right text-white">{formatCurrency(p.amount)}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-right text-dark-400">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-dark-400">
                      No participation requests
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
