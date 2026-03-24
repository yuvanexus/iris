import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { BookOpen, Plus, Pencil, Trash2, X, Loader2, Save } from 'lucide-react'
import { api, fetchJson } from '../../../lib/api'
import { useAuth } from '../../../contexts/AuthContext'

export const Route = createFileRoute('/admin/departments/')({
    component: DepartmentsPage,
})

function DepartmentsPage() {
    const navigate = useNavigate()
    const { token } = useAuth()
    const [departments, setDepartments] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState({ name: '', full_name: '', description: '' })
    const [saving, setSaving] = useState(false)

    // Load departments
    const loadDepartments = async () => {
        try {
            const data = await fetchJson(api.departments())
            setDepartments(data)
        } catch (err) {
            console.error('Failed to load departments', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadDepartments() }, [])

    // Open form for new or edit
    const openNewForm = () => {
        setForm({ name: '', full_name: '', description: '' })
        setEditingId(null)
        setShowForm(true)
    }

    const openEditForm = (dept) => {
        setForm({ name: dept.name, full_name: dept.full_name, description: dept.description })
        setEditingId(dept.id)
        setShowForm(true)
    }

    const closeForm = () => {
        setShowForm(false)
        setEditingId(null)
    }

    // Save (create or update)
    const handleSave = async () => {
        if (!form.name.trim()) return
        setSaving(true)
        try {
            if (editingId) {
                await fetchJson(api.department(editingId), {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` },
                    body: JSON.stringify(form),
                })
            } else {
                await fetchJson(api.departments(), {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: JSON.stringify(form),
                })
            }
            closeForm()
            await loadDepartments()
        } catch (err) {
            alert(err.message)
        } finally {
            setSaving(false)
        }
    }

    // Delete
    const handleDelete = async (id) => {
        if (!confirm('Delete this department?')) return
        try {
            await fetchJson(api.department(id), {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            await loadDepartments()
        } catch (err) {
            alert(err.message)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 size={32} className="animate-spin text-teal-500" />
            </div>
        )
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                        Departments
                    </h1>
                    <p className="text-neutral-500 text-sm mt-1">Manage academic departments</p>
                </div>
                <button
                    onClick={openNewForm}
                    className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-teal-500/20 cursor-pointer"
                >
                    <Plus size={18} /> Add Department
                </button>
            </div>

            {/* Department Cards */}
            {departments.length === 0 ? (
                <div className="text-center py-16 text-neutral-500">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                    <p>No departments yet. Click "Add Department" to create one.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {departments.map(dept => (
                        <div 
                            key={dept.id} 
                            className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-5 hover:border-teal-500/50 hover:bg-neutral-900 transition-all cursor-pointer group"
                            onClick={() => navigate({ to: `/admin/departments/${dept.id}` })}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-colors duration-300">
                                        <BookOpen size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg">{dept.name}</h3>
                                        {dept.full_name && <p className="text-neutral-400 text-sm">{dept.full_name}</p>}
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); openEditForm(dept) }} className="p-2 text-neutral-500 hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-all cursor-pointer">
                                        <Pencil size={14} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(dept.id) }} className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            {dept.description && <p className="text-neutral-500 text-sm leading-relaxed">{dept.description}</p>}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeForm}>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">
                                {editingId ? 'Edit Department' : 'New Department'}
                            </h2>
                            <button onClick={closeForm} className="p-2 text-neutral-500 hover:text-white rounded-lg transition-all cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Short Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. CS, BCA, MBA"
                                    value={form.name}
                                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl py-3 px-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-teal-500/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Computer Science"
                                    value={form.full_name}
                                    onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                                    className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl py-3 px-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-teal-500/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Description</label>
                                <textarea
                                    placeholder="Optional description..."
                                    value={form.description}
                                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl py-3 px-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-teal-500/50 transition-all resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={closeForm} className="flex-1 py-3 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer font-medium">
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !form.name.trim()}
                                className="flex-1 py-3 rounded-xl bg-linear-to-r from-teal-500 to-cyan-500 text-white font-semibold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-teal-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                {editingId ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
