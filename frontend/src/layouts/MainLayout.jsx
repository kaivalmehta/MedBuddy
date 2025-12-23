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

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
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

      <div className="flex-1 flex flex-col min-w-0">
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