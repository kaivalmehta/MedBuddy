// frontend/src/pages/patient/Dashboard.jsx
import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { analyticsService } from '../../services/user'
import { reminderService } from '../../services/prescriptions'
import { motion } from 'framer-motion'
import { differenceInMinutes, parseISO, isToday, format } from 'date-fns'
import {
  Pill, AlertTriangle, Clock, Upload, CheckCircle2,
  FileText, ArrowRight, Calendar, Shield, Activity,
  Bell, XCircle, Timer, SkipForward
} from 'lucide-react'

// Dose status types (same as Reminders page)
const DOSE_STATUS = {
  UPCOMING: 'upcoming',
  DUE_NOW: 'due_now',
  OVERDUE: 'overdue',
  TAKEN: 'taken',
  MISSED: 'missed',
  SKIPPED: 'skipped'
}

export default function Dashboard() {
  const { user } = useAuth()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['patientDashboard'],
    queryFn: () => analyticsService.getPatientDashboard().then(r => r.data)
  })

  // Fetch reminders for real-time status
  const { data: remindersData, isLoading: remindersLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => reminderService.list().then(r => r.data),
    refetchInterval: 60000
  })

  // Process reminders with real-time status
  const processedReminders = useMemo(() => {
    if (!remindersData?.results) return []
    
    return remindersData.results
      .filter(r => r.is_active)
      .map(reminder => {
        const status = getDoseStatus(reminder, currentTime)
        return { ...reminder, status }
      })
  }, [remindersData, currentTime])

  // Calculate real-time stats
  const doseStats = useMemo(() => {
    const total = processedReminders.length
    const taken = processedReminders.filter(r => r.status === DOSE_STATUS.TAKEN).length
    const overdue = processedReminders.filter(r => r.status === DOSE_STATUS.OVERDUE).length
    const missed = processedReminders.filter(r => r.status === DOSE_STATUS.MISSED).length
    const skipped = processedReminders.filter(r => r.status === DOSE_STATUS.SKIPPED).length
    const dueNow = processedReminders.filter(r => r.status === DOSE_STATUS.DUE_NOW).length
    const upcoming = processedReminders.filter(r => r.status === DOSE_STATUS.UPCOMING).length
    const pending = overdue + dueNow + upcoming
    
    return { total, taken, overdue, missed, skipped, dueNow, upcoming, pending }
  }, [processedReminders])

  // Get overdue reminders for alert
  const overdueReminders = processedReminders.filter(r => r.status === DOSE_STATUS.OVERDUE)

  const isLoading = dashboardLoading || remindersLoading

  if (isLoading) {
    return <DashboardSkeleton />
  }

  const d = dashboardData || {}

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="gradient-primary rounded-3xl p-8 text-white relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
        <div className="absolute right-20 bottom-0 w-32 h-32 bg-white/5 rounded-full -mb-16" />
        
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
            Good {getGreeting()}, {user?.first_name || 'there'}! 👋
          </h1>
          <p className="text-white/80 mb-6">Here's your health summary for today</p>
          
          <div className="flex flex-wrap gap-4">
            <Link to="/upload" className="inline-flex items-center gap-2 bg-white text-primary-600 px-5 py-2.5 rounded-xl font-medium hover:bg-white/90 transition-colors">
              <Upload className="w-5 h-5" />
              Upload Prescription
            </Link>
            <Link to="/reminders" className="inline-flex items-center gap-2 bg-white/20 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-white/30 transition-colors">
              <Clock className="w-5 h-5" />
              View Reminders
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Overdue Alert */}
      {doseStats.overdue > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-danger-50 border border-danger-200 rounded-xl"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-danger-100 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
              <AlertTriangle className="w-6 h-6 text-danger-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-danger-700">
                You have {doseStats.overdue} overdue medication{doseStats.overdue > 1 ? 's' : ''}!
              </p>
              <p className="text-sm text-danger-600">
                {overdueReminders.slice(0, 2).map(r => r.drug_name).join(', ')}
                {overdueReminders.length > 2 && ` and ${overdueReminders.length - 2} more`}
              </p>
            </div>
            <Link 
              to="/reminders" 
              className="btn-primary bg-danger-500 hover:bg-danger-600 flex items-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Take Now
            </Link>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          icon={Pill}
          label="Active Medications"
          value={doseStats.total}
          color="primary"
          delay={0.1}
        />
        <StatCard
          icon={CheckCircle2}
          label="Taken Today"
          value={`${doseStats.taken}/${doseStats.total}`}
          color="success"
          delay={0.2}
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={doseStats.overdue}
          color={doseStats.overdue > 0 ? 'danger' : 'success'}
          pulse={doseStats.overdue > 0}
          delay={0.3}
        />
        <StatCard
          icon={Clock}
          label="Pending Orders"
          value={d.pending_orders || 0}
          color="secondary"
          delay={0.4}
        />
      </div>

      {/* Today's Medications & Recent Prescriptions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Doses - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display font-semibold text-secondary-800">Today's Doses</h2>
            <Link to="/reminders" className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {doseStats.total === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Pill className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-secondary-500">No medications scheduled for today</p>
              <Link to="/upload" className="text-primary-600 text-sm font-medium mt-2 inline-block">
                Upload a prescription to get started
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Taken */}
              <DoseProgress
                icon={CheckCircle2}
                label="Taken"
                count={doseStats.taken}
                total={doseStats.total}
                color="bg-success-500"
                textColor="text-success-600"
              />
              
              {/* Overdue */}
              {doseStats.overdue > 0 && (
                <DoseProgress
                  icon={AlertTriangle}
                  label="Overdue"
                  count={doseStats.overdue}
                  total={doseStats.total}
                  color="bg-danger-500"
                  textColor="text-danger-600"
                  pulse
                />
              )}
              
              {/* Due Now */}
              {doseStats.dueNow > 0 && (
                <DoseProgress
                  icon={Bell}
                  label="Due Now"
                  count={doseStats.dueNow}
                  total={doseStats.total}
                  color="bg-primary-500"
                  textColor="text-primary-600"
                />
              )}
              
              {/* Upcoming */}
              {doseStats.upcoming > 0 && (
                <DoseProgress
                  icon={Clock}
                  label="Upcoming"
                  count={doseStats.upcoming}
                  total={doseStats.total}
                  color="bg-gray-300"
                  textColor="text-secondary-600"
                />
              )}
              
              {/* Skipped */}
              {doseStats.skipped > 0 && (
                <DoseProgress
                  icon={SkipForward}
                  label="Skipped"
                  count={doseStats.skipped}
                  total={doseStats.total}
                  color="bg-amber-400"
                  textColor="text-amber-600"
                />
              )}
              
              {/* Missed */}
              {doseStats.missed > 0 && (
                <DoseProgress
                  icon={XCircle}
                  label="Missed"
                  count={doseStats.missed}
                  total={doseStats.total}
                  color="bg-danger-400"
                  textColor="text-danger-600"
                />
              )}
            </div>
          )}

          {/* Next Dose Info */}
          {doseStats.total > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <NextDoseInfo reminders={processedReminders} currentTime={currentTime} />
            </div>
          )}
        </motion.div>

        {/* Recent Prescriptions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display font-semibold text-secondary-800">Recent Prescriptions</h2>
            <Link to="/prescriptions" className="text-primary-600 text-sm font-medium hover:text-primary-700 flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {!d.recent_prescriptions?.length ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-secondary-500">No prescriptions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {d.recent_prescriptions.slice(0, 4).map((rx, idx) => (
                <Link
                  key={rx.id}
                  to={`/prescriptions/${rx.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    rx.safety_score >= 7 ? 'bg-success-500/10' : 
                    rx.safety_score >= 4 ? 'bg-warning-500/10' : 'bg-danger-500/10'
                  }`}>
                    <Shield className={`w-5 h-5 ${
                      rx.safety_score >= 7 ? 'text-success-500' :
                      rx.safety_score >= 4 ? 'text-warning-500' : 'text-danger-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-secondary-800 truncate">
                      {rx.doctor || 'Prescription'}
                    </p>
                    <p className="text-sm text-secondary-500">{formatDate(rx.date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${getStatusBadge(rx.status)}`}>
                      {rx.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
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
          <QuickAction to="/upload" icon={Upload} label="Upload Prescription" color="primary" />
          <QuickAction to="/health-profile" icon={Activity} label="Update Profile" color="secondary" />
          <QuickAction to="/pharmacies" icon={Calendar} label="Find Pharmacy" color="accent" />
          <QuickAction to="/prescriptions" icon={FileText} label="View History" color="success" />
        </div>
      </motion.div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, delay, pulse }) {
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
      className={`card-hover ${pulse ? 'ring-2 ring-danger-300 animate-pulse' : ''}`}
    >
      <div className={`w-12 h-12 rounded-xl ${colors[color]} flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-2xl font-display font-bold text-secondary-800">{value}</p>
      <p className="text-sm text-secondary-500 mt-1">{label}</p>
    </motion.div>
  )
}

function DoseProgress({ icon: Icon, label, count, total, color, textColor, pulse }) {
  const percent = Math.round((count / total) * 100)
  return (
    <div className={pulse ? 'animate-pulse' : ''}>
      <div className="flex justify-between text-sm mb-1">
        <span className={`flex items-center gap-1.5 ${textColor}`}>
          <Icon className="w-4 h-4" />
          {label}
        </span>
        <span className={`font-medium ${textColor}`}>{count}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-500`} 
          style={{ width: `${percent}%` }} 
        />
      </div>
    </div>
  )
}

function NextDoseInfo({ reminders, currentTime }) {
  // Find the next upcoming or due now dose
  const nextDose = reminders
    .filter(r => r.status === DOSE_STATUS.UPCOMING || r.status === DOSE_STATUS.DUE_NOW)
    .sort((a, b) => a.reminder_time.localeCompare(b.reminder_time))[0]

  // Or find overdue if no upcoming
  const overdueDose = reminders
    .filter(r => r.status === DOSE_STATUS.OVERDUE)
    .sort((a, b) => a.reminder_time.localeCompare(b.reminder_time))[0]

  const displayDose = nextDose || overdueDose

  if (!displayDose) {
    if (reminders.every(r => r.status === DOSE_STATUS.TAKEN)) {
      return (
        <div className="flex items-center gap-3 p-3 bg-success-50 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-success-500" />
          <div>
            <p className="font-medium text-success-700">All done for today! 🎉</p>
            <p className="text-sm text-success-600">Great job staying on track</p>
          </div>
        </div>
      )
    }
    return null
  }

  const isOverdue = displayDose.status === DOSE_STATUS.OVERDUE
  const timeInfo = getTimeUntilDose(displayDose.reminder_time, currentTime)

  return (
    <Link 
      to="/reminders" 
      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
        isOverdue 
          ? 'bg-danger-50 hover:bg-danger-100' 
          : 'bg-primary-50 hover:bg-primary-100'
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        isOverdue ? 'bg-danger-100' : 'bg-primary-100'
      }`}>
        {isOverdue ? (
          <AlertTriangle className="w-5 h-5 text-danger-500" />
        ) : (
          <Timer className="w-5 h-5 text-primary-500" />
        )}
      </div>
      <div className="flex-1">
        <p className={`font-medium ${isOverdue ? 'text-danger-700' : 'text-primary-700'}`}>
          {isOverdue ? 'Overdue' : 'Next'}: {displayDose.drug_name}
        </p>
        <p className={`text-sm ${isOverdue ? 'text-danger-600' : 'text-primary-600'}`}>
          {displayDose.dosage} • {timeInfo}
        </p>
      </div>
      <ArrowRight className={`w-5 h-5 ${isOverdue ? 'text-danger-400' : 'text-primary-400'}`} />
    </Link>
  )
}

function QuickAction({ to, icon: Icon, label, color }) {
  const colors = {
    primary: 'hover:border-primary-300 hover:bg-primary-50',
    secondary: 'hover:border-secondary-300 hover:bg-secondary-50',
    accent: 'hover:border-accent-300 hover:bg-accent-50',
    success: 'hover:border-success-500/30 hover:bg-success-500/5',
  }

  return (
    <Link
      to={to}
      className={`card-hover flex flex-col items-center text-center py-6 ${colors[color]}`}
    >
      <Icon className="w-8 h-8 text-secondary-400 mb-3" />
      <span className="text-sm font-medium text-secondary-700">{label}</span>
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-48 bg-gray-200 rounded-3xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-2xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="h-64 bg-gray-200 rounded-2xl" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  )
}

// Helper Functions
function getDoseStatus(reminder, currentTime) {
  // If already taken today
  if (reminder.taken_today) return DOSE_STATUS.TAKEN
  if (reminder.last_taken_at) {
    const lastTaken = parseISO(reminder.last_taken_at)
    if (isToday(lastTaken)) return DOSE_STATUS.TAKEN
  }

  // If explicitly marked
  if (reminder.missed_today) return DOSE_STATUS.MISSED
  if (reminder.skipped_today) return DOSE_STATUS.SKIPPED

  // Calculate based on time
  const [hours, minutes] = reminder.reminder_time.split(':').map(Number)
  const scheduledTime = new Date(currentTime)
  scheduledTime.setHours(hours, minutes, 0, 0)

  const diffMinutes = differenceInMinutes(currentTime, scheduledTime)

  if (diffMinutes < -30) return DOSE_STATUS.UPCOMING
  if (diffMinutes >= -30 && diffMinutes <= 30) return DOSE_STATUS.DUE_NOW
  if (diffMinutes > 30) return DOSE_STATUS.OVERDUE

  return DOSE_STATUS.UPCOMING
}

function getTimeUntilDose(timeStr, currentTime) {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const scheduledTime = new Date(currentTime)
  scheduledTime.setHours(hours, minutes, 0, 0)

  const diffMinutes = differenceInMinutes(scheduledTime, currentTime)

  if (diffMinutes > 0) {
    if (diffMinutes < 60) return `in ${diffMinutes} min`
    const hrs = Math.floor(diffMinutes / 60)
    const mins = diffMinutes % 60
    return `in ${hrs}h ${mins}m`
  } else {
    const overdue = Math.abs(diffMinutes)
    if (overdue < 60) return `${overdue} min overdue`
    const hrs = Math.floor(overdue / 60)
    const mins = overdue % 60
    return `${hrs}h ${mins}m overdue`
  }
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown date'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getStatusBadge(status) {
  const badges = {
    uploaded: 'badge-secondary',
    processing: 'badge-warning',
    analyzed: 'badge-success',
    sent_to_pharmacy: 'badge-primary',
    completed: 'badge-success',
  }
  return badges[status] || 'badge-secondary'
}