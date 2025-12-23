import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState('patient')
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const password = watch('password')

  const onSubmit = async (data) => {
    setLoading(true)
    setError('')
    try {
      // TODO: Call real backend API
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err) {
      setError('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Create account</h2>
        <p className="text-gray-600 mb-6">Start managing prescriptions safely</p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input
                {...register('first_name', { required: 'Required' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="John"
              />
              {errors.first_name && <p className="mt-1 text-xs text-red-500">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
              <input
                {...register('last_name', { required: 'Required' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Doe"
              />
              {errors.last_name && <p className="mt-1 text-xs text-red-500">{errors.last_name.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              {...register('email', { 
                required: 'Email is required',
                pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              {...register('username', { 
                required: 'Username is required',
                minLength: { value: 3, message: 'At least 3 characters' }
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="johndoe"
            />
            {errors.username && <p className="mt-1 text-sm text-red-500">{errors.username.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              {...register('password', { 
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' }
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
            <input
              type="password"
              {...register('password_confirm', { 
                required: 'Please confirm password',
                validate: v => v === password || 'Passwords do not match'
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
            {errors.password_confirm && <p className="mt-1 text-sm text-red-500">{errors.password_confirm.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
