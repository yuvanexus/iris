import { createFileRoute, Link, useParams, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
    User, ArrowLeft, Pencil, ScanFace, Bus, CheckCircle2, XCircle, FileText, Loader2, Save, X, Trash2, MapPin
} from 'lucide-react'
import { api, fetchJson } from '../../../lib/api'
import { useAuth } from '../../../contexts/AuthContext'

export const Route = createFileRoute('/admin/students/$studentId')({
    component: StudentDetailPage,
})

function StudentDetailPage() {
    const { studentId } = Route.useParams()
    const navigate = useNavigate()
    const { token } = useAuth()

    const [loading, setLoading] = useState(true)
    const [student, setStudent] = useState(null)
    const [bus, setBus] = useState(null)
    const [parentUser, setParentUser] = useState(null)
    const [showParentModal, setShowParentModal] = useState(false)
    const [landmarks, setLandmarks] = useState([])
    const [attendance, setAttendance] = useState([])

    const [editing, setEditing] = useState(false)
    const [editForm, setEditForm] = useState(null)
    const [busesList, setBusesList] = useState([])
    const [parentsList, setParentsList] = useState([])
    const [departmentsList, setDepartmentsList] = useState([])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        loadStudentData()
    }, [studentId, token])

    const loadStudentData = async () => {
        setLoading(true)
        try {
            const headers = { Authorization: `Bearer ${token}` }

            // 1. Fetch student primary profile details
            const data = await fetchJson(api.studentProfile(studentId), { headers })
            setStudent(data)
            setEditForm({ ...data }) // init form

            // Parallel load remaining stuff
            const pArr = [
                fetchJson(api.faceLandmarks(studentId)).catch(() => []),
                fetchJson(api.studentAttendance(studentId)).catch(() => [])
            ]

            if (data.bus_id) {
                pArr.push(fetchJson(api.bus(data.bus_id)).catch(() => null))
            } else {
                pArr.push(Promise.resolve(null))
            }

            if (data.parent_id) {
                pArr.push(fetchJson(api.users(), { headers })
                    .then(users => users.find(u => u.id === data.parent_id) || null)
                    .catch(() => null))
            } else {
                pArr.push(Promise.resolve(null))
            }

            const [lmData, attData, busData, pUser] = await Promise.all(pArr)
            setLandmarks(lmData)
            setAttendance(attData)
            setBus(busData)
            setParentUser(pUser)

        } catch (err) {
            console.error(err)
            setError('Failed to load student details')
        } finally {
            setLoading(false)
        }
    }

    const startEditing = async () => {
        setEditing(true)
        // Load dropdowns if empty
        if (busesList.length === 0 || departmentsList.length === 0) {
            const headers = { Authorization: `Bearer ${token}` }
            const [b, u, d] = await Promise.all([
                fetchJson(api.buses()).catch(() => []),
                fetchJson(api.users(), { headers }).catch(() => []),
                fetchJson(api.departments()).catch(() => []),
            ])
            setBusesList(b)
            setParentsList(u.filter(x => x.role === 'parent'))
            setDepartmentsList(d)
        }
    }

    const saveEdit = async () => {
        setSaving(true)
        setError('')
        try {
            const body = {
                name: editForm.name,
                roll_number: editForm.roll_number,
                department: editForm.department_id || editForm.department || null,
                contact: editForm.contact,
                address: editForm.address,
                parent_contact: editForm.parent_contact,
                bus_id: editForm.bus_id || null,
                parent_id: editForm.parent_id || null,
            }
            const updated = await fetchJson(api.updateStudent(studentId), {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            })
            setStudent(updated)
            setEditing(false)
            if (updated.bus_id !== student.bus_id) loadData() // reload if bus changed
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="py-20 flex justify-center"><Loader2 size={40} className="text-teal-500 animate-spin" /></div>
    if (!student) return <div className="py-20 text-center text-neutral-500">Student not found</div>

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            {/* Header / Nav */}
            <div className="flex items-center justify-between">
                <Link to="/admin/students" className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm font-medium">
                    <ArrowLeft size={16} /> Back to Students
                </Link>
                {!editing && (
                    <button onClick={startEditing} className="flex items-center gap-2 bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer">
                        <Pencil size={16} /> Edit Profile
                    </button>
                )}
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column - Core Info */}
                <div className="md:col-span-2 space-y-6">

                    {/* Main Profile Card */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden relative">
                        <div className="h-24 bg-gradient-to-r from-teal-500/20 to-purple-500/20 border-b border-neutral-800 absolute top-0 w-full" />

                        <div className="p-6 pt-16 relative z-10">
                            <div className="w-24 h-24 rounded-full bg-neutral-950 border-4 border-neutral-900 flex items-center justify-center text-3xl font-bold bg-gradient-to-br from-teal-400 to-purple-500 text-white shadow-xl mb-4">
                                {student.name?.charAt(0)?.toUpperCase()}
                            </div>

                            {editing ? (
                                <div className="space-y-4 max-w-lg mt-4">
                                    <div className="grid grid-cols-2 gap-4 text-left">
                                        <div className="col-span-2">
                                            <label className="text-xs text-neutral-500 uppercase">Full Name</label>
                                            <input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 uppercase">Roll Number</label>
                                            <input value={editForm.roll_number || ''} onChange={e => setEditForm({ ...editForm, roll_number: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 uppercase">Department</label>
                                            <select
                                                value={editForm.department_id || editForm.department || ''}
                                                onChange={e => setEditForm({ ...editForm, department_id: e.target.value, department: e.target.value })}
                                                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 mt-1"
                                            >
                                                <option value="">-- No Department --</option>
                                                {departmentsList.map(d => <option key={d.id} value={d.id}>{d.name} {d.full_name ? `(${d.full_name})` : ''}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 uppercase">Contact</label>
                                            <input value={editForm.contact || ''} onChange={e => setEditForm({ ...editForm, contact: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 mt-1" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs text-neutral-500 uppercase">Address</label>
                                            <input value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 mt-1" />
                                        </div>
                                        <div className="col-span-2 flex gap-3 mt-4">
                                            <button onClick={() => setEditing(false)} className="px-4 py-2 border border-neutral-700 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer">Cancel</button>
                                            <button onClick={saveEdit} disabled={saving} className="flex-1 flex justify-center items-center gap-2 bg-teal-500 text-black font-bold px-4 py-2 rounded-xl hover:bg-teal-400 transition-colors cursor-pointer">
                                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-3xl font-bold text-white mb-1">{student.name}</h1>
                                    <p className="text-neutral-400 font-mono mb-6">{student.roll_number || 'No Roll Number'} • {student.department || 'No Dept'}</p>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 pt-6 border-t border-neutral-800/50">
                                        <InfoItem icon={<FileText size={16} className="text-neutral-500" />} label="Contact" value={student.contact} />
                                        {/* <InfoItem icon={<User size={16} className="text-blue-500" />} label="Profile Contact" value={student.parent_contact || student.extra_info?.parent_name} /> */}
                                        <InfoItem icon={<MapPin size={16} className="text-emerald-500" />} label="Address" value={student.address} colSpan={2} />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Attendance History */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-teal-400" /> Recent Attendance Logs
                        </h2>
                        {attendance.length === 0 ? (
                            <p className="text-sm text-neutral-500 italic py-4">No attendance activity recorded.</p>
                        ) : (
                            <div className="space-y-3">
                                {attendance.slice(0, 10).map((log, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/50 border border-neutral-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-full ${log.status.includes('present') ? 'bg-teal-500/20 text-teal-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                {log.status.includes('present') ? <CheckCircle2 size={16} /> : <Bus size={16} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{log.status.replace(/_/g, ' ').toUpperCase()}</p>
                                                <p className="text-xs text-neutral-500">{new Date(log.timestamp).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-xs font-mono text-neutral-400 px-2 py-1 bg-neutral-800 rounded">
                                            Bus #{log.bus_id?.substring(0, 6)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - System Modules */}
                <div className="space-y-6">
                    {/* Bus Info Card */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Bus size={18} className="text-blue-400" /> Transport
                            </h2>
                            {editing && (
                                <select
                                    className="bg-neutral-950 border border-neutral-700 text-white text-xs rounded-lg p-1 w-32 outline-none"
                                    value={editForm.bus_id || ''}
                                    onChange={e => setEditForm({ ...editForm, bus_id: e.target.value })}
                                >
                                    <option value="">-- No Bus --</option>
                                    {busesList.map(b => <option key={b.id} value={b.id}>{b.bus_number}</option>)}
                                </select>
                            )}
                        </div>

                        {bus ? (
                            <Link to={`/admin/buses/${bus.id}`} className="block bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 hover:bg-blue-500/10 transition-colors">
                                <div className="text-2xl font-black text-blue-400 mb-1">{bus.bus_number}</div>
                                <div className="text-sm text-neutral-300 font-medium mb-3">{bus.route_name || 'No Route Mapped'}</div>
                                <div className="flex gap-4 text-xs text-neutral-500">
                                    <span><strong className="text-neutral-400">Driver:</strong> {bus.driver_name || 'N/A'}</span>
                                    <span><strong className="text-neutral-400">Seats:</strong> {bus.capacity}</span>
                                </div>
                            </Link>
                        ) : (
                            <div className="bg-neutral-950 rounded-xl p-4 border border-dashed border-neutral-800 text-center text-sm text-neutral-500">
                                No bus assigned
                            </div>
                        )}

                        {/* Parent Assignment */}
                        <div className="mt-6 pt-4 border-t border-neutral-800">
                            <h3 className="text-xs uppercase tracking-wider text-neutral-500 mb-3 font-semibold">Linked Account</h3>
                            {editing ? (
                                <select
                                    className="bg-neutral-950 border border-neutral-700 text-white text-sm rounded-lg p-2 w-full outline-none"
                                    value={editForm.parent_id || ''}
                                    onChange={e => setEditForm({ ...editForm, parent_id: e.target.value })}
                                >
                                    <option value="">-- Unlinked --</option>
                                    {parentsList.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
                                </select>
                            ) : parentUser ? (
                                <button onClick={() => setShowParentModal(true)} className="w-full text-left bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 transition-colors cursor-pointer flex items-center justify-between group">
                                    <div>
                                        <div className="text-purple-400 font-bold mb-1">{parentUser.full_name || 'No Name'}</div>
                                        <div className="text-xs text-neutral-400">{parentUser.email}</div>
                                    </div>
                                    <div className="w-7 h-7 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                        <User size={14} />
                                    </div>
                                </button>
                            ) : student.parent_id ? (
                                <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800 flex items-center justify-between">
                                    <div className="text-sm text-white font-medium break-all">Checking parent {student.parent_id.substring(0, 6)}...</div>
                                    <Loader2 size={16} className="text-neutral-500 animate-spin" />
                                </div>
                            ) : (
                                <div className="bg-neutral-950 rounded-xl p-4 border border-dashed border-neutral-800 text-center text-sm text-neutral-500">
                                    Unlinked
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Face Data Card */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <ScanFace size={18} className="text-purple-400" /> Face Biomectrics
                        </h2>

                        {landmarks.length > 0 ? (
                            <div className="space-y-3">
                                <div className="bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-xl p-4 text-center">
                                    <ScanFace size={32} className="mx-auto mb-2 opacity-80" />
                                    <div className="font-bold text-lg mb-0.5">Scanned & Activated</div>
                                    <div className="text-xs opacity-70">Ready for offline bus scanner</div>
                                </div>
                                <div className="bg-neutral-950 rounded-lg p-3 text-xs text-neutral-500 font-mono text-center">
                                    {landmarks.length} Landmark Profiles Extracted
                                </div>
                            </div>
                        ) : (
                            <div className="bg-neutral-950 rounded-xl p-6 border border-dashed border-neutral-800 text-center">
                                <ScanFace size={32} className="mx-auto mb-3 text-neutral-700" />
                                <div className="text-sm font-medium text-neutral-400 mb-1">No Faces Registered</div>
                                <p className="text-xs text-neutral-600 mb-4">You need to register the student's face before they can board a bus.</p>
                                <Link to="/admin/face-registration" className="text-xs font-bold bg-purple-500/10 text-purple-400 px-4 py-2 rounded-lg hover:bg-purple-500/20 transition-colors inline-block">
                                    Scan Now
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Parent Modal */}
            {showParentModal && parentUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                        <button onClick={() => setShowParentModal(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors cursor-pointer">
                            <X size={20} />
                        </button>
                        <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-2xl font-bold mb-4">
                            {parentUser.full_name?.charAt(0)?.toUpperCase() || 'P'}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1">{parentUser.full_name || 'Parent Profile'}</h3>
                        <p className="text-neutral-400 text-sm mb-6">{parentUser.email}</p>

                        <div className="space-y-4">
                            {/* <div>
                                <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Account Role</p>
                                <p className="text-sm text-neutral-300 capitalize">{parentUser.role}</p>
                            </div> */}
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Account ID</p>
                                <p className="text-sm text-neutral-300 font-mono break-all">{parentUser.id}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-1">Status</p>
                                <p className="text-sm text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 size={14} /> Active
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function InfoItem({ icon, label, value, colSpan = 1 }) {
    // Basic Icon map
    const map = { Contact: FileText, 'Contact': User, Address: MapPin }
    const I = map[label] || User
    return (
        <div className={`col-span-${colSpan} flex gap-3`}>
            <div className="mt-0.5">{icon}</div>
            <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-0.5">{label}</p>
                <p className="text-sm text-neutral-200">{value || 'N/A'}</p>
            </div>
        </div>
    )
}
