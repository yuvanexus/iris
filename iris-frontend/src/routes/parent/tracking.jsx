import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { MapPin, Bus, Loader2, RefreshCw, AlertCircle, User } from 'lucide-react'
import { api, fetchJson } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'
import { LiveBusMap } from '../../components/LiveBusMap'

export const Route = createFileRoute('/parent/tracking')({
    component: ParentTracking,
})

function ParentTracking() {
    const { token } = useAuth()
    const [children, setChildren] = useState([])
    const [busStatuses, setBusStatuses] = useState({})
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState('')

    const loadData = async () => {
        try {
            setError('')
            const kids = await fetchJson(api.myProfile(), {
                headers: { Authorization: `Bearer ${token}` }
            })
            setChildren(kids)

            // Fetch bus status for each child that has a bus assigned
            const statuses = {}
            await Promise.all(
                kids.filter(k => k.bus_id).map(async kid => {
                    try {
                        const status = await fetchJson(api.busStatus(kid.bus_id))
                        statuses[kid.bus_id] = status
                    } catch {
                        statuses[kid.bus_id] = null
                    }
                })
            )
            setBusStatuses(statuses)
        } catch (err) {
            setError('Failed to load tracking data.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        if (token) loadData()
    }, [token])

    const handleRefresh = () => {
        setRefreshing(true)
        loadData()
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 size={32} className="animate-spin text-teal-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <MapPin className="text-teal-400" /> Live Bus Tracking
                </h2>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-300 hover:bg-neutral-700 transition-colors text-sm cursor-pointer disabled:opacity-50"
                >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                    <AlertCircle size={18} />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {children.length === 0 && !error && (
                <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-10 text-center text-neutral-500">
                    <Bus size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-medium">No Students linked to your account.</p>
                    <p className="text-sm mt-1">Contact the admin to link a Student.</p>
                </div>
            )}

            {children.map(child => {
                const status = child.bus_id ? busStatuses[child.bus_id] : null

                return (
                    <div key={child.id} className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6">
                        {/* Child header */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                                {child.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-white font-semibold">{child.name}</p>
                                <p className="text-xs text-neutral-500 font-mono">{child.roll_number}</p>
                            </div>
                        </div>

                        {!child.bus_id ? (
                            <div className="text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3">
                                No bus assigned to this student yet.
                            </div>
                        ) : !status ? (
                            <div className="text-sm text-neutral-500 bg-neutral-800/50 rounded-xl px-4 py-3">
                                Could not load bus data. The bus may not have sent a location yet.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Bus info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <InfoBox label="Bus Number" value={status.bus.bus_number} />
                                    <InfoBox label="Route" value={status.bus.route_name || '—'} />
                                    <InfoBox label="Driver" value={status.bus.driver_name || '—'} />
                                    <InfoBox label="Driver Contact" value={status.bus.driver_contact || '—'} />
                                </div>

                                {/* Live status */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-neutral-950/50 border border-neutral-800 rounded-xl">
                                    <div className={`flex items-center gap-2 font-medium text-sm px-3 py-1.5 rounded-full border ${status.bus.state === 'arrived'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : status.bus.state === 'on_the_way'
                                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full ${status.bus.state === 'arrived'
                                            ? 'bg-emerald-400'
                                            : status.bus.state === 'on_the_way'
                                                ? 'bg-blue-400 animate-pulse'
                                                : 'bg-amber-400'
                                            }`}></div>
                                        {status.bus.state === 'arrived' ? 'Arrived' : status.bus.state === 'on_the_way' ? 'On the Way' : 'Stopped'}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-neutral-400">
                                        <User size={13} />
                                        {status.students_present} student{status.students_present !== 1 ? 's' : ''} on board
                                    </div>
                                    {status.current_location && (
                                        <span className="text-xs text-neutral-600 sm:ml-auto">
                                            Updated: {new Date(status.current_location.timestamp).toLocaleTimeString()}
                                        </span>
                                    )}
                                </div>

                                {/* GPS coordinates */}
                                {status.current_location ? (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full bg-neutral-900/40 p-3 rounded-xl border border-neutral-800 mt-2">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={16} className="text-teal-400 shrink-0" />
                                            <span className="font-mono text-sm text-neutral-300">
                                                {status.current_location.latitude.toFixed(5)}, {status.current_location.longitude.toFixed(5)}
                                            </span>
                                        </div>
                                        <a
                                            href={`https://www.google.com/maps?q=${status.current_location.latitude},${status.current_location.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 text-xs font-semibold bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border border-teal-500/20 px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
                                        >
                                            Open in Maps ↗
                                        </a>
                                    </div>
                                ) : (
                                    <p className="text-xs text-neutral-600 italic">No GPS coordinates received yet.</p>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}

            {/* Combined Map for all children's buses */}
            {Object.keys(busStatuses).length > 0 && (
                <div className="mt-2">
                    <LiveBusMap
                        buses={children.filter(c => c.bus_id && busStatuses[c.bus_id]?.bus).map(c => busStatuses[c.bus_id].bus)}
                        busStatuses={Object.fromEntries(
                            children.filter(c => c.bus_id && busStatuses[c.bus_id]).map(c => [c.bus_id, busStatuses[c.bus_id]])
                        )}
                    />
                </div>
            )}
        </div>
    )
}

function InfoBox({ label, value }) {
    return (
        <div className="bg-neutral-950/50 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-white">{value || '—'}</p>
        </div>
    )
}
