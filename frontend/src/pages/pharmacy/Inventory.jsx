// frontend/src/pages/pharmacy/Inventory.jsx
// Enhanced Inventory Management with Dispense functionality

import { useState, useEffect } from 'react'
import { 
  Boxes, Plus, Edit2, Trash2, Search, Package, AlertTriangle, X, 
  Loader2, Check, RefreshCw, Calendar, DollarSign, AlertCircle,
  ShoppingCart, Minus, RotateCcw
} from 'lucide-react'
import { inventoryService, salesService } from '../../services/pharmacy'

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'tablets', label: 'Tablets' },
  { value: 'capsules', label: 'Capsules' },
  { value: 'syrups', label: 'Syrups' },
  { value: 'injections', label: 'Injections' },
  { value: 'creams', label: 'Creams/Ointments' },
  { value: 'drops', label: 'Drops' },
  { value: 'inhalers', label: 'Inhalers' },
  { value: 'patches', label: 'Patches' },
  { value: 'powders', label: 'Powders' },
  { value: 'solutions', label: 'Solutions' },
  { value: 'devices', label: 'Medical Devices' },
  { value: 'otc', label: 'OTC/General' },
  { value: 'other', label: 'Other' },
]

const STATUS_FILTERS = [
  { value: '', label: 'All Status' },
  { value: 'low_stock', label: '⚠️ Low Stock' },
  { value: 'out_of_stock', label: '❌ Out of Stock' },
  { value: 'expiring', label: '⏰ Expiring Soon' },
  { value: 'expired', label: '🚫 Expired' },
]

export default function Inventory() {
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [alerts, setAlerts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [showAlerts, setShowAlerts] = useState(false)
  const [restockItem, setRestockItem] = useState(null)
  const [dispenseItem, setDispenseItem] = useState(null)

  useEffect(() => {
    loadData()
    loadAlerts()
  }, [search, category, statusFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await inventoryService.list({ search, category, status: statusFilter })
      setItems(res.data.results || [])
      setStats(res.data.stats || null)
    } catch (err) {
      console.error('Failed to load inventory:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAlerts = async () => {
    try {
      const res = await inventoryService.getAlerts()
      setAlerts(res.data)
    } catch (err) {
      console.error('Failed to load alerts:', err)
    }
  }

  const handleCreate = async (data) => {
    try {
      await inventoryService.create(data)
      loadData()
      loadAlerts()
      setShowForm(false)
    } catch (err) {
      console.error('Failed to create item:', err)
    }
  }

  const handleUpdate = async (data) => {
    try {
      await inventoryService.update(editingItem.id, data)
      loadData()
      setEditingItem(null)
    } catch (err) {
      console.error('Failed to update item:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this item permanently?')) return
    try {
      await inventoryService.delete(id)
      loadData()
      loadAlerts()
    } catch (err) {
      console.error('Failed to delete item:', err)
    }
  }

  const handleRestock = async (data) => {
    try {
      await inventoryService.restock(restockItem.id, data)
      loadData()
      loadAlerts()
      setRestockItem(null)
    } catch (err) {
      console.error('Failed to restock:', err)
    }
  }

  const handleDispense = async (data) => {
    try {
      await salesService.dispense({
        inventory_item_id: dispenseItem.id,
        ...data
      })
      loadData()
      loadAlerts()
      setDispenseItem(null)
    } catch (err) {
      console.error('Failed to dispense:', err)
      alert(err.response?.data?.error || 'Failed to dispense item')
    }
  }

  const getStockStatusBadge = (item) => {
    if (item.is_expired) return <span className="badge badge-danger">Expired</span>
    if (item.is_expiring_soon) return <span className="badge badge-warning">Expiring</span>
    if (item.quantity_in_stock === 0) return <span className="badge badge-danger">Out of Stock</span>
    if (item.is_low_stock) return <span className="badge badge-warning">Low Stock</span>
    return <span className="badge badge-success">In Stock</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary-800">Inventory Management</h1>
          <p className="text-secondary-500">Manage your pharmacy's drug inventory</p>
        </div>
        <div className="flex gap-3">
          {alerts && alerts.total_alerts > 0 && (
            <button 
              onClick={() => setShowAlerts(!showAlerts)}
              className="btn-secondary flex items-center gap-2 relative"
            >
              <AlertCircle className="w-5 h-5" />
              Alerts
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {alerts.total_alerts}
              </span>
            </button>
          )}
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add Item
          </button>
        </div>
      </div>

      {/* Alerts Panel */}
      {showAlerts && alerts && (
        <div className="card bg-red-50 border border-red-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Inventory Alerts
            </h3>
            <button onClick={() => setShowAlerts(false)} className="text-red-400 hover:text-red-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {alerts.low_stock?.length > 0 && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-sm font-medium text-amber-700 mb-2">⚠️ Low Stock ({alerts.low_stock.length})</p>
                <ul className="text-sm text-secondary-600 space-y-1 max-h-32 overflow-y-auto">
                  {alerts.low_stock.map(i => (
                    <li key={i.id}>{i.drug_name} ({i.quantity_in_stock} left)</li>
                  ))}
                </ul>
              </div>
            )}
            {alerts.out_of_stock?.length > 0 && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-sm font-medium text-red-700 mb-2">❌ Out of Stock ({alerts.out_of_stock.length})</p>
                <ul className="text-sm text-secondary-600 space-y-1 max-h-32 overflow-y-auto">
                  {alerts.out_of_stock.map(i => (
                    <li key={i.id}>{i.drug_name}</li>
                  ))}
                </ul>
              </div>
            )}
            {alerts.expiring_soon?.length > 0 && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-sm font-medium text-orange-700 mb-2">⏰ Expiring Soon ({alerts.expiring_soon.length})</p>
                <ul className="text-sm text-secondary-600 space-y-1 max-h-32 overflow-y-auto">
                  {alerts.expiring_soon.map(i => (
                    <li key={i.id}>{i.drug_name} - {new Date(i.expiry_date).toLocaleDateString()}</li>
                  ))}
                </ul>
              </div>
            )}
            {alerts.expired?.length > 0 && (
              <div className="bg-white rounded-lg p-3">
                <p className="text-sm font-medium text-red-700 mb-2">🚫 Expired ({alerts.expired.length})</p>
                <ul className="text-sm text-secondary-600 space-y-1 max-h-32 overflow-y-auto">
                  {alerts.expired.map(i => (
                    <li key={i.id}>{i.drug_name} - Batch: {i.batch_number}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="card text-center">
            <Boxes className="w-8 h-8 text-primary-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-secondary-800">{stats.total_items}</p>
            <p className="text-sm text-secondary-500">Total Items</p>
          </div>
          <div className="card text-center">
            <Package className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-emerald-600">{stats.in_stock}</p>
            <p className="text-sm text-secondary-500">In Stock</p>
          </div>
          <div className="card text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-600">{stats.low_stock}</p>
            <p className="text-sm text-secondary-500">Low Stock</p>
          </div>
          <div className="card text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-600">{stats.out_of_stock}</p>
            <p className="text-sm text-secondary-500">Out of Stock</p>
          </div>
          <div className="card text-center">
            <Calendar className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-600">{stats.expiring_soon + stats.expired}</p>
            <p className="text-sm text-secondary-500">Expiring/Expired</p>
          </div>
          <div className="card text-center">
            <DollarSign className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-600">${stats.total_value?.toFixed(2)}</p>
            <p className="text-sm text-secondary-500">Total Value</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="input-field pl-12" 
              placeholder="Search by name, SKU, manufacturer..." 
            />
          </div>
          <select 
            value={category} 
            onChange={e => setCategory(e.target.value)} 
            className="input-field md:w-48"
          >
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)} 
            className="input-field md:w-48"
          >
            {STATUS_FILTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={loadData} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <Boxes className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-secondary-500">No inventory items found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-secondary-600">Drug Name</th>
                  <th className="text-left p-4 text-sm font-medium text-secondary-600">Category</th>
                  <th className="text-right p-4 text-sm font-medium text-secondary-600">Stock</th>
                  <th className="text-right p-4 text-sm font-medium text-secondary-600">Price</th>
                  <th className="text-center p-4 text-sm font-medium text-secondary-600">Expiry</th>
                  <th className="text-center p-4 text-sm font-medium text-secondary-600">Status</th>
                  <th className="text-right p-4 text-sm font-medium text-secondary-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-4">
                      <p className="font-medium text-secondary-800">{item.drug_name}</p>
                      <p className="text-sm text-secondary-500">
                        {item.generic_name && `${item.generic_name} • `}
                        {item.strength && `${item.strength} • `}
                        {item.manufacturer && item.manufacturer}
                      </p>
                      {item.batch_number && (
                        <p className="text-xs text-secondary-400">Batch: {item.batch_number}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-secondary-600 capitalize">{item.category}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`font-medium ${item.is_low_stock ? 'text-amber-600' : item.quantity_in_stock === 0 ? 'text-red-600' : 'text-secondary-800'}`}>
                        {item.quantity_in_stock}
                      </span>
                      <p className="text-xs text-secondary-400">Reorder: {item.reorder_level}</p>
                    </td>
                    <td className="p-4 text-right">
                      <p className="font-medium text-secondary-800">${item.unit_price}</p>
                      {item.profit_margin && (
                        <p className="text-xs text-emerald-600">+{item.profit_margin}% margin</p>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {item.expiry_date ? (
                        <span className={`text-sm ${item.is_expired ? 'text-red-600 font-medium' : item.is_expiring_soon ? 'text-orange-600' : 'text-secondary-600'}`}>
                          {new Date(item.expiry_date).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-secondary-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {getStockStatusBadge(item)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Dispense Button */}
                        <button 
                          onClick={() => setDispenseItem(item)} 
                          disabled={item.quantity_in_stock === 0}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Dispense/Sell"
                        >
                          <ShoppingCart className="w-4 h-4" />
                        </button>
                        {/* Restock Button */}
                        <button 
                          onClick={() => setRestockItem(item)} 
                          className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600"
                          title="Restock"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        {/* Edit Button */}
                        <button 
                          onClick={() => setEditingItem(item)} 
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-secondary-400" />
                        </button>
                        {/* Delete Button */}
                        <button 
                          onClick={() => handleDelete(item.id)} 
                          className="p-2 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {(showForm || editingItem) && (
        <InventoryForm
          item={editingItem}
          onClose={() => { setShowForm(false); setEditingItem(null) }}
          onSubmit={editingItem ? handleUpdate : handleCreate}
        />
      )}

      {restockItem && (
        <RestockModal
          item={restockItem}
          onClose={() => setRestockItem(null)}
          onSubmit={handleRestock}
        />
      )}

      {dispenseItem && (
        <DispenseModal
          item={dispenseItem}
          onClose={() => setDispenseItem(null)}
          onSubmit={handleDispense}
        />
      )}
    </div>
  )
}

// Inventory Form Modal
function InventoryForm({ item, onClose, onSubmit }) {
  const [formData, setFormData] = useState(item || {
    drug_name: '',
    generic_name: '',
    manufacturer: '',
    category: 'tablets',
    strength: '',
    dosage_form: '',
    quantity_in_stock: 0,
    unit_price: '',
    cost_price: '',
    sku: '',
    batch_number: '',
    expiry_date: '',
    reorder_level: 10,
    max_stock_level: 100,
    supplier_name: '',
    supplier_contact: '',
    requires_prescription: true,
    is_controlled_substance: false,
    storage_instructions: '',
    is_available: true
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await onSubmit(formData)
    setLoading(false)
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-display font-semibold">{item ? 'Edit' : 'Add'} Inventory Item</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-secondary-700 mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-secondary-700 mb-1">Drug Name *</label>
                <input 
                  value={formData.drug_name} 
                  onChange={e => handleChange('drug_name', e.target.value)} 
                  className="input-field" 
                  placeholder="Amoxicillin 500mg" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Generic Name</label>
                <input 
                  value={formData.generic_name} 
                  onChange={e => handleChange('generic_name', e.target.value)} 
                  className="input-field" 
                  placeholder="Amoxicillin" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Category</label>
                <select 
                  value={formData.category} 
                  onChange={e => handleChange('category', e.target.value)} 
                  className="input-field"
                >
                  {CATEGORIES.slice(1).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Strength</label>
                <input 
                  value={formData.strength} 
                  onChange={e => handleChange('strength', e.target.value)} 
                  className="input-field" 
                  placeholder="500mg" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Manufacturer</label>
                <input 
                  value={formData.manufacturer} 
                  onChange={e => handleChange('manufacturer', e.target.value)} 
                  className="input-field" 
                  placeholder="Pfizer" 
                />
              </div>
            </div>
          </div>

          {/* Stock & Pricing */}
          <div>
            <h3 className="text-sm font-semibold text-secondary-700 mb-3">Stock & Pricing</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Quantity *</label>
                <input 
                  type="number" 
                  value={formData.quantity_in_stock} 
                  onChange={e => handleChange('quantity_in_stock', parseInt(e.target.value) || 0)} 
                  className="input-field" 
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Unit Price ($) *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={formData.unit_price} 
                  onChange={e => handleChange('unit_price', e.target.value)} 
                  className="input-field" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Cost Price ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={formData.cost_price || ''} 
                  onChange={e => handleChange('cost_price', e.target.value || null)} 
                  className="input-field" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Reorder Level</label>
                <input 
                  type="number" 
                  value={formData.reorder_level} 
                  onChange={e => handleChange('reorder_level', parseInt(e.target.value) || 10)} 
                  className="input-field" 
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Batch & Expiry */}
          <div>
            <h3 className="text-sm font-semibold text-secondary-700 mb-3">Batch & Expiry</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">SKU / Barcode</label>
                <input 
                  value={formData.sku} 
                  onChange={e => handleChange('sku', e.target.value)} 
                  className="input-field" 
                  placeholder="SKU-001" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Batch Number</label>
                <input 
                  value={formData.batch_number} 
                  onChange={e => handleChange('batch_number', e.target.value)} 
                  className="input-field" 
                  placeholder="BATCH-2024-001" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Expiry Date</label>
                <input 
                  type="date" 
                  value={formData.expiry_date || ''} 
                  onChange={e => handleChange('expiry_date', e.target.value || null)} 
                  className="input-field" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Storage Instructions</label>
                <input 
                  value={formData.storage_instructions} 
                  onChange={e => handleChange('storage_instructions', e.target.value)} 
                  className="input-field" 
                  placeholder="Store below 25°C" 
                />
              </div>
            </div>
          </div>

          {/* Supplier */}
          <div>
            <h3 className="text-sm font-semibold text-secondary-700 mb-3">Supplier Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Supplier Name</label>
                <input 
                  value={formData.supplier_name} 
                  onChange={e => handleChange('supplier_name', e.target.value)} 
                  className="input-field" 
                  placeholder="ABC Pharma Distributors" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Supplier Contact</label>
                <input 
                  value={formData.supplier_contact} 
                  onChange={e => handleChange('supplier_contact', e.target.value)} 
                  className="input-field" 
                  placeholder="+1 234 567 8900" 
                />
              </div>
            </div>
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={formData.requires_prescription} 
                onChange={e => handleChange('requires_prescription', e.target.checked)} 
                className="w-4 h-4 rounded" 
              />
              <span className="text-sm text-secondary-700">Requires Prescription</span>
            </label>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={formData.is_controlled_substance} 
                onChange={e => handleChange('is_controlled_substance', e.target.checked)} 
                className="w-4 h-4 rounded" 
              />
              <span className="text-sm text-secondary-700">Controlled Substance</span>
            </label>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={formData.is_available} 
                onChange={e => handleChange('is_available', e.target.checked)} 
                className="w-4 h-4 rounded" 
              />
              <span className="text-sm text-secondary-700">Available for Sale</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {item ? 'Update' : 'Add'} Item
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Restock Modal
function RestockModal({ item, onClose, onSubmit }) {
  const [quantity, setQuantity] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!quantity || quantity <= 0) return
    setLoading(true)
    await onSubmit({
      quantity: parseInt(quantity),
      batch_number: batchNumber,
      expiry_date: expiryDate || null,
      cost_price: costPrice || null
    })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-display font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" /> Restock Item
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 bg-emerald-50 rounded-xl">
            <p className="font-medium text-secondary-800">{item.drug_name}</p>
            <p className="text-sm text-secondary-500">Current stock: <span className="font-semibold">{item.quantity_in_stock}</span></p>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Quantity to Add *</label>
            <input 
              type="number" 
              value={quantity} 
              onChange={e => setQuantity(e.target.value)} 
              className="input-field" 
              placeholder="100"
              min="1"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Batch Number</label>
            <input 
              value={batchNumber} 
              onChange={e => setBatchNumber(e.target.value)} 
              className="input-field" 
              placeholder="BATCH-2024-002" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Expiry Date</label>
            <input 
              type="date" 
              value={expiryDate} 
              onChange={e => setExpiryDate(e.target.value)} 
              className="input-field" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Cost Price ($)</label>
            <input 
              type="number" 
              step="0.01" 
              value={costPrice} 
              onChange={e => setCostPrice(e.target.value)} 
              className="input-field" 
              placeholder="10.50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading || !quantity} className="btn-primary flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Restock
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Dispense Modal
function DispenseModal({ item, onClose, onSubmit }) {
  const [quantity, setQuantity] = useState(1)
  const [saleType, setSaleType] = useState('otc')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const totalPrice = (quantity * parseFloat(item.unit_price || 0)).toFixed(2)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!quantity || quantity <= 0) return
    if (quantity > item.quantity_in_stock) {
      alert(`Only ${item.quantity_in_stock} units available`)
      return
    }
    setLoading(true)
    await onSubmit({
      quantity: parseInt(quantity),
      sale_type: saleType,
      customer_name: customerName,
      customer_phone: customerPhone,
      notes: notes
    })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-display font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" /> Dispense / Sell
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 bg-blue-50 rounded-xl">
            <p className="font-medium text-secondary-800">{item.drug_name}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-secondary-500">Available: <span className="font-semibold">{item.quantity_in_stock}</span></p>
              <p className="text-sm text-secondary-500">Price: <span className="font-semibold">${item.unit_price}</span>/unit</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Quantity to Dispense *</label>
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 border rounded-lg hover:bg-gray-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input 
                type="number" 
                value={quantity} 
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} 
                className="input-field text-center flex-1" 
                min="1"
                max={item.quantity_in_stock}
                required 
              />
              <button 
                type="button" 
                onClick={() => setQuantity(Math.min(item.quantity_in_stock, quantity + 1))}
                className="p-2 border rounded-lg hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Sale Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSaleType('otc')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  saleType === 'otc' 
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-700' 
                    : 'border-gray-200 text-secondary-600 hover:bg-gray-50'
                }`}
              >
                OTC Sale
              </button>
              <button
                type="button"
                onClick={() => setSaleType('prescription')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  saleType === 'prescription' 
                    ? 'bg-blue-100 border-blue-300 text-blue-700' 
                    : 'border-gray-200 text-secondary-600 hover:bg-gray-50'
                }`}
              >
                Prescription
              </button>
              <button
                type="button"
                onClick={() => setSaleType('return')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  saleType === 'return' 
                    ? 'bg-red-100 border-red-300 text-red-700' 
                    : 'border-gray-200 text-secondary-600 hover:bg-gray-50'
                }`}
              >
                <RotateCcw className="w-4 h-4 inline mr-1" />
                Return
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Customer Name</label>
              <input 
                value={customerName} 
                onChange={e => setCustomerName(e.target.value)} 
                className="input-field" 
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Phone</label>
              <input 
                value={customerPhone} 
                onChange={e => setCustomerPhone(e.target.value)} 
                className="input-field" 
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Notes</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              className="input-field" 
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>

          {/* Total */}
          <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
            <span className="font-medium text-secondary-700">Total Amount:</span>
            <span className="text-2xl font-bold text-emerald-600">
              {saleType === 'return' ? '-' : ''}${totalPrice}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button 
              type="submit" 
              disabled={loading || !quantity || quantity > item.quantity_in_stock} 
              className={`flex items-center gap-2 ${
                saleType === 'return' 
                  ? 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-medium'
                  : 'btn-primary'
              }`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 
               saleType === 'return' ? <RotateCcw className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
              {saleType === 'return' ? 'Process Return' : 'Complete Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}