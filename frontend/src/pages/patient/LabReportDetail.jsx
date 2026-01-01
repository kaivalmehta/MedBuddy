// ============================================
// frontend/src/pages/patient/LabReportDetail.jsx
// ============================================

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { labReportService } from '../../services/professional'
import { speechService } from '../../services/speech'
import translationService from '../../services/translationService'
import AudioPlayer, { ListenButton } from '../../components/AudioPlayer'
import { 
  TestTube, ArrowLeft, Calendar, Building2, User, FileText,
  AlertTriangle, CheckCircle, Loader2, Download, Zap, Info,
  AlertCircle, Activity, RefreshCw, Volume2, Globe, Languages,
  File, FileImage, ChevronDown, ChevronUp, Copy, Check
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LabReportDetail() {
  const { id } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  
  // Translation state
  const [showTranslation, setShowTranslation] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('es')
  const [translatedContent, setTranslatedContent] = useState(null)
  const [copied, setCopied] = useState(false)
  
  // Files display state
  const [showAllFiles, setShowAllFiles] = useState(false)
  
  // Supported languages for translation
  const languages = [
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'zh-Hans', name: 'Chinese (Simplified)', native: '简体中文' },
    { code: 'ar', name: 'Arabic', native: 'العربية' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'de', name: 'German', native: 'Deutsch' },
    { code: 'pt', name: 'Portuguese', native: 'Português' },
    { code: 'ru', name: 'Russian', native: 'Русский' },
    { code: 'ja', name: 'Japanese', native: '日本語' },
    { code: 'ko', name: 'Korean', native: '한국어' },
    { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt' },
    { code: 'th', name: 'Thai', native: 'ไทย' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'mr', name: 'Marathi', native: 'मराठी' },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
    { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
    { code: 'ur', name: 'Urdu', native: 'اردو' },
    { code: 'it', name: 'Italian', native: 'Italiano' },
    { code: 'nl', name: 'Dutch', native: 'Nederlands' },
    { code: 'pl', name: 'Polish', native: 'Polski' },
    { code: 'tr', name: 'Turkish', native: 'Türkçe' },
    { code: 'uk', name: 'Ukrainian', native: 'Українська' },
    { code: 'he', name: 'Hebrew', native: 'עברית' },
    { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia' },
    { code: 'ms', name: 'Malay', native: 'Bahasa Melayu' },
    { code: 'fil', name: 'Filipino', native: 'Filipino' },
    { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
  ]

  useEffect(() => {
    loadReport()
  }, [id])

  const loadReport = async () => {
    try {
      const res = await labReportService.get(id)
      console.log('Loaded report:', res.data)
      setReport(res.data)
    } catch (err) {
      console.error('Failed to load report:', err)
      setError('Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setError('')
    try {
      console.log('Starting analysis...')
      const res = await labReportService.analyze(id)
      console.log('Analysis result:', res.data)
      
      // Update report with analysis results
      setReport(prev => ({
        ...prev,
        status: 'analyzed',
        analysis_summary: res.data.analysis_summary,
        abnormal_values: res.data.abnormal_values || [],
        recommendations: res.data.recommendations || [],
        has_critical_values: res.data.abnormal_values?.some(av => 
          ['critical_low', 'critical_high', 'panic', 'significant'].includes(av.severity)
        )
      }))
    } catch (err) {
      console.error('Analysis failed:', err)
      setError('Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleTranslate = async () => {
    if (!report) return
    
    setTranslating(true)
    setError('')
    
    try {
      const result = await translationService.translateLabReport(id, selectedLanguage)
      
      if (result.success) {
        setTranslatedContent(result)
        setShowTranslation(true)
      } else {
        setError(result.error || 'Translation failed')
      }
    } catch (err) {
      console.error('Translation failed:', err)
      setError('Translation failed. Please try again.')
    } finally {
      setTranslating(false)
    }
  }

  const handleCopyTranslation = async () => {
    if (!translatedContent) return
    
    const textToCopy = translatedContent.translated_report?.analysis_summary_translated || 
                       translatedContent.translated_text || ''
    
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const getFileIcon = (fileType) => {
    if (fileType === 'pdf') return <File className="w-5 h-5 text-red-500" />
    if (['jpg', 'jpeg', 'png'].includes(fileType)) return <FileImage className="w-5 h-5 text-blue-500" />
    return <FileText className="w-5 h-5 text-gray-500" />
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const getSeverityColor = (severity) => {
    switch(severity?.toLowerCase()) {
      case 'critical_low':
      case 'critical_high':
      case 'panic':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'significant':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'moderate':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'abnormal':
      case 'mild':
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    }
  }

  const getSeverityLabel = (severity) => {
    switch(severity?.toLowerCase()) {
      case 'critical_low': return 'Critical Low'
      case 'critical_high': return 'Critical High'
      case 'panic': return 'PANIC'
      case 'significant': return 'Significant'
      case 'moderate': return 'Moderate'
      case 'abnormal': return 'Abnormal'
      case 'mild': return 'Mild'
      default: return severity || 'Abnormal'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-secondary-500 mb-4">{error}</p>
        <Link to="/reports" className="btn-primary">Back to Reports</Link>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary-500">Report not found</p>
        <Link to="/reports" className="btn-primary mt-4">Back to Reports</Link>
      </div>
    )
  }

  const hasAbnormalValues = report.abnormal_values && report.abnormal_values.length > 0
  const isAnalyzed = report.status === 'analyzed'
  
  // Show analyze button if:
  // 1. Report is not yet analyzed, OR
  // 2. Report is analyzed but has no abnormal values (allow re-analysis)
  const showAnalyzeButton = !isAnalyzed || !hasAbnormalValues

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Link */}
      <Link to="/reports" className="inline-flex items-center gap-2 text-secondary-600 hover:text-secondary-800 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Reports
      </Link>

      {/* Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200"
      >
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <TestTube className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold text-secondary-800">{report.report_title}</h1>
            <p className="text-secondary-500">{report.report_type_display || report.report_type}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              {report.report_date && (
                <span className="flex items-center gap-1 text-secondary-600">
                  <Calendar className="w-4 h-4" /> {new Date(report.report_date).toLocaleDateString()}
                </span>
              )}
              {report.laboratory_name && (
                <span className="flex items-center gap-1 text-secondary-600">
                  <Building2 className="w-4 h-4" /> {report.laboratory_name}
                </span>
              )}
              {report.referring_doctor && (
                <span className="flex items-center gap-1 text-secondary-600">
                  <User className="w-4 h-4" /> {report.referring_doctor}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Report Files Section */}
      {(report.files?.length > 0 || report.file_url) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-secondary-800">
                Report Files ({report.files?.length || 1})
              </h2>
            </div>
            {report.files?.length > 2 && (
              <button
                onClick={() => setShowAllFiles(!showAllFiles)}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
              >
                {showAllFiles ? (
                  <>Show Less <ChevronUp className="w-4 h-4" /></>
                ) : (
                  <>Show All <ChevronDown className="w-4 h-4" /></>
                )}
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            {(report.files?.length > 0 ? report.files : [{
              id: report.id,
              file_url: report.file_url,
              file_type: report.file_type,
              original_filename: `${report.report_title}.${report.file_type}`,
              file_size: 0
            }])
              .slice(0, showAllFiles ? undefined : 2)
              .map((file, index) => (
                <div 
                  key={file.id || index}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    {getFileIcon(file.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-secondary-800 truncate">
                      {file.original_filename || `Report ${index + 1}`}
                    </p>
                    <p className="text-sm text-secondary-500">
                      {file.file_type?.toUpperCase()} • {formatFileSize(file.file_size)}
                    </p>
                  </div>
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex items-center gap-2 px-4 py-2"
                    style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'}}
                  >
                    <Download className="w-4 h-4" /> View
                  </a>
                </div>
              ))}
          </div>
          
          {report.files?.length > 2 && !showAllFiles && (
            <p className="text-center text-secondary-500 text-sm mt-3">
              +{report.files.length - 2} more file(s)
            </p>
          )}
        </motion.div>
      )}

      {/* Source & Status Info */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              report.source === 'laboratory' ? 'bg-purple-100 text-purple-700' :
              report.source === 'doctor' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {report.source === 'laboratory' ? 'From Laboratory' : 
               report.source === 'doctor' ? 'From Doctor' : 'Self Uploaded'}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              isAnalyzed && hasAbnormalValues ? 'bg-green-100 text-green-700' : 
              isAnalyzed ? 'bg-blue-100 text-blue-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {isAnalyzed && hasAbnormalValues ? '✓ Analysis Complete' : 
               isAnalyzed ? '○ Analyzed - No Issues Found' :
               '⏳ Pending Analysis'}
            </span>
          </div>
          {report.has_critical_values && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Critical Values
            </span>
          )}
        </div>
      </div>

      {/* Listen to Report - Accessibility Feature */}
      <div className="card bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Volume2 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-secondary-800">Listen to Report Summary</h3>
            <p className="text-sm text-secondary-500">Audio narration for visually impaired patients</p>
          </div>
        </div>
        <ListenButton
          onFetch={async (voice) => {
            const response = await speechService.getLabReportAudio(id, voice)
            return response.data
          }}
          label="Generate Audio Summary"
          loadingLabel="Generating audio..."
        />
      </div>

      {/* Translation Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Languages className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-secondary-800">Translate Report</h3>
            <p className="text-sm text-secondary-500">Translate analysis to your preferred language</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedLanguage}
            onChange={(e) => {
              setSelectedLanguage(e.target.value)
              setTranslatedContent(null)
              setShowTranslation(false)
            }}
            className="input-field flex-1"
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.native} - {lang.name}
              </option>
            ))}
          </select>
          
          <button
            onClick={handleTranslate}
            disabled={translating}
            className="btn-primary flex items-center justify-center gap-2 px-6"
            style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}
          >
            {translating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                Translate
              </>
            )}
          </button>
        </div>
        
        {/* Translation Result */}
        <AnimatePresence>
          {showTranslation && translatedContent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <div className="bg-white rounded-xl p-4 border border-emerald-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    {languages.find(l => l.code === selectedLanguage)?.name} Translation
                  </span>
                  <button
                    onClick={handleCopyTranslation}
                    className="text-emerald-600 hover:text-emerald-700 p-2 hover:bg-emerald-50 rounded-lg transition"
                    title="Copy translation"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* Translated Analysis Summary */}
                {translatedContent.translated_report?.analysis_summary_translated && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-secondary-700 mb-2">Analysis Summary</h4>
                    <p className="text-secondary-600 leading-relaxed">
                      {translatedContent.translated_report.analysis_summary_translated}
                    </p>
                  </div>
                )}
                
                {/* Translated Abnormal Values */}
                {translatedContent.translated_report?.abnormal_values_translated?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-secondary-700 mb-2">Abnormal Values</h4>
                    <div className="space-y-2">
                      {translatedContent.translated_report.abnormal_values_translated.map((item, idx) => (
                        <div key={idx} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                          <div className="font-medium text-secondary-800">{item.test_name}</div>
                          {item.meaning && (
                            <p className="text-sm text-secondary-600 mt-1">{item.meaning}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Translated Recommendations */}
                {translatedContent.translated_report?.recommendations_translated?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-secondary-700 mb-2">Recommendations</h4>
                    <ul className="space-y-2">
                      {translatedContent.translated_report.recommendations_translated.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-secondary-600">
                          <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Fallback for simple text translation */}
                {!translatedContent.translated_report && translatedContent.translated_text && (
                  <p className="text-secondary-600 leading-relaxed whitespace-pre-wrap">
                    {translatedContent.translated_text}
                  </p>
                )}
              </div>
              
              <p className="text-xs text-secondary-400 mt-2 text-center">
                Powered by Azure AI Translator • Medical terminology optimized
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Analyze Button - Show when not analyzed or when no abnormal values */}
      {showAnalyzeButton && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card text-center py-10 bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200"
        >
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {isAnalyzed ? <RefreshCw className="w-8 h-8 text-purple-600" /> : <Zap className="w-8 h-8 text-purple-600" />}
          </div>
          <h3 className="text-xl font-semibold text-secondary-800 mb-2">
            {isAnalyzed ? 'Re-analyze Report' : 'AI Analysis Available'}
          </h3>
          <p className="text-secondary-500 mb-6 max-w-md mx-auto">
            {isAnalyzed 
              ? 'Click to run analysis again and detect abnormal values in your lab report.'
              : 'Get AI-powered insights about your lab results including abnormal values, their significance, and recommendations.'
            }
          </p>
          <button 
            onClick={handleAnalyze} 
            disabled={analyzing}
            className="btn-primary mx-auto flex items-center gap-2 px-8 py-3 text-lg"
            style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'}}
          >
            {analyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                {isAnalyzed ? <RefreshCw className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                {isAnalyzed ? 'Re-analyze' : 'Analyze Report'}
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Analysis Results - Show when analyzed AND has abnormal values */}
      {isAnalyzed && hasAbnormalValues && (
        <>
          {/* Analysis Summary */}
          {report.analysis_summary && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card"
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-secondary-800">Analysis Summary</h2>
              </div>
              <p className="text-secondary-600 leading-relaxed">
                {report.analysis_summary}
              </p>
            </motion.div>
          )}

          {/* Abnormal Values */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`card border-2 ${report.has_critical_values ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className={`w-5 h-5 ${report.has_critical_values ? 'text-red-600' : 'text-amber-600'}`} />
              <h2 className={`text-lg font-semibold ${report.has_critical_values ? 'text-red-800' : 'text-amber-800'}`}>
                Abnormal Values Detected
              </h2>
              <span className="ml-auto text-sm px-2 py-1 rounded-full bg-white/50 font-medium">
                {report.abnormal_values.length} found
              </span>
            </div>
            <div className="space-y-3">
              {report.abnormal_values.map((item, i) => (
                <div key={i} className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-secondary-800 text-lg">{item.test_name}</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${getSeverityColor(item.severity)}`}>
                      {getSeverityLabel(item.severity)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-2">
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-secondary-500 block text-xs uppercase tracking-wide">Result</span>
                      <span className="font-semibold text-secondary-800 text-base">
                        {item.result || item.measured_value || 'N/A'} {item.unit}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-secondary-500 block text-xs uppercase tracking-wide">Normal Range</span>
                      <span className="font-semibold text-secondary-800 text-base">
                        {item.expected || item.normal_range || 'N/A'}
                      </span>
                    </div>
                  </div>
                  {(item.meaning || item.description) && (
                    <p className="text-sm text-secondary-600 mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <Info className="w-4 h-4 inline mr-2 text-blue-500" />
                      {item.meaning || item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recommendations */}
          {report.recommendations && report.recommendations.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card border-blue-200 bg-blue-50"
            >
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-blue-800">Recommendations</h2>
              </div>
              <ul className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3 text-secondary-700 bg-white p-3 rounded-lg">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {i + 1}
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Re-analyze option */}
          <div className="text-center">
            <button 
              onClick={handleAnalyze}
              disabled={analyzing}
              className="text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? 'Re-analyzing...' : 'Re-analyze Report'}
            </button>
          </div>
        </>
      )}

      {/* Notes */}
      {report.notes && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-secondary-500" />
            Notes
          </h2>
          <p className="text-secondary-600">{report.notes}</p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-center text-sm text-secondary-500 p-4 bg-gray-50 rounded-xl">
        <strong>Medical Disclaimer:</strong> This AI analysis is for informational purposes only and does not constitute medical advice. 
        Please consult your healthcare provider for proper interpretation of your results and any necessary treatment.
      </div>
    </div>
  )
}