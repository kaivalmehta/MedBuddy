// frontend/src/pages/pharmacy/Inventory.jsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { inventoryService } from '../../services/pharmacy'
import { motion, AnimatePresence } from 'framer-motion'
import { Boxes, Plus, Edit2, Trash2, Search, Package, DollarSign, AlertTriangle, X, Loader2, Check } from 'lucide-react'

export default function Inventory() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryService.list().then(r => r.data)
  })

  const createMutation = useMutation({
    mutationFn: (d) => inventoryService.create(d),
    onSuccess: () => { queryClient.invalidateQueries(['inventory']); setShowForm(false) }
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => inventoryService.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['inventory']); setEditingItem(null) }
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => inventoryService.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['inventory'])
  })

  const items = data?.results || []
  const filtered = items.filter(i => i.drug_name.toLowerCase().includes(search.toLowerCase()))
  const lowStock = items.filter(i => i.quantity_in_stock < 10).length

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary-800">Inventory Management</h1>
          <p className="text-secondary-500">Manage your pharmacy's drug inventory</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> Add Item
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <Boxes className="w-8 h-8 text-primary-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-secondary-800">{items.length}</p>
          <p className="text-sm text-secondary-500">Total Items</p>
        </div>
        <div className="card text-center">
          <Package className="w-8 h-8 text-success-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-secondary-800">{items.filter(i => i.is_available).length}</p>
          <p className="text-sm text-secondary-500">In Stock</p>
        </div>
        <div className="card text-center">
          <AlertTriangle className="w-8 h-8 text-warning-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-secondary-800">{lowStock}</p>
          <p className="text-sm text-secondary-500">Low Stock</p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-12" placeholder="Search inventory..." />
        </div>
      </motion.div>

      {/* Inventory Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-secondary-600">Drug Name</th>
                  <th className="text-left p-4 text-sm font-medium text-secondary-600">Generic</th>
                  <th className="text-right p-4 text-sm font-medium text-secondary-600">Stock</th>
                  <th className="text-right p-4 text-sm font-medium text-secondary-600">Price</th>
                  <th className="text-center p-4 text-sm font-medium text-secondary-600">Status</th>
                  <th className="text-right p-4 text-sm font-medium text-secondary-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-4 font-medium text-secondary-800">{item.drug_name}</td>
                    <td className="p-4 text-secondary-500">{item.generic_name || '-'}</td>
                    <td className={`p-4 text-right font-medium ${item.quantity_in_stock < 10 ? 'text-warning-500' : 'text-secondary-800'}`}>
                      {item.quantity_in_stock}
                    </td>
                    <td className="p-4 text-right text-secondary-800">${item.unit_price}</td>
                    <td className="p-4 text-center">
                      <span className={`badge ${item.is_available ? 'badge-success' : 'badge-danger'}`}>
                        {item.is_available ? 'Available' : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => setEditingItem(item)} className="p-2 hover:bg-gray-100 rounded-lg">
                        <Edit2 className="w-4 h-4 text-secondary-400" />
                      </button>
                      <button onClick={() => confirm('Delete this item?') && deleteMutation.mutate(item.id)} className="p-2 hover:bg-danger-50 rounded-lg">
                        <Trash2 className="w-4 h-4 text-danger-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showForm || editingItem) && (
          <InventoryForm
            item={editingItem}
            onClose={() => { setShowForm(false); setEditingItem(null) }}
            onSubmit={(d) => editingItem ? updateMutation.mutate({ id: editingItem.id, data: d }) : createMutation.mutate(d)}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function InventoryForm({ item, onClose, onSubmit, isLoading }) {
  const { register, handleSubmit } = useForm({ defaultValues: item || { is_available: true } })
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-display font-semibold">{item ? 'Edit' : 'Add'} Inventory Item</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Drug Name</label>
            <input {...register('drug_name', { required: true })} className="input-field" placeholder="Amoxicillin 500mg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">Generic Name</label>
            <input {...register('generic_name')} className="input-field" placeholder="Amoxicillin" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Quantity</label>
              <input type="number" {...register('quantity_in_stock', { valueAsNumber: true })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Unit Price ($)</label>
              <input type="number" step="0.01" {...register('unit_price', { valueAsNumber: true })} className="input-field" />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('is_available')} className="w-4 h-4 rounded" />
            <span className="text-sm text-secondary-700">Available for sale</span>
          </label>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {item ? 'Update' : 'Add'} Item
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}