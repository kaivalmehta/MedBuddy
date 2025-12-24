import { Outlet, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Heart, Shield, Sparkles } from 'lucide-react'

export default function AuthLayout({ children }) {
  const { user } = useAuth()
  
  if (user) {
    const dashboards = {
      patient: '/',
      pharmacy: '/pharmacy',
      doctor: '/doctor',
      laboratory: '/laboratory'
    }
    return <Navigate to={dashboards[user.role] || '/'} replace />
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
          {children || <Outlet />}
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