// frontend/src/pages/patient/Reminders.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { reminderService } from '../../services/prescriptions'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, Check, Clock, Pill, Trash2, ToggleLeft, ToggleRight,
  Calendar, TrendingUp, Loader2, AlertCircle, X, Sun, Sunrise,
  Sunset, Moon, CheckCircle2, XCircle, AlertTriangle, SkipForward,
  ChevronDown, ChevronUp, Timer, RefreshCw, ArrowLeft
} from 'lucide-react'
import { format, parseISO, isToday, differenceInMinutes } from 'date-fns'

// Time periods for grouping
const TIME_PERIODS = [
  { id: 'morning', label: 'Morning', icon: Sunrise, start: 5, end: 12, color: 'amber' },
  { id: 'afternoon', label: 'Afternoon', icon: Sun, start: 12, end: 17, color: 'orange' },
  { id: 'evening', label: 'Evening', icon: Sunset, start: 17, end: 21, color: 'purple' },
  { id: 'night', label: 'Night', icon: Moon, start: 21, end: 5, color: 'indigo' },
]

// Dose status types
const DOSE_STATUS = {
  UPCOMING: 'upcoming',
  DUE_NOW: 'due_now',
  OVERDUE: 'overdue',
  TAKEN: 'taken',
  MISSED: 'missed',
  SKIPPED: 'skipped'
}

export default function Reminders() {
  const queryClient = useQueryClient()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [expandedPeriod, setExpandedPeriod] = useState(null)
  const [showMissedSection, setShowMissedSection] = useState(true)
  const [showSkippedSection, setShowSkippedSection] = useState(true)
  const [showTakenModal, setShowTakenModal] = useState(null)
  
  // Local state to track actions (works even without backend)
  const [localActions, setLocalActions] = useState({})

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Auto-expand current time period
  useEffect(() => {
    const hour = currentTime.getHours()
    const currentPeriod = TIME_PERIODS.find(p => 
      p.id === 'night' 
        ? (hour >= p.start || hour < p.end)
        : (hour >= p.start && hour < p.end)
    )
    if (currentPeriod && !expandedPeriod) {
      setExpandedPeriod(currentPeriod.id)
    }
  }, [])

  const { data: reminders, isLoading, refetch } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => reminderService.list().then(r => r.data),
    refetchInterval: 60000
  })

  const markTakenMutation = useMutation({
    mutationFn: ({ id, notes, taken_at }) => reminderService.markTaken(id, notes, taken_at),
    onSuccess: (_, variables) => {
      setLocalActions(prev => ({ ...prev, [variables.id]: { status: DOSE_STATUS.TAKEN, time: new Date() } }))
      queryClient.invalidateQueries(['reminders'])
      setShowTakenModal(null)
    },
    onError: (error, variables) => {
      console.error('Mark taken failed:', error)
      // Still update local state for demo
      setLocalActions(prev => ({ ...prev, [variables.id]: { status: DOSE_STATUS.TAKEN, time: new Date() } }))
      setShowTakenModal(null)
    }
  })

  const markMissedMutation = useMutation({
    mutationFn: ({ id }) => reminderService.markMissed(id),
    onSuccess: (_, variables) => {
      setLocalActions(prev => ({ ...prev, [variables.id]: { status: DOSE_STATUS.MISSED, time: new Date() } }))
      queryClient.invalidateQueries(['reminders'])
    },
    onError: (error, variables) => {
      console.error('Mark missed failed:', error)
      // Still update local state for demo
      setLocalActions(prev => ({ ...prev, [variables.id]: { status: DOSE_STATUS.MISSED, time: new Date() } }))
    }
  })

  const skipDoseMutation = useMutation({
    mutationFn: ({ id, reason }) => reminderService.skipDose(id, reason),
    onSuccess: (_, variables) => {
      setLocalActions(prev => ({ ...prev, [variables.id]: { status: DOSE_STATUS.SKIPPED, reason: variables.reason, time: new Date() } }))
      queryClient.invalidateQueries(['reminders'])
    },
    onError: (error, variables) => {
      console.error('Skip failed:', error)
      // Still update local state for demo
      setLocalActions(prev => ({ ...prev, [variables.id]: { status: DOSE_STATUS.SKIPPED, reason: variables.reason, time: new Date() } }))
    }
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => reminderService.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries(['reminders'])
  })

  // Process reminders with status (including local actions)
  const processedReminders = useMemo(() => {
    if (!reminders?.results) return []
    
    return reminders.results.map(reminder => {
      // Check local actions first
      const localAction = localActions[reminder.id]
      if (localAction) {
        return { 
          ...reminder, 
          status: localAction.status,
          localAction: localAction,
          timePeriod: getTimePeriod(reminder.reminder_time)
        }
      }
      
      const status = getDoseStatus(reminder, currentTime)
      const timePeriod = getTimePeriod(reminder.reminder_time)
      return { ...reminder, status, timePeriod }
    })
  }, [reminders, currentTime, localActions])

  // Separate lists
  const activeReminders = processedReminders.filter(r => r.is_active)
  const missedReminders = activeReminders.filter(r => r.status === DOSE_STATUS.MISSED)
  const skippedReminders = activeReminders.filter(r => r.status === DOSE_STATUS.SKIPPED)
  const takenReminders = activeReminders.filter(r => r.status === DOSE_STATUS.TAKEN)
  const pendingReminders = activeReminders.filter(r => 
    ![DOSE_STATUS.TAKEN, DOSE_STATUS.MISSED, DOSE_STATUS.SKIPPED].includes(r.status)
  )

  // Group pending by time period
  const groupedReminders = useMemo(() => {
    const groups = {}
    TIME_PERIODS.forEach(p => { groups[p.id] = [] })
    
    pendingReminders.forEach(r => {
      if (groups[r.timePeriod]) {
        groups[r.timePeriod].push(r)
      }
    })
    
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => a.reminder_time.localeCompare(b.reminder_time))
    })
    
    return groups
  }, [pendingReminders])

  // Calculate stats
  const stats = useMemo(() => {
    const todaysDoses = activeReminders.length
    const taken = takenReminders.length
    const overdue = pendingReminders.filter(r => r.status === DOSE_STATUS.OVERDUE).length
    const missed = missedReminders.length
    const skipped = skippedReminders.length
    
    return { 
      todaysDoses, 
      taken, 
      overdue, 
      missed, 
      skipped,
      adherence: todaysDoses > 0 ? Math.round((taken / todaysDoses) * 100) : 100 
    }
  }, [activeReminders, takenReminders, pendingReminders, missedReminders, skippedReminders])

  // Action handlers
  const handleSkip = (reminder, reason) => {
    skipDoseMutation.mutate({ id: reminder.id, reason })
  }

  const handleMarkMissed = (reminder) => {
    markMissedMutation.mutate({ id: reminder.id })
  }

  const handleMarkTaken = (reminder) => {
    setShowTakenModal(reminder)
  }

  if (isLoading) return <RemindersSkeleton />

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-secondary-600 hover:text-secondary-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Dashboard</span>
        </Link>
      </motion.div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-display font-bold text-secondary-800">Medication Reminders</h1>
            <p className="text-secondary-500">Track your medication schedule and adherence</p>
          </div>
          <button 
            onClick={() => refetch()} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-secondary-400" />
          </button>
        </div>
        <p className="text-sm text-secondary-400">
          Current time: {format(currentTime, 'h:mm a')}
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-3"
      >
        <StatCard icon={Calendar} label="Total" value={stats.todaysDoses} color="primary" />
        <StatCard icon={CheckCircle2} label="Taken" value={stats.taken} color="success" />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} color={stats.overdue > 0 ? 'danger' : 'secondary'} pulse={stats.overdue > 0} />
        <StatCard icon={XCircle} label="Missed" value={stats.missed} color={stats.missed > 0 ? 'danger' : 'secondary'} />
        <StatCard icon={SkipForward} label="Skipped" value={stats.skipped} color={stats.skipped > 0 ? 'warning' : 'secondary'} />
      </motion.div>

      {/* Overdue Alert */}
      {stats.overdue > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-danger-50 border border-danger-200 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-danger-100 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
              <AlertTriangle className="w-5 h-5 text-danger-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-danger-700">
                You have {stats.overdue} overdue medication{stats.overdue > 1 ? 's' : ''}!
              </p>
              <p className="text-sm text-danger-600">
                Take them now, or mark as missed/skipped if you can't
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Missed Medications Section */}
      {missedReminders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card border-l-4 border-l-danger-500"
        >
          <button
            onClick={() => setShowMissedSection(!showMissedSection)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-danger-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-danger-500" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-danger-700">Missed Medications</h3>
                <p className="text-sm text-danger-500">{missedReminders.length} dose{missedReminders.length !== 1 ? 's' : ''} missed today</p>
              </div>
            </div>
            {showMissedSection ? <ChevronUp className="w-5 h-5 text-danger-400" /> : <ChevronDown className="w-5 h-5 text-danger-400" />}
          </button>
          
          <AnimatePresence>
            {showMissedSection && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-danger-100"
              >
                <div className="divide-y divide-danger-50">
                  {missedReminders.map(reminder => (
                    <div key={reminder.id} className="p-4 bg-danger-50/30">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-danger-100 flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-danger-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-secondary-800">{reminder.drug_name}</h4>
                          <p className="text-sm text-secondary-500">{reminder.dosage} • {formatTime(reminder.reminder_time)}</p>
                          <p className="text-xs text-danger-500 mt-1">Marked as missed</p>
                        </div>
                        <span className="badge bg-danger-100 text-danger-700">Missed</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Skipped Medications Section */}
      {skippedReminders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card border-l-4 border-l-amber-500"
        >
          <button
            onClick={() => setShowSkippedSection(!showSkippedSection)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <SkipForward className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-amber-700">Skipped Medications</h3>
                <p className="text-sm text-amber-500">{skippedReminders.length} dose{skippedReminders.length !== 1 ? 's' : ''} skipped today</p>
              </div>
            </div>
            {showSkippedSection ? <ChevronUp className="w-5 h-5 text-amber-400" /> : <ChevronDown className="w-5 h-5 text-amber-400" />}
          </button>
          
          <AnimatePresence>
            {showSkippedSection && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-amber-100"
              >
                <div className="divide-y divide-amber-50">
                  {skippedReminders.map(reminder => (
                    <div key={reminder.id} className="p-4 bg-amber-50/30">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                          <SkipForward className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-secondary-800">{reminder.drug_name}</h4>
                          <p className="text-sm text-secondary-500">{reminder.dosage} • {formatTime(reminder.reminder_time)}</p>
                          <p className="text-xs text-amber-600 mt-1">
                            Skipped{reminder.localAction?.reason ? `: ${reminder.localAction.reason}` : ''}
                          </p>
                        </div>
                        <span className="badge bg-amber-100 text-amber-700">Skipped</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Taken Medications Section */}
      {takenReminders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card border-l-4 border-l-success-500"
        >
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success-500" />
              </div>
              <div>
                <h3 className="font-semibold text-success-700">Taken Today</h3>
                <p className="text-sm text-success-500">{takenReminders.length} dose{takenReminders.length !== 1 ? 's' : ''} completed</p>
              </div>
            </div>
          </div>
          <div className="border-t border-success-100 divide-y divide-success-50">
            {takenReminders.map(reminder => (
              <div key={reminder.id} className="p-4 bg-success-50/30">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-success-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-success-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-secondary-800">{reminder.drug_name}</h4>
                    <p className="text-sm text-secondary-500">{reminder.dosage} • {formatTime(reminder.reminder_time)}</p>
                    {reminder.last_taken_at && (
                      <p className="text-xs text-success-600 mt-1">
                        Taken at {format(parseISO(reminder.last_taken_at), 'h:mm a')}
                      </p>
                    )}
                    {reminder.localAction?.time && (
                      <p className="text-xs text-success-600 mt-1">
                        Taken at {format(reminder.localAction.time, 'h:mm a')}
                      </p>
                    )}
                  </div>
                  <span className="badge bg-success-100 text-success-700">Taken</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Time Period Groups (Pending/Overdue/Due Now) */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-secondary-800">Schedule</h2>
        {TIME_PERIODS.map((period, idx) => {
          const periodReminders = groupedReminders[period.id] || []
          const isExpanded = expandedPeriod === period.id
          const hasOverdue = periodReminders.some(r => r.status === DOSE_STATUS.OVERDUE)
          const hasDueNow = periodReminders.some(r => r.status === DOSE_STATUS.DUE_NOW)
          
          return (
            <motion.div
              key={period.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              className={`card overflow-visible ${hasOverdue ? 'ring-2 ring-danger-300' : hasDueNow ? 'ring-2 ring-primary-300' : ''}`}
            >
              {/* Period Header */}
              <button
                onClick={() => setExpandedPeriod(isExpanded ? null : period.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-${period.color}-100 flex items-center justify-center`}>
                    <period.icon className={`w-5 h-5 text-${period.color}-500`} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-secondary-800">{period.label}</h3>
                    <p className="text-sm text-secondary-500">
                      {periodReminders.length} medication{periodReminders.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {hasOverdue && (
                    <span className="badge badge-danger flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Overdue
                    </span>
                  )}
                  {hasDueNow && !hasOverdue && (
                    <span className="badge badge-primary flex items-center gap-1">
                      <Bell className="w-3 h-3" /> Due Now
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-secondary-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-secondary-400" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100 overflow-visible"
                  >
                    {periodReminders.length === 0 ? (
                      <div className="p-6 text-center text-secondary-400">
                        <Pill className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No pending medications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50 overflow-visible">
                        {periodReminders.map((reminder) => (
                          <ReminderCard
                            key={reminder.id}
                            reminder={reminder}
                            currentTime={currentTime}
                            onMarkTaken={() => handleMarkTaken(reminder)}
                            onMarkMissed={() => handleMarkMissed(reminder)}
                            onSkip={(reason) => handleSkip(reminder, reason)}
                            onToggle={(active) => toggleMutation.mutate({ id: reminder.id, is_active: active })}
                            isLoading={markTakenMutation.isPending || markMissedMutation.isPending || skipDoseMutation.isPending}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Mark Taken Modal */}
      <AnimatePresence>
        {showTakenModal && (
          <MarkTakenModal
            reminder={showTakenModal}
            onClose={() => setShowTakenModal(null)}
            onConfirm={(notes, takenAt) => markTakenMutation.mutate({ 
              id: showTakenModal.id, 
              notes,
              taken_at: takenAt
            })}
            isLoading={markTakenMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ReminderCard({ reminder, currentTime, onMarkTaken, onMarkMissed, onSkip, onToggle, isLoading }) {
  const [showSkipMenu, setShowSkipMenu] = useState(false)
  const [menuStyle, setMenuStyle] = useState({})
  const buttonRef = useRef(null)
  
  const statusConfig = getStatusConfig(reminder.status)
  const timeUntil = getTimeUntilDose(reminder.reminder_time, currentTime)

  const handleOpenMenu = () => {
    if (!showSkipMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const menuHeight = 220
      const menuWidth = 208
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceRight = window.innerWidth - rect.right
      
      let top, left
      
      // Position vertically
      if (spaceBelow < menuHeight && rect.top > menuHeight) {
        // Open upward
        top = rect.top - menuHeight - 8
      } else {
        // Open downward
        top = rect.bottom + 8
      }
      
      // Position horizontally
      if (spaceRight < menuWidth) {
        left = rect.right - menuWidth
      } else {
        left = rect.left
      }
      
      setMenuStyle({ top, left, position: 'fixed' })
    }
    setShowSkipMenu(!showSkipMenu)
  }

  return (
    <div className={`p-4 ${statusConfig.bgColor}`}>
      <div className="flex items-center gap-4">
        {/* Status Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusConfig.iconBg}`}>
          <statusConfig.icon className={`w-6 h-6 ${statusConfig.iconColor}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-secondary-800">{reminder.drug_name}</h4>
            <span className={`badge ${statusConfig.badge}`}>
              {statusConfig.label}
            </span>
          </div>
          <p className="text-sm text-secondary-500">
            {reminder.dosage} • {formatTime(reminder.reminder_time)}
          </p>
          {timeUntil && (
            <p className={`text-xs mt-1 ${statusConfig.timeColor}`}>
              <Timer className="w-3 h-3 inline mr-1" />
              {timeUntil}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Mark Taken Button */}
          <button
            onClick={onMarkTaken}
            disabled={isLoading}
            className={`
              px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-all
              ${reminder.status === DOSE_STATUS.OVERDUE 
                ? 'bg-danger-500 hover:bg-danger-600 text-white'
                : reminder.status === DOSE_STATUS.DUE_NOW
                ? 'bg-primary-500 hover:bg-primary-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-secondary-700'
              }
            `}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Take
          </button>

          {/* Skip/Miss Dropdown */}
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={handleOpenMenu}
              className="p-2 hover:bg-gray-100 rounded-lg text-secondary-400 hover:text-secondary-600 border border-gray-200"
              title="Skip or mark as missed"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            
            {showSkipMenu && (
              <>
                {/* Backdrop to close menu */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowSkipMenu(false)}
                />
                <div 
                  style={menuStyle}
                  className="w-52 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-50"
                >
                  <button
                    onClick={() => { onSkip('Feeling better'); setShowSkipMenu(false) }}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 rounded-lg flex items-center gap-2"
                  >
                    <SkipForward className="w-4 h-4 text-amber-500" />
                    Skip - Feeling better
                  </button>
                  <button
                    onClick={() => { onSkip('Side effects'); setShowSkipMenu(false) }}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 rounded-lg flex items-center gap-2"
                  >
                    <SkipForward className="w-4 h-4 text-amber-500" />
                    Skip - Side effects
                  </button>
                  <button
                    onClick={() => { onSkip('Ran out'); setShowSkipMenu(false) }}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 rounded-lg flex items-center gap-2"
                  >
                    <SkipForward className="w-4 h-4 text-amber-500" />
                    Skip - Ran out
                  </button>
                  <hr className="my-2 border-gray-100" />
                  <button
                    onClick={() => { onMarkMissed(); setShowSkipMenu(false) }}
                    className="w-full text-left px-3 py-2.5 text-sm text-danger-600 hover:bg-danger-50 rounded-lg flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Mark as missed
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Toggle Active */}
          <button
            onClick={() => onToggle(!reminder.is_active)}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title={reminder.is_active ? 'Pause reminder' : 'Activate reminder'}
          >
            {reminder.is_active ? (
              <ToggleRight className="w-6 h-6 text-primary-500" />
            ) : (
              <ToggleLeft className="w-6 h-6 text-secondary-400" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function MarkTakenModal({ reminder, onClose, onConfirm, isLoading }) {
  const [notes, setNotes] = useState('')
  const [takenAt, setTakenAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-secondary-800">Mark as Taken</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-secondary-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <Pill className="w-8 h-8 text-primary-500" />
            <div>
              <p className="font-semibold text-secondary-800">{reminder.drug_name}</p>
              <p className="text-sm text-secondary-500">{reminder.dosage}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              When did you take it?
            </label>
            <input
              type="datetime-local"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Notes (optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Took with breakfast"
              className="input-field"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={() => onConfirm(notes, takenAt)}
              disabled={isLoading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Confirm
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function StatCard({ icon: Icon, label, value, color, pulse }) {
  const colors = {
    primary: 'bg-primary-100 text-primary-500',
    success: 'bg-success-100 text-success-500',
    warning: 'bg-warning-100 text-warning-500',
    danger: 'bg-danger-100 text-danger-500',
    secondary: 'bg-gray-100 text-secondary-500',
  }

  return (
    <div className={`card text-center py-4 ${pulse ? 'animate-pulse ring-2 ring-danger-300' : ''}`}>
      <div className={`w-8 h-8 rounded-lg ${colors[color]} flex items-center justify-center mx-auto mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xl font-bold text-secondary-800">{value}</p>
      <p className="text-xs text-secondary-500">{label}</p>
    </div>
  )
}

function RemindersSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
      <div className="h-16 bg-gray-200 rounded-xl" />
      <div className="grid grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-2xl" />)}
      </div>
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-2xl" />)}
    </div>
  )
}

// Helper Functions
function getDoseStatus(reminder, currentTime) {
  if (reminder.taken_today) return DOSE_STATUS.TAKEN
  if (reminder.last_taken_at) {
    const lastTaken = parseISO(reminder.last_taken_at)
    if (isToday(lastTaken)) return DOSE_STATUS.TAKEN
  }
  if (reminder.missed_today) return DOSE_STATUS.MISSED
  if (reminder.skipped_today) return DOSE_STATUS.SKIPPED

  const [hours, minutes] = reminder.reminder_time.split(':').map(Number)
  const scheduledTime = new Date(currentTime)
  scheduledTime.setHours(hours, minutes, 0, 0)

  const diffMinutes = differenceInMinutes(currentTime, scheduledTime)

  if (diffMinutes < -30) return DOSE_STATUS.UPCOMING
  if (diffMinutes >= -30 && diffMinutes <= 30) return DOSE_STATUS.DUE_NOW
  if (diffMinutes > 30) return DOSE_STATUS.OVERDUE

  return DOSE_STATUS.UPCOMING
}

function getTimePeriod(timeStr) {
  const hour = parseInt(timeStr.split(':')[0], 10)
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

function getStatusConfig(status) {
  const configs = {
    [DOSE_STATUS.UPCOMING]: {
      icon: Clock, label: 'Upcoming', badge: 'bg-gray-100 text-gray-600',
      bgColor: '', iconBg: 'bg-gray-100', iconColor: 'text-gray-500', timeColor: 'text-secondary-500'
    },
    [DOSE_STATUS.DUE_NOW]: {
      icon: Bell, label: 'Due Now', badge: 'bg-primary-100 text-primary-700',
      bgColor: 'bg-primary-50/50', iconBg: 'bg-primary-100', iconColor: 'text-primary-500', timeColor: 'text-primary-600'
    },
    [DOSE_STATUS.OVERDUE]: {
      icon: AlertTriangle, label: 'Overdue', badge: 'bg-danger-100 text-danger-700',
      bgColor: 'bg-danger-50/50', iconBg: 'bg-danger-100', iconColor: 'text-danger-500', timeColor: 'text-danger-600'
    },
    [DOSE_STATUS.TAKEN]: {
      icon: CheckCircle2, label: 'Taken', badge: 'bg-success-100 text-success-700',
      bgColor: 'bg-success-50/30', iconBg: 'bg-success-100', iconColor: 'text-success-500', timeColor: 'text-success-600'
    },
    [DOSE_STATUS.MISSED]: {
      icon: XCircle, label: 'Missed', badge: 'bg-danger-100 text-danger-700',
      bgColor: 'bg-danger-50/30', iconBg: 'bg-danger-100', iconColor: 'text-danger-500', timeColor: 'text-danger-600'
    },
    [DOSE_STATUS.SKIPPED]: {
      icon: SkipForward, label: 'Skipped', badge: 'bg-amber-100 text-amber-700',
      bgColor: 'bg-amber-50/30', iconBg: 'bg-amber-100', iconColor: 'text-amber-500', timeColor: 'text-amber-600'
    }
  }
  return configs[status] || configs[DOSE_STATUS.UPCOMING]
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

function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes))
  return format(date, 'h:mm a')
}