import { User, LogOut, Bus, Loader2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { api, fetchJson } from '../../lib/api'

export function AccountTab() {
    const { user, token, logout } = useAuth()
    const navigate = useNavigate()
    const [busDetails, setBusDetails] = useState(null)
    const [loadingBus, setLoadingBus] = useState(false)

    useEffect(() => {
        if (!user?.bus_id || !token) return
        
        const fetchBus = async () => {
            setLoadingBus(true)
            try {
                const data = await fetchJson(api.bus(user.bus_id), {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setBusDetails(data)
            } catch (err) {
                console.error("Failed to load bus details", err)
            } finally {
                setLoadingBus(false)
            }
        }
        fetchBus()
    }, [user?.bus_id, token])

    return (
        <div className="space-y-6">
            <section className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 lg:p-8 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <User className="text-pink-400" />
                    Account Profile
                </h2>
                <div className="space-y-4 max-w-sm">
                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Display Name</label>
                        <input type="text" value={user?.full_name || ''} readOnly className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white outline-none opacity-70 cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Email Address</label>
                        <input type="email" value={user?.email || ''} readOnly className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white outline-none opacity-70 cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Role</label>
                        <input type="text" value={user?.role || ''} readOnly className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white outline-none opacity-70 cursor-not-allowed capitalize" />
                    </div>
                    {/* Read-only assigned bus — configured by admin from the Users panel */}
                    <div>
                        <label className="flex text-sm font-medium text-neutral-400 mb-1 items-center gap-1.5">
                            <Bus size={13} className="text-teal-400" />
                            Assigned Bus
                        </label>
                        {user?.bus_id ? (
                            <div className="w-full bg-neutral-800 border border-teal-500/30 rounded-lg p-3 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_6px_rgba(20,184,166,0.7)] shrink-0 mt-1 self-start"></div>
                                {loadingBus ? (
                                    <div className="flex items-center gap-2 text-neutral-400 text-sm">
                                        <Loader2 size={14} className="animate-spin" /> Loading bus info...
                                    </div>
                                ) : busDetails ? (
                                    <div className="flex-1 min-w-0">
                                        <p className="text-teal-300 font-bold leading-tight">{busDetails.bus_number}</p>
                                        <p className="text-xs text-neutral-400 truncate mt-0.5">{busDetails.route_name || 'No route defined'} • Driver: {busDetails.driver_name || 'N/A'}</p>
                                    </div>
                                ) : (
                                    <span className="text-teal-300 text-sm font-medium font-mono">Bus ID: {user.bus_id}</span>
                                )}
                            </div>
                        ) : (
                            <div className="w-full bg-neutral-800 border border-amber-500/20 rounded-lg p-2.5 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                <span className="text-amber-400 text-sm">No bus assigned — contact your administrator</span>
                            </div>
                        )}
                        <p className="text-xs text-neutral-600 mt-1.5">Bus assignment is managed by your administrator from the Users panel.</p>
                    </div>
                </div>
            </section>

            <section className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 lg:p-8">
                <h2 className="text-lg font-bold text-red-400 mb-2">Sign Out</h2>
                <p className="text-neutral-400 text-sm mb-4">Log out of your current session on this device.</p>
                <button
                    onClick={() => { logout(); navigate({ to: '/login' }) }}
                    className="cursor-pointer bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-6 py-2.5 rounded-xl transition-colors font-medium flex items-center gap-2"
                >
                    <LogOut size={18} />
                    Log Out
                </button>
            </section>
        </div>
    )
}
