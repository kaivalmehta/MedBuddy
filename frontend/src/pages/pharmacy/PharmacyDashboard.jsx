// frontend/src/pages/pharmacy/PharmacyDashboard.jsx
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { analyticsService } from '../../services/user'
import { motion } from 'framer-motion'
import {
  Package, Clock, CheckCircle2, AlertTriangle, DollarSign, Star,
  TrendingUp, Users, ArrowRight, Bell, FileText
} from 'lucide-react'

export default function PharmacyDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['pharmacyDashboard'],
    queryFn: () => analyticsService.getPharmacyDashboard().then(r => r.data)
  })

  if (isLoading) return <DashboardSkeleton />

  const d = data || {}

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="gradient-primary rounded-3xl p-8 text-white relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Pharmacy Dashboard
          </h1>
          <p className="text-white/80 mb-6">Overview of your pharmacy operations</p>
          
          <div className="flex flex-wrap gap-4">
            <Link to="/pharmacy/orders" className="inline-flex items-center gap-2 bg-white text-primary-600 px-5 py-2.5 rounded-xl font-medium hover:bg-white/90 transition-colors">
              <Package className="w-5 h-5" />
              View Orders
            </Link>
            <Link to="/pharmacy/inventory" className="inline-flex items-center gap-2 bg-white/20 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-white/30 transition-colors">
              <FileText className="w-5 h-5" />
              Manage Inventory
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          icon={Package}
          label="Pending Orders"
          value={d.pending_orders || 0}
          color="warning"
          urgent={d.pending_orders > 5}
          delay={0.1}
        />
        <StatCard
          icon={Clock}
          label="Preparing"
          value={d.preparing || 0}
          color="primary"
          delay={0.2}
        />
        <StatCard
          icon={CheckCircle2}
          label="Ready for Pickup"
          value={d.ready_for_pickup || 0}
          color="success"
          delay={0.3}
        />
        <StatCard
          icon={AlertTriangle}
          label="Flagged"
          value={d.flagged_prescriptions || 0}
          color={d.flagged_prescriptions > 0 ? 'danger' : 'secondary'}
          delay={0.4}
        />
      </div>

      {/* Revenue & Rating */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display font-semibold text-secondary-800">Today's Performance</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-success-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-success-500" />
                </div>
                <span className="text-sm text-secondary-500">Revenue</span>
              </div>
              <p className="text-2xl font-display font-bold text-secondary-800">
                ${(d.revenue_today || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary-500" />
                </div>
                <span className="text-sm text-secondary-500">Completed</span>
              </div>
              <p className="text-2xl font-display font-bold text-secondary-800">
                {d.completed_today || 0}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display font-semibold text-secondary-800">Customer Rating</h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-accent-100 rounded-2xl flex items-center justify-center">
              <Star className="w-10 h-10 text-accent-500 fill-current" />
            </div>
            <div>
              <p className="text-4xl font-display font-bold text-secondary-800">
                {(d.rating || 0).toFixed(1)}
              </p>
              <p className="text-secondary-500">
                {d.total_reviews || 0} reviews
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-lg font-display font-semibold text-secondary-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAction to="/pharmacy/orders?status=received" icon={Package} label="New Orders" count={d.pending_orders} />
          <QuickAction to="/pharmacy/orders?status=preparing" icon={Clock} label="In Progress" count={d.preparing} />
          <QuickAction to="/pharmacy/orders?status=ready" icon={Bell} label="Ready Orders" count={d.ready_for_pickup} />
          <QuickAction to="/pharmacy/inventory" icon={TrendingUp} label="Inventory" />
        </div>
      </motion.div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, urgent, delay }) {
  const colors = {
    primary: 'bg-primary-500/10 text-primary-500',
    success: 'bg-success-500/10 text-success-500',
    warning: 'bg-warning-500/10 text-warning-500',
    danger: 'bg-danger-500/10 text-danger-500',
    secondary: 'bg-secondary-500/10 text-secondary-500',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`card-hover ${urgent ? 'ring-2 ring-warning-500' : ''}`}
    >
      <div className={`w-12 h-12 rounded-xl ${colors[color]} flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-2xl font-display font-bold text-secondary-800">{value}</p>
      <p className="text-sm text-secondary-500 mt-1">{label}</p>
    </motion.div>
  )
}

function QuickAction({ to, icon: Icon, label, count }) {
  return (
    <Link to={to} className="card-hover flex items-center gap-4 py-4">
      <Icon className="w-6 h-6 text-secondary-400" />
      <div className="flex-1">
        <span className="text-sm font-medium text-secondary-700">{label}</span>
      </div>
      {count > 0 && (
        <span className="bg-primary-500 text-white text-xs font-bold px-2 py-1 rounded-full">
          {count}
        </span>
      )}
      <ArrowRight className="w-4 h-4 text-gray-400" />
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-48 bg-gray-200 rounded-3xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl" />)}
      </div>
    </div>
  )
}


