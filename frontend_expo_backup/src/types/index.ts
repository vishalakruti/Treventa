export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  is_approved: boolean;
  kyc_status: string;
  nda_accepted: boolean;
  risk_acknowledged: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  sector: string;
  description: string;
  business_model?: string;
  capital_required: number;
  minimum_participation: number;
  timeline: string;
  risk_level: string;
  status: string;
  total_raised: number;
  investor_count: number;
  overview?: string;
  capital_structure?: string;
  risk_disclosure?: string;
  financial_snapshot?: FinancialSnapshot;
  cap_table_summary?: CapTableSummary;
}

export interface FinancialSnapshot {
  revenue: number;
  operating_expenses: number;
  net_profit: number;
  ebitda: number;
  cash_reserves: number;
  liabilities: number;
  asset_value: number;
  valuation: number;
  period: string;
}

export interface CapTableSummary {
  total_authorized: number;
  issued_capital: number;
  investor_count: number;
}

export interface CapTableEntry {
  investor_id: string;
  investor_name: string;
  invested_amount: number;
  equity_percentage: number;
  entry_date: string;
}

export interface CapTable {
  id: string;
  project_id: string;
  total_authorized_capital: number;
  issued_capital: number;
  entries: CapTableEntry[];
}

export interface Participation {
  id: string;
  project_id: string;
  investor_id: string;
  investor_name: string;
  amount: number;
  notes?: string;
  status: string;
  created_at: string;
}

export interface Distribution {
  distribution_id: string;
  project_id: string;
  project_name: string;
  distribution_type: string;
  amount: number;
  status: string;
  created_at: string;
}

export interface Vote {
  id: string;
  resolution_title: string;
  resolution_description: string;
  voting_deadline: string;
  approval_threshold: number;
  status: string;
  total_votes: number;
  user_voted: boolean;
}

export interface PortfolioItem {
  project_id: string;
  project_name: string;
  sector: string;
  invested_amount: number;
  equity_percentage: number;
  current_valuation: number;
  unrealized_gain: number;
  realized_profit: number;
  status: string;
}

export interface PortfolioSummary {
  total_capital_deployed: number;
  current_portfolio_valuation: number;
  net_gain_loss: number;
  distributed_capital: number;
  active_ventures: number;
}

export interface SectorAllocation {
  sector: string;
  amount: number;
}

export interface DashboardData {
  summary: PortfolioSummary;
  sector_allocation: SectorAllocation[];
  recent_activity: any[];
  vote_notices: any[];
  portfolio_items: PortfolioItem[];
}

export interface KYCDocument {
  id: string;
  document_type: string;
  file_name: string;
  status: string;
  uploaded_at: string;
}
