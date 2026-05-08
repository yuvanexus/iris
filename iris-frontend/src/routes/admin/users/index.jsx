import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Users, Loader2, Search, Plus, X, Eye, EyeOff, Bus } from 'lucide-react'
import { api, fetchJson } from '../../../lib/api'
import { useAuth } from '../../../contexts/AuthContext'

export const Route = createFileRoute('/admin/users/')({
    component: UsersPage,
})

const ROLE_FILTERS = [
    { key: 'all', label: 'All', color: '' },
    { key: 'parent', label: 'Parent', color: 'blue' },
    { key: 'scanner', label: 'Scanner', color: 'teal' },
    { key: 'admin', label: 'Admin', color: 'purple' },
]

function UsersPage() {
    const { token } = useAuth()
    const [accounts, setAccounts] = useState([])
    const [buses, setBuses] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [showModal, setShowModal] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10

    // Add-account form state
    const [form, setForm] = useState({ email: '', full_name: '', role: 'parent', password: '', bus_id: '' })
    const [formError, setFormError] = useState('')
    const [creating, setCreating] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            try {
                const headers = { Authorization: `Bearer ${token}` }
                const [usersData, busesData] = await Promise.all([
                    fetchJson(api.users(), { headers }),
                    fetchJson(api.buses(), { headers }).catch(() => []),
                ])
                setAccounts(usersData || [])
                setBuses(busesData || [])
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [token])

    // Reset to page 1 whenever filters change
    const resetPage = () => setCurrentPage(1)

    const filteredAccounts = accounts.filter(acc => {
        const matchesSearch =
            acc.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            acc.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            acc.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            acc.id?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesRole = roleFilter === 'all' || acc.role === roleFilter
        return matchesSearch && matchesRole
    })

    const openModal = () => {
        setForm({ email: '', full_name: '', role: 'parent', password: '', bus_id: '' })
        setFormError('')
        setShowModal(true)
    }

    const handleCreate = async () => {
        if (!form.email || !form.password) {
            setFormError('Email and password are required.')
            return
        }
        setCreating(true)
        setFormError('')
        try {
            const body = {
                email: form.email,
                full_name: form.full_name,
                role: form.role,
                password: form.password,
                bus_id: (form.role === 'scanner' && form.bus_id) ? form.bus_id : null,
            }
            const created = await fetchJson(api.register(), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            })
            setAccounts(prev => [...prev, created])
            setShowModal(false)
        } catch (err) {
            setFormError(err.message || 'Failed to create account.')
        } finally {
            setCreating(false)
        }
    }

    if (loading) {
        return <div className="py-12 flex justify-center"><Loader2 size={32} className="text-teal-500 animate-spin" /></div>
    }

    return (
        <div className="space-y-4">
            {/* Top bar: search + role filters + add button */}
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                {/* Search */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name, email, role..."
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 pl-9 pr-4 text-white placeholder:text-neutral-500 focus:outline-none focus:border-teal-500 transition-colors text-sm"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); resetPage() }}
                    />
                </div>

                {/* Role filter toggles */}
                <div className="flex gap-1.5 flex-wrap">
                    {ROLE_FILTERS.map(f => {
                        const active = roleFilter === f.key
                        const colorMap = {
                            blue: active ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'text-neutral-400 border-neutral-800 hover:border-blue-500/30 hover:text-blue-400',
                            teal: active ? 'bg-teal-500/20 text-teal-300 border-teal-500/40' : 'text-neutral-400 border-neutral-800 hover:border-teal-500/30 hover:text-teal-400',
                            purple: active ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'text-neutral-400 border-neutral-800 hover:border-purple-500/30 hover:text-purple-400',
                            '': active ? 'bg-neutral-700 text-white border-neutral-600' : 'text-neutral-400 border-neutral-800 hover:border-neutral-700',
                        }
                        return (
                            <button
                                key={f.key}
                                onClick={() => { setRoleFilter(f.key); resetPage() }}
                                className={`px-4 py-2 rounded-lg border text-md font-semibold transition-all cursor-pointer ${colorMap[f.color]}`}
                            >
                                {f.label}
                                {f.key !== 'all' && (
                                    <span className="ml-1.5 opacity-70">{accounts.filter(a => a.role === f.key).length}</span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Spacer + Add button */}
                <div className="md:ml-auto">
                    <button
                        onClick={openModal}
                        className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 active:scale-95 text-black font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer text-sm shadow-lg shadow-teal-500/20"
                    >
                        <Plus size={16} /> Add Account
                    </button>
                </div>
            </div>

            {/* Stats row */}
            <p className="text-sm text-neutral-500">
                    {(() => {
                    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1
                    const end = Math.min(currentPage * ITEMS_PER_PAGE, filteredAccounts.length)
                    return filteredAccounts.length > 0
                        ? <>Showing <span className="text-white font-medium">{start}–{end}</span> of <span className="text-white font-medium">{filteredAccounts.length}</span> accounts</>
                        : 'No accounts match your filters'
                })()} 
            </p>

            {/* Table */}
            {filteredAccounts.length === 0 ? (
                <EmptyState icon={<Users size={40} />} message={searchQuery || roleFilter !== 'all' ? "No accounts match your filters" : "No accounts found"} />
            ) : (
                <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl overflow-hidden overflow-x-auto">
                    <div className="min-w-200">
                        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider border-b border-neutral-800">
                            <div className="col-span-4">User</div>
                            <div className="col-span-3">Role</div>
                            <div className="col-span-3">Joined</div>
                            <div className="col-span-2 text-right">Action</div>
                        </div>
                        {filteredAccounts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(acc => (
                            <div key={acc.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-neutral-800/50 hover:bg-white/2 transition-colors items-center">
                                <div className="col-span-4 flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border
                                        ${acc.role === 'admin' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                                            : acc.role === 'scanner' ? 'bg-teal-500/10 border-teal-500/20 text-teal-400'
                                                : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                                        {acc.email?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white font-medium text-sm truncate">{acc.full_name || '—'}</p>
                                        <p className="text-neutral-500 text-xs truncate">{acc.email}</p>
                                    </div>
                                </div>
                                <div className="col-span-3">
                                    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border
                                        ${acc.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                            : acc.role === 'scanner' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                        {acc.role}
                                    </span>
                                </div>
                                <div className="col-span-3 text-sm text-neutral-500">
                                    {acc.created_at ? new Date(acc.created_at).toLocaleDateString() : '—'}
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <Link
                                        to={`/admin/users/${acc.id}`}
                                        className="inline-flex items-center justify-center bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-teal-500/20"
                                    >
                                        Manage →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pagination */}
            {filteredAccounts.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between px-2 py-2 border-t border-neutral-800/50">
                    <p className="text-sm text-neutral-400">
                        Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE)}</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-1"
                        >
                            ← Previous
                        </button>
                        {Array.from({ length: Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE) }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE) || Math.abs(p - currentPage) <= 1)
                            .reduce((acc, p, idx, arr) => {
                                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                                acc.push(p)
                                return acc
                            }, [])
                            .map((p, i) => (
                                p === '...' ? (
                                    <span key={`ellipsis-${i}`} className="text-neutral-500 px-1">…</span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => setCurrentPage(p)}
                                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                            p === currentPage
                                                ? 'bg-teal-500/20 border border-teal-500/40 text-teal-400'
                                                : 'border border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                )
                            ))
                        }
                        <button
                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE), p + 1))}
                            disabled={currentPage === Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE)}
                            className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-1"
                        >
                            Next →
                        </button>
                    </div>
                </div>
            )}

            {/* Add Account Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Plus size={18} className="text-teal-400" /> Create Account
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {formError && (
                                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{formError}</div>
                            )}

                            <div>
                                <label className="text-xs text-neutral-500 uppercase mb-1 block">Full Name</label>
                                <input
                                    value={form.full_name}
                                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                                    placeholder="e.g. John Doe"
                                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-teal-500 placeholder:text-neutral-600"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-neutral-500 uppercase mb-1 block">Email Address <span className="text-red-400">*</span></label>
                                <input
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    type="email"
                                    placeholder="e.g. staff@school.edu"
                                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-teal-500 placeholder:text-neutral-600"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-neutral-500 uppercase mb-1 block">Password <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <input
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Minimum 8 characters"
                                        className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 pr-10 text-white text-sm outline-none focus:border-teal-500 placeholder:text-neutral-600"
                                    />
                                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 cursor-pointer">
                                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>

                            {/* <div>
                                <label className="text-xs text-neutral-500 uppercase mb-1 block">Account Role</label>
                                <div className="flex gap-2">
                                    {['parent', 'scanner', 'admin'].map(role => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => setForm({ ...form, role, bus_id: '' })}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer capitalize
                                                ${form.role === role
                                                    ? role === 'admin' ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                                                        : role === 'scanner' ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
                                                            : 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                                    : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-600'}`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div> */}

                            {/* Bus assignment for scanner accounts */}
                            {form.role === 'scanner' && (
                                <div className="bg-neutral-950/60 border border-teal-500/20 rounded-xl p-4">
                                    <label className="text-xs text-teal-400 uppercase font-bold flex items-center gap-1.5 mb-2">
                                        <Bus size={12} /> Assigned Bus
                                    </label>
                                    <select
                                        value={form.bus_id}
                                        onChange={e => setForm({ ...form, bus_id: e.target.value })}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-teal-500"
                                    >
                                        <option value="">None — use all registered faces</option>
                                        {buses.map(b => (
                                            <option key={b.id} value={b.id}>{b.bus_number}{b.route_name ? ` — ${b.route_name}` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-2.5 border border-neutral-700 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={creating}
                                className="flex-1 flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-black font-bold py-2.5 rounded-xl transition-all cursor-pointer text-sm"
                            >
                                {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                                {creating ? 'Creating...' : 'Create Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function EmptyState({ icon, message }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-600">
            {icon}
            <p className="mt-4 font-medium">{message}</p>
        </div>
    )
}
