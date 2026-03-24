import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
    Building2, ArrowLeft, Pencil, Loader2, Save, X, Users, BookOpen
} from 'lucide-react'
import { api, fetchJson } from '../../../lib/api'
import { useAuth } from '../../../contexts/AuthContext'

export const Route = createFileRoute('/admin/departments/$deptId')({
    component: DepartmentDetailPage,
})

function DepartmentDetailPage() {
    const { deptId } = Route.useParams()
    const { token } = useAuth()
    
    const [loading, setLoading] = useState(true)
    const [department, setDepartment] = useState(null)
    const [students, setStudents] = useState([])
    
    const [editing, setEditing] = useState(false)
    const [editForm, setEditForm] = useState(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        loadData()
    }, [deptId, token])

    const loadData = async () => {
        setLoading(true)
        try {
            const headers = { Authorization: `Bearer ${token}` }
            const data = await fetchJson(api.department(deptId), { headers })
            setDepartment(data)
            setEditForm({ ...data })
            
            // Optionally fetch students referencing this department
            // In a real app we'd have a backend filter like /students?department=xyz
            // For now we'll fetch all and filter client-side just to show stats
            const allStudents = await fetchJson(api.students(), { headers }).catch(() => [])
            setStudents(allStudents.filter(s => s.department === data.name))

        } catch (err) {
            console.error(err)
            setError('Failed to load department details')
        } finally {
            setLoading(false)
        }
    }

    const saveEdit = async () => {
        setSaving(true)
        setError('')
        try {
            const body = {
                name: editForm.name,
                full_name: editForm.full_name,
                description: editForm.description,
            }
            const updated = await fetchJson(api.department(deptId), {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            })
            setDepartment(updated)
            setEditing(false)
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="py-20 flex justify-center"><Loader2 size={40} className="text-teal-500 animate-spin" /></div>
    if (!department) return <div className="py-20 text-center text-neutral-500">Department not found</div>

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            {/* Header / Nav */}
            <div className="flex items-center justify-between">
                <Link to="/admin/departments" className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm font-medium">
                    <ArrowLeft size={16} /> Back to Departments
                </Link>
                {!editing && (
                    <button onClick={() => setEditing(true)} className="flex items-center gap-2 bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer">
                        <Pencil size={16} /> Edit Details
                    </button>
                )}
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden relative">
                        <div className="h-24 bg-gradient-to-r from-teal-600/20 to-emerald-500/20 border-b border-neutral-800 absolute top-0 w-full" />
                        
                        <div className="p-6 pt-16 relative z-10">
                            <div className="w-20 h-20 rounded-2xl bg-neutral-950 border-4 border-neutral-900 flex items-center justify-center font-bold bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-xl mb-4">
                                <Building2 size={32} />
                            </div>
                            
                            {editing ? (
                                <div className="space-y-4 max-w-lg mt-4">
                                    <div className="grid grid-cols-1 gap-4 text-left">
                                        <div>
                                            <label className="text-xs text-neutral-500 uppercase">Department Name</label>
                                            <input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 uppercase">Full Name</label>
                                            <input value={editForm.full_name || ''} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 uppercase">Description</label>
                                            <textarea rows={3} value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 mt-1 resize-none" />
                                        </div>
                                        <div className="flex gap-3 mt-2">
                                            <button onClick={() => setEditing(false)} className="px-4 py-2 border border-neutral-700 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer">Cancel</button>
                                            <button onClick={saveEdit} disabled={saving} className="flex-1 flex justify-center items-center gap-2 bg-teal-500 text-black font-bold px-4 py-2 rounded-xl hover:bg-teal-400 transition-colors cursor-pointer">
                                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-3xl font-bold text-white mb-2">{department.name}</h1>
                                    <p className="text-neutral-400 mb-6 leading-relaxed max-w-xl">{department.description || 'No description provided.'}</p>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 pt-6 border-t border-neutral-800/50">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Full Name</p>
                                            <p className="text-emerald-400 font-medium">{department.full_name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Date Established</p>
                                            <p className="text-neutral-300 font-medium">{new Date(department.created_at || Date.now()).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Stats */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <BookOpen size={18} className="text-teal-400" /> Department Stats
                        </h2>
                        
                        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                                <Users size={20} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-white">{students.length}</div>
                                <div className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Enrolled Students</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
