// frontend/src/layouts/AuthLayout.jsx
import { Outlet, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Heart, Shield, Sparkles } from 'lucide-react'

export default function AuthLayout() {
  const { user } = useAuth()
  
  if (user) {
    return <Navigate to={user.role === 'pharmacy' ? '/pharmacy' : '/'} replace />
  }
  
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <span className="text-3xl font-display font-bold text-white">MedBuddy</span>
          </Link>
          
          <h1 className="text-4xl xl:text-5xl font-display font-bold text-white leading-tight mb-6">
            Your Intelligent<br />
            Prescription<br />
            Companion
          </h1>
          
          <p className="text-xl text-white/80 mb-12 max-w-md">
            Safely manage medications with AI-powered drug interaction analysis and smart reminders.
          </p>
          
          <div className="space-y-6">
            <Feature icon={Shield} title="Safety First" desc="AI analyzes drug interactions instantly" />
            <Feature icon={Sparkles} title="Smart OCR" desc="Extract prescription data automatically" />
            <Feature icon={Heart} title="Health Tracking" desc="Monitor adherence and set reminders" />
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mb-48" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/5 rounded-full animate-float" />
      </div>
      
      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
              <Heart className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-secondary-800">MedBuddy</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-white/70 text-sm">{desc}</p>
      </div>
    </div>
  )
}


// frontend/src/layouts/MainLayout.jsx
import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, Home, Upload, FileText, User, Users, Bell, MapPin,
  ShoppingBag, LayoutDashboard, Package, Boxes, Menu, X, LogOut,
  ChevronRight, Settings
} from 'lucide-react'

const patientNav = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/upload', icon: Upload, label: 'Upload Prescription' },
  { path: '/prescriptions', icon: FileText, label: 'My Prescriptions' },
  { path: '/reminders', icon: Bell, label: 'Reminders' },
  { path: '/pharmacies', icon: MapPin, label: 'Find Pharmacy' },
  { path: '/orders', icon: ShoppingBag, label: 'My Orders' },
  { divider: true },
  { path: '/health-profile', icon: User, label: 'Health Profile' },
  { path: '/family', icon: Users, label: 'Family Members' },
]

const pharmacyNav = [
  { path: '/pharmacy', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/pharmacy/orders', icon: Package, label: 'Order Queue' },
  { path: '/pharmacy/inventory', icon: Boxes, label: 'Inventory' },
]

export default function MainLayout() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  
  const navItems = user?.role === 'pharmacy' ? pharmacyNav : patientNav

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-display font-bold text-secondary-800">MedBuddy</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item, idx) => 
              item.divider ? (
                <div key={idx} className="my-4 border-t border-gray-100" />
              ) : (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/' || item.path === '/pharmacy'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                    transition-all duration-200 group
                    ${isActive 
                      ? 'bg-primary-50 text-primary-600' 
                      : 'text-secondary-600 hover:bg-gray-50 hover:text-secondary-800'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </NavLink>
              )
            )}
          </nav>

          {/* User Profile Section */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-600 font-semibold">
                  {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-800 truncate">
                  {user?.first_name || 'User'}
                </p>
                <p className="text-xs text-secondary-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="p-2 text-secondary-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-secondary-600 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="hidden lg:block">
              <h1 className="text-xl font-display font-semibold text-secondary-800">
                {navItems.find(n => n.path === location.pathname)?.label || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-gray-100 rounded-lg transition-colors relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
              </button>
              <button className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}