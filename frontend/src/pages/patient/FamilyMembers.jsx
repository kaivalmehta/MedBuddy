// frontend/src/pages/patient/FamilyMembers.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { userService } from '../../services/user'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Edit2, Trash2, X, User, Calendar, Droplets, Heart, AlertCircle, Loader2, Check } from 'lucide-react'

export default function FamilyMembers() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState(null)

  const { data: members, isLoading } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => userService.getFamilyMembers().then(r => r.data)
  })

  const createMutation = useMutation({
    mutationFn: (data) => userService.addFamilyMember(data),
    onSuccess: () => { queryClient.invalidateQueries(['familyMembers']); setShowForm(false) }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => userService.updateFamilyMember(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['familyMembers']); setEditingMember(null) }
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => userService.deleteFamilyMember(id),
    onSuccess: () => queryClient.invalidateQueries(['familyMembers'])
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-secondary-800">Family Members</h1>
            <p className="text-secondary-500">Manage health profiles for your dependents</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add Member
          </button>
        </div>
      </motion.div>

      {/* Members List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)
        ) : members?.results?.length === 0 ? (
          <div className="card text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-secondary-500">No family members added yet</p>
            <button onClick={() => setShowForm(true)} className="text-primary-600 text-sm font-medium mt-2">
              Add your first family member
            </button>
          </div>
        ) : (
          members?.results?.map((member, idx) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="card-hover"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center">
                  <User className="w-7 h-7 text-primary-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-secondary-800">{member.name}</h3>
                  <p className="text-sm text-secondary-500 capitalize">{member.relationship}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-secondary-400">
                    {member.blood_type && <span><Droplets className="w-3 h-3 inline" /> {member.blood_type}</span>}
                    {member.medical_conditions?.length > 0 && (
                      <span><Heart className="w-3 h-3 inline" /> {member.medical_conditions.length} conditions</span>
                    )}
                    {member.allergies?.length > 0 && (
                      <span><AlertCircle className="w-3 h-3 inline" /> {member.allergies.length} allergies</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingMember(member)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <Edit2 className="w-5 h-5 text-secondary-400" />
                  </button>
                  <button
                    onClick={() => confirm('Remove this family member?') && deleteMutation.mutate(member.id)}
                    className="p-2 hover:bg-danger-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5 text-danger-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showForm || editingMember) && (
          <FamilyMemberForm
            member={editingMember}
            onClose={() => { setShowForm(false); setEditingMember(null) }}
            onSubmit={(data) => editingMember 
              ? updateMutation.mutate({ id: editingMember.id, data })
              : createMutation.mutate(data)
            }
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function FamilyMemberForm({ member, onClose, onSubmit, isLoading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: member || {} })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-display font-semibold">{member ? 'Edit' : 'Add'} Family Member</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Name</label>
            <input {...register('name', { required: 'Name is required' })} className="input-field" placeholder="John Doe" />
            {errors.name && <p className="text-sm text-danger-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Relationship</label>
            <select {...register('relationship', { required: true })} className="input-field">
              <option value="">Select...</option>
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
              <option value="parent">Parent</option>
              <option value="sibling">Sibling</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Date of Birth</label>
              <input type="date" {...register('date_of_birth')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Blood Type</label>
              <select {...register('blood_type')} className="input-field">
                <option value="">Select...</option>
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {member ? 'Update' : 'Add'} Member
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
