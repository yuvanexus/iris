import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, User, Shield, Mail, KeyRound, Loader2, Save, Bus } from 'lucide-react'
import { api, fetchJson } from '../../../lib/api'
import { useAuth } from '../../../contexts/AuthContext'

export const Route = createFileRoute('/admin/users/$userId')({
    component: UserDetail,
})

function UserDetail() {
    const { userId } = Route.useParams()
    const navigate = useNavigate()
    const { token } = useAuth()
    
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState(null)
    const [buses, setBuses] = useState([])
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    
    const [editForm, setEditForm] = useState(null)
    
    useEffect(() => {
        const loadUser = async () => {
            try {
                const headers = { Authorization: `Bearer ${token}` }
                const [data, busesData] = await Promise.all([
                    fetchJson(api.user(userId), { headers }),
                    fetchJson(api.buses(), { headers }).catch(() => []),
                ])
                setUser(data)
                setBuses(busesData)
                setEditForm({
                    email: data.email,
                    full_name: data.full_name || '',
                    role: data.role,
                    bus_id: data.bus_id || '',
                    password: ''
                })
            } catch (err) {
                setError('Failed to load user info')
            } finally {
                setLoading(false)
            }
        }
        loadUser()
    }, [userId, token])

    const saveChanges = async () => {
        setSaving(true)
        setError('')
        try {
            const body = {
                email: editForm.email,
                full_name: editForm.full_name,
                role: editForm.role,
                // Always send bus_id so it can be explicitly set to null (none)
                bus_id: (editForm.role === 'scanner' && editForm.bus_id) ? editForm.bus_id : null,
            }
            if (editForm.password) {
                body.password = editForm.password;
            }

            const updated = await fetchJson(api.updateUser(userId), {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            })
            
            setUser(updated)
            setEditForm(prev => ({...prev, password: ''}))
            setEditing(false)
        } catch (err) {
            setError(err.message || 'Failed to update user')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="py-20 flex justify-center"><Loader2 size={40} className="text-teal-500 animate-spin" /></div>
    if (!user) return <div className="py-20 text-center text-neutral-500">User not found</div>

    return (
        <div className="max-w-3xl mx-auto pb-20 space-y-6">
            <div className="flex items-center justify-between">
                <Link to="/admin/users" className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm font-medium">
                    <ArrowLeft size={16} /> Back to Users
                </Link>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm">{error}</div>}

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden relative">
                <div className="h-32 bg-gradient-to-r from-purple-500/20 to-teal-500/20 border-b border-neutral-800 absolute top-0 w-full" />
                
                <div className="p-8 pt-20 relative z-10">
                    <div className="w-24 h-24 rounded-2xl bg-neutral-950 border-4 border-neutral-900 flex items-center justify-center font-bold bg-gradient-to-br from-purple-400 to-teal-500 text-white shadow-xl mb-6">
                        <User size={40} />
                    </div>

                    {!editing ? (
                        <>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-3xl font-bold text-white tracking-tight">{user.full_name || 'No Name Provided'}</h1>
                                    <p className="text-neutral-400 text-lg flex items-center gap-2 mt-1">
                                        <Mail size={16} /> {user.email}
                                    </p>
                                </div>
                                <button onClick={() => setEditing(true)} className="bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer">
                                    Edit Account Details
                                </button>
                            </div>

                            <div className="mt-8 grid grid-cols-2 gap-6 p-6 rounded-2xl bg-neutral-950/50 border border-neutral-800/50">
                                <div className="space-y-1">
                                    <p className="text-xs text-neutral-500 uppercase flex items-center gap-1.5"><Shield size={14}/> Role</p>
                                    <p className="text-white capitalize font-medium">{user.role}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-neutral-500 uppercase flex items-center gap-1.5"><KeyRound size={14}/> Account ID</p>
                                    <p className="text-neutral-300 font-mono text-sm">{user.id}</p>
                                </div>
                                {user.role === 'scanner' && (
                                    <div className="col-span-2 space-y-1">
                                        <p className="text-xs text-neutral-500 uppercase flex items-center gap-1.5"><Bus size={14}/> Assigned Bus</p>
                                        <p className="text-white font-medium">
                                            {user.bus_id
                                                ? (buses.find(b => String(b.id) === String(user.bus_id))?.bus_number || `Bus ID: ${user.bus_id}`)
                                                : <span className="text-amber-400">None — scanner uses all registered faces</span>
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                            <div className="max-w-lg space-y-4">
                            <h2 className="text-xl font-bold text-white mb-6">Edit User Account</h2>
                            
                            <div>
                                <label className="text-xs text-neutral-500 uppercase">Full Name</label>
                                <input value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2 text-white outline-none focus:border-teal-500 mt-1" />
                            </div>
                            
                            <div>
                                <label className="text-xs text-neutral-500 uppercase">Email Address</label>
                                <input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2 text-white outline-none focus:border-teal-500 mt-1" type="email" />
                            </div>

                            <div>
                                <label className="text-xs text-neutral-500 uppercase">Account Role</label>
                                <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value, bus_id: ''})} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500 mt-1">
                                    <option value="parent">Parent</option>
                                    <option value="scanner">Scanner (Staff)</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>

                            {/* Bus assignment — only for scanner accounts */}
                            {editForm.role === 'scanner' && (
                                <div className="bg-neutral-950/60 border border-teal-500/20 rounded-xl p-4">
                                    <label className="text-xs text-teal-400 uppercase font-bold flex items-center gap-1.5 mb-2">
                                        <Bus size={13} /> Assigned Bus
                                    </label>
                                    <p className="text-xs text-neutral-500 mb-3">The scanner will only recognize students from the selected bus. "None" downloads all faces (not recommended for large schools).</p>
                                    <select
                                        value={editForm.bus_id}
                                        onChange={e => setEditForm({...editForm, bus_id: e.target.value})}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-teal-500"
                                    >
                                        <option value="">None — use all registered faces</option>
                                        {buses.map(b => (
                                            <option key={b.id} value={b.id}>{b.bus_number}{b.route_name ? ` — ${b.route_name}` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="pt-4 mt-4 border-t border-neutral-800">
                                <label className="text-xs text-neutral-500 uppercase text-amber-500 font-bold mb-1 block">Reset Password</label>
                                <p className="text-xs text-neutral-500 mb-2">Leave blank to keep the current password unchanged.</p>
                                <input type="password" placeholder="New Password" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2 text-white outline-none focus:border-amber-500 mt-1 placeholder:text-neutral-600" />
                            </div>

                            <div className="flex gap-3 pt-6">
                                <button onClick={() => setEditing(false)} className="px-5 py-2.5 border border-neutral-700 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer font-medium">Cancel</button>
                                <button onClick={saveChanges} disabled={saving} className="flex-1 flex justify-center items-center gap-2 bg-teal-500 text-black font-bold px-5 py-2.5 rounded-xl hover:bg-teal-400 transition-colors cursor-pointer">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Account Changes
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
