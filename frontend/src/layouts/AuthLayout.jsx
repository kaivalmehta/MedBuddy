import { Outlet, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { 
  Heart, Shield, Sparkles, FileText, TestTube, Languages, 
  Volume2, Bell, Users, Pill, Building2, Stethoscope,
  FlaskConical, ShoppingBag, Brain, Clock, Globe, Mic,
  ChevronRight, CheckCircle
} from 'lucide-react'

export default function AuthLayout({ children }) {
  const { user } = useAuth()
  const [activeCategory, setActiveCategory] = useState(0)
  
  // Auto-rotate categories every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCategory(prev => (prev + 1) % featureCategories.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])
  
  if (user) {
    const dashboards = {
      patient: '/',
      pharmacy: '/pharmacy',
      doctor: '/doctor',
      laboratory: '/laboratory'
    }
    return <Navigate to={dashboards[user.role] || '/'} replace />
  }
  
  const featureCategories = [
    {
      title: "AI-Powered Analysis",
      icon: Brain,
      color: "from-purple-500 to-indigo-600",
      features: [
        { icon: Shield, text: "Drug Interaction Detection" },
        { icon: TestTube, text: "Lab Report Analysis" },
        { icon: Sparkles, text: "Smart OCR Extraction" },
        { icon: FileText, text: "Prescription Parsing" },
      ]
    },
    {
      title: "Accessibility Features", 
      icon: Globe,
      color: "from-emerald-500 to-teal-600",
      features: [
        { icon: Languages, text: "30+ Language Translation" },
        { icon: Volume2, text: "Audio Report Summaries" },
        { icon: Mic, text: "Voice Dictation" },
        { icon: Globe, text: "Multi-language Interface" },
      ]
    },
    {
      title: "Patient Tools",
      icon: Heart,
      color: "from-rose-500 to-pink-600", 
      features: [
        { icon: Pill, text: "Medication Management" },
        { icon: Bell, text: "Smart Reminders" },
        { icon: Users, text: "Family Health Profiles" },
        { icon: Clock, text: "Dose Tracking" },
      ]
    },
    {
      title: "Professional Portal",
      icon: Stethoscope,
      color: "from-blue-500 to-cyan-600",
      features: [
        { icon: Building2, text: "Pharmacy Integration" },
        { icon: FlaskConical, text: "Laboratory Connect" },
        { icon: ShoppingBag, text: "Prescription Ordering" },
        { icon: FileText, text: "Digital Reports" },
      ]
    }
  ]
  
  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Panel - Branding (Fixed) */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden flex-shrink-0">
        {/* Background Pattern */}
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
        
        {/* Decorative Elements */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mb-48" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/5 rounded-full animate-float" />
        <div className="absolute top-1/2 right-10 w-20 h-20 bg-white/5 rounded-full" />
        
        <div className="relative z-10 flex flex-col py-8 px-8 xl:px-12 w-full h-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0 mb-4">
            <div className="w-11 h-11 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-display font-bold text-white">MedBuddy</span>
          </Link>
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col justify-center min-h-0">
            <h1 className="text-3xl xl:text-4xl font-display font-bold text-white leading-tight mb-3">
              Your Complete<br />
              Healthcare<br />
              Platform
            </h1>
            
            <p className="text-sm text-white/80 mb-5 max-w-md">
              AI-powered prescription management, lab analysis, multi-language support, and seamless healthcare coordination.
            </p>
            
            {/* Category Tabs */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {featureCategories.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveCategory(idx)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeCategory === idx 
                      ? 'bg-white text-primary-600' 
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  {cat.title}
                </button>
              ))}
            </div>
            
            {/* Active Category Features */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-3 mb-3">
                {(() => {
                  const IconComponent = featureCategories[activeCategory].icon
                  return <IconComponent className="w-5 h-5 text-white" />
                })()}
                <h3 className="text-lg font-semibold text-white">
                  {featureCategories[activeCategory].title}
                </h3>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {featureCategories[activeCategory].features.map((feature, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 text-white/90"
                  >
                    <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Bottom Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20 flex-shrink-0 mt-4">
            <div className="text-center">
              <div className="text-xl font-bold text-white">30+</div>
              <div className="text-xs text-white/70">Languages</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">AI</div>
              <div className="text-xs text-white/70">Powered</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white">24/7</div>
              <div className="text-xs text-white/70">Available</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Panel - Auth Form (Scrollable) */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="min-h-full flex items-center justify-center p-8">
          <div className="w-full max-w-md py-8">
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