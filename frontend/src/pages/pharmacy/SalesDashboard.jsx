// frontend/src/pages/pharmacy/SalesDashboard.jsx
// Sales Dashboard with stats, history, and charts

import { useState, useEffect } from 'react'
import { 
  TrendingUp, DollarSign, ShoppingCart, Package, Calendar,
  ArrowUp, ArrowDown, Loader2, RefreshCw, Search, Filter,
  Clock, Pill, BarChart3
} from 'lucide-react'
import { salesService } from '../../services/pharmacy'

export default function SalesDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [filters, setFilters] = useState({
    type: '',
    from: '',
    to: '',
    search: ''
  })

  useEffect(() => {
    loadDashboard()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab, filters])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const res = await salesService.getDashboard()
      setDashboard(res.data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await salesService.getHistory(filters)
      setHistory(res.data.sales || [])
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-secondary-800">Sales Dashboard</h1>
            <p className="text-secondary-500">Track your pharmacy sales and revenue</p>
          </div>
        </div>
        <button onClick={loadDashboard} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'overview' 
              ? 'border-emerald-500 text-emerald-600' 
              : 'border-transparent text-secondary-500 hover:text-secondary-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'history' 
              ? 'border-emerald-500 text-emerald-600' 
              : 'border-transparent text-secondary-500 hover:text-secondary-700'
          }`}
        >
          Sales History
        </button>
      </div>

      {activeTab === 'overview' && dashboard && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Revenue */}
            <div className="card bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">Today's Revenue</p>
                  <p className="text-3xl font-bold mt-1">{formatCurrency(dashboard.today.revenue)}</p>
                  <p className="text-emerald-100 text-sm mt-1">{dashboard.today.count} sales</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Today's Profit */}
            <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Today's Profit</p>
                  <p className="text-3xl font-bold mt-1">{formatCurrency(dashboard.today.profit)}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* This Week */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-500 text-sm">This Week</p>
                  <p className="text-2xl font-bold text-secondary-800 mt-1">{formatCurrency(dashboard.week.revenue)}</p>
                  <p className="text-emerald-600 text-sm mt-1">
                    Profit: {formatCurrency(dashboard.week.profit)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>

            {/* This Month */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary-500 text-sm">This Month</p>
                  <p className="text-2xl font-bold text-secondary-800 mt-1">{formatCurrency(dashboard.month.revenue)}</p>
                  <p className="text-emerald-600 text-sm mt-1">
                    Profit: {formatCurrency(dashboard.month.profit)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Sales Chart */}
            <div className="card">
              <h3 className="font-semibold text-secondary-800 mb-4">Last 7 Days</h3>
              <div className="space-y-3">
                {dashboard.daily_sales?.map((day, idx) => {
                  const maxRevenue = Math.max(...dashboard.daily_sales.map(d => d.revenue)) || 1
                  const percentage = (day.revenue / maxRevenue) * 100
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-sm text-secondary-500 w-10">{day.day}</span>
                      <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-lg flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        >
                          {percentage > 20 && (
                            <span className="text-xs text-white font-medium">
                              {formatCurrency(day.revenue)}
                            </span>
                          )}
                        </div>
                      </div>
                      {percentage <= 20 && (
                        <span className="text-xs text-secondary-600 w-16 text-right">
                          {formatCurrency(day.revenue)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top Selling Items */}
            <div className="card">
              <h3 className="font-semibold text-secondary-800 mb-4">Top Selling Items (This Month)</h3>
              {dashboard.top_items?.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.top_items.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-medium">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-medium text-secondary-800">{item.drug_name}</p>
                          <p className="text-xs text-secondary-500">{item.total_qty} units sold</p>
                        </div>
                      </div>
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(item.total_revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-secondary-500 text-center py-8">No sales this month yet</p>
              )}
            </div>
          </div>

          {/* Recent Sales */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-secondary-800">Recent Sales</h3>
              <button 
                onClick={() => setActiveTab('history')} 
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                View All →
              </button>
            </div>
            {dashboard.recent_sales?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium text-secondary-600">Item</th>
                      <th className="text-center p-3 text-sm font-medium text-secondary-600">Qty</th>
                      <th className="text-center p-3 text-sm font-medium text-secondary-600">Type</th>
                      <th className="text-right p-3 text-sm font-medium text-secondary-600">Amount</th>
                      <th className="text-right p-3 text-sm font-medium text-secondary-600">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recent_sales.map((sale) => (
                      <tr key={sale.id} className="border-b border-gray-50">
                        <td className="p-3">
                          <p className="font-medium text-secondary-800">{sale.drug_name}</p>
                        </td>
                        <td className="p-3 text-center text-secondary-600">{sale.quantity}</td>
                        <td className="p-3 text-center">
                          <span className={`badge ${
                            sale.sale_type === 'prescription' ? 'badge-info' : 
                            sale.sale_type === 'return' ? 'badge-danger' : 'badge-success'
                          }`}>
                            {sale.sale_type}
                          </span>
                        </td>
                        <td className="p-3 text-right font-medium text-emerald-600">
                          {formatCurrency(sale.total_price)}
                        </td>
                        <td className="p-3 text-right text-sm text-secondary-500">
                          {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-secondary-500 text-center py-8">No recent sales</p>
            )}
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <>
          {/* Filters */}
          <div className="card">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                  placeholder="Search by drug or customer..."
                  className="input-field pl-12"
                />
              </div>
              <select
                value={filters.type}
                onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                className="input-field md:w-40"
              >
                <option value="">All Types</option>
                <option value="prescription">Prescription</option>
                <option value="otc">OTC</option>
                <option value="return">Returns</option>
              </select>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters(f => ({ ...f, from: e.target.value }))}
                className="input-field md:w-40"
                placeholder="From"
              />
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters(f => ({ ...f, to: e.target.value }))}
                className="input-field md:w-40"
                placeholder="To"
              />
            </div>
          </div>

          {/* History Table */}
          <div className="card overflow-hidden">
            {historyLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-secondary-500">No sales found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-secondary-600">Drug</th>
                      <th className="text-center p-4 text-sm font-medium text-secondary-600">Qty</th>
                      <th className="text-right p-4 text-sm font-medium text-secondary-600">Unit Price</th>
                      <th className="text-right p-4 text-sm font-medium text-secondary-600">Total</th>
                      <th className="text-right p-4 text-sm font-medium text-secondary-600">Profit</th>
                      <th className="text-center p-4 text-sm font-medium text-secondary-600">Type</th>
                      <th className="text-left p-4 text-sm font-medium text-secondary-600">Customer</th>
                      <th className="text-right p-4 text-sm font-medium text-secondary-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((sale) => (
                      <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="p-4">
                          <p className="font-medium text-secondary-800">{sale.drug_name}</p>
                          {sale.generic_name && (
                            <p className="text-xs text-secondary-500">{sale.generic_name}</p>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span className={sale.quantity < 0 ? 'text-red-600' : ''}>
                            {sale.quantity}
                          </span>
                        </td>
                        <td className="p-4 text-right text-secondary-600">
                          {formatCurrency(sale.unit_price)}
                        </td>
                        <td className="p-4 text-right font-medium text-secondary-800">
                          {formatCurrency(sale.total_price)}
                        </td>
                        <td className="p-4 text-right">
                          {sale.profit !== null ? (
                            <span className={sale.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                              {formatCurrency(sale.profit)}
                            </span>
                          ) : (
                            <span className="text-secondary-400">-</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`badge ${
                            sale.sale_type === 'prescription' ? 'badge-info' : 
                            sale.sale_type === 'return' ? 'badge-danger' : 'badge-success'
                          }`}>
                            {sale.sale_type}
                          </span>
                        </td>
                        <td className="p-4 text-secondary-600">
                          {sale.customer_name || '-'}
                        </td>
                        <td className="p-4 text-right text-sm text-secondary-500">
                          {new Date(sale.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
