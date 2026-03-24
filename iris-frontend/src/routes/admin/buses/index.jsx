import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Bus, MapPin, Clock, Hash, CheckCircle2, XCircle, Loader2, RefreshCw, Search } from 'lucide-react'
import { api, fetchJson } from '../../../lib/api'
import { useAuth } from '../../../contexts/AuthContext'

export const Route = createFileRoute('/admin/buses/')({
    component: BusesPage,
})

function BusesPage() {
    const navigate = useNavigate()
    const [buses, setBuses] = useState([])
    const [busStatuses, setBusStatuses] = useState({})
    const [loading, setLoading] = useState(true)
    const [showBusModal, setShowBusModal] = useState(false)
    const [busSearchQuery, setBusSearchQuery] = useState('')
    const [newBus, setNewBus] = useState({ bus_number: '', route_name: '', capacity: 40, driver_name: '', driver_contact: '' })
    const [busTab, setBusTab] = useState('live') // 'live' | 'history'
    const [autoRefreshInterval, setAutoRefreshInterval] = useState(5000) // ms, 0 means off
    const [refreshProgress, setRefreshProgress] = useState(100) // 0-100%
    const { token } = useAuth()

    // ─── Load History Logs ──────────────────────────
    const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0])
    const [selectedHistoryBus, setSelectedHistoryBus] = useState('')
    const [historyLogs, setHistoryLogs] = useState([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    useEffect(() => {
        const loadBuses = async () => {
            try {
                const data = await fetchJson(api.buses())
                setBuses(data || [])
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        loadBuses()
    }, [])

    const loadAllBusStatuses = async (busList) => {
        await Promise.all(busList.map(async bus => {
            try {
                const data = await fetchJson(api.busStatus(bus.id))
                setBusStatuses(prev => ({ ...prev, [bus.id]: data }))
            } catch {
                setBusStatuses(prev => ({ ...prev, [bus.id]: null }))
            }
        }))
    }

    useEffect(() => {
        if (buses.length > 0) loadAllBusStatuses(buses)
    }, [buses])

    // Auto-refresh for live tracking
    useEffect(() => {
        if (busTab !== 'live' || buses.length === 0 || autoRefreshInterval <= 0) {
            setRefreshProgress(100)
            return
        }

        const updateRate = 100 // ms
        const totalSteps = autoRefreshInterval / updateRate
        let currentStep = 0

        setRefreshProgress(100)

        const id = setInterval(() => {
            currentStep++
            setRefreshProgress(Math.max(0, 100 - (currentStep / totalSteps) * 100))

            if (currentStep >= totalSteps) {
                loadAllBusStatuses(buses)
                currentStep = 0
                setRefreshProgress(100)
            }
        }, updateRate)

        return () => clearInterval(id)
    }, [busTab, buses, autoRefreshInterval])

    const loadHistoryLogs = async (busId, date) => {
        if (!busId) return
        setLoadingHistory(true)
        try {
            const start = new Date(date)
            start.setHours(0, 0, 0, 0)
            const end = new Date(date)
            end.setHours(23, 59, 59, 999)

            const [locations, attendance] = await Promise.all([
                fetchJson(api.busLocationHistory(busId, start.toISOString(), end.toISOString())).catch(() => []),
                fetchJson(api.busAttendance(busId)).catch(() => [])
            ])

            const dateStr = start.toDateString()
            const filteredAttendance = attendance.filter(a => new Date(a.timestamp).toDateString() === dateStr)

            const combinedLogs = [
                ...locations.map(l => ({ ...l, type: 'location', timestamp: l.timestamp })),
                ...filteredAttendance.map(a => ({ ...a, type: 'attendance', timestamp: a.timestamp }))
            ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

            setHistoryLogs(combinedLogs)
        } catch (err) {
            console.error('Failed to load history logs:', err)
            setHistoryLogs([])
        } finally {
            setLoadingHistory(false)
        }
    }

    useEffect(() => {
        if (busTab === 'history') {
            loadHistoryLogs(selectedHistoryBus, historyDate)
        }
    }, [busTab, selectedHistoryBus, historyDate])

    const handleCreateBus = async (e) => {
        e.preventDefault()
        try {
            const res = await fetchJson(api.buses(), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify(newBus)
            })
            setBuses([...buses, res])
            setShowBusModal(false)
            setNewBus({ bus_number: '', route_name: '', capacity: 40, driver_name: '', driver_contact: '' })
        } catch (err) {
            alert('Failed to create bus: ' + err.message)
        }
    }

    const handleDeleteBus = async (busId) => {
        if (!confirm('Are you sure you want to delete this bus?')) return
        try {
            await fetchJson(api.deleteBus(busId), {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
            setBuses(buses.filter(b => b.id !== busId))
        } catch (err) {
            alert('Failed to delete bus: ' + err.message)
        }
    }

    const filteredBuses = buses.filter(bus => 
        bus.bus_number?.toLowerCase().includes(busSearchQuery.toLowerCase()) ||
        bus.route_name?.toLowerCase().includes(busSearchQuery.toLowerCase()) ||
        bus.driver_name?.toLowerCase().includes(busSearchQuery.toLowerCase()) ||
        bus.id?.toLowerCase().includes(busSearchQuery.toLowerCase())
    )

    if (loading) {
        return <div className="py-12 flex justify-center"><Loader2 size={32} className="text-teal-500 animate-spin" /></div>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-2 mb-2 md:mb-0">
                <div className="flex gap-3 md:gap-4 overflow-x-auto">
                    <h2 className={`text-[13px] md:text-xl font-bold flex items-center gap-1 md:gap-2 cursor-pointer transition-colors whitespace-nowrap ${busTab === 'live' ? 'text-teal-400' : 'text-neutral-500 hover:text-neutral-300'}`} onClick={() => setBusTab('live')}>
                        <MapPin className="w-4 h-4 md:w-5 md:h-5" /> Live Tracking
                    </h2>
                    <h2 className={`text-[13px] md:text-xl font-bold flex items-center gap-1 md:gap-2 cursor-pointer transition-colors whitespace-nowrap ${busTab === 'history' ? 'text-teal-400' : 'text-neutral-500 hover:text-neutral-300'}`} onClick={() => setBusTab('history')}>
                        <Clock className="w-4 h-4 md:w-5 md:h-5" /> Route History
                    </h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {busTab === 'live' && (
                        <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-lg p-1 pr-1.5 shadow-inner">
                            <div className="flex flex-col justify-center px-1">
                                <select
                                    value={autoRefreshInterval}
                                    onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                                    className="bg-transparent text-neutral-300 font-medium text-xs outline-none cursor-pointer appearance-none"
                                    title="Auto-refresh interval"
                                >
                                    <option value={0}>Auto: Off</option>
                                    <option value={5000}>Auto: 5s</option>
                                    <option value={10000}>Auto: 10s</option>
                                    <option value={30000}>Auto: 30s</option>
                                </select>
                                {autoRefreshInterval > 0 && (
                                    <div className="w-16 h-1 mt-0.5 bg-neutral-800 rounded-full overflow-hidden self-center">
                                        <div
                                            className="h-full bg-teal-500 rounded-full transition-all duration-100 ease-linear"
                                            style={{ width: `${refreshProgress}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setRefreshProgress(100)
                                    loadAllBusStatuses(buses)
                                }}
                                className="bg-neutral-800 text-neutral-300 font-medium px-2.5 py-1.5 rounded border border-neutral-700 hover:bg-neutral-700 hover:text-white transition-colors cursor-pointer text-[10px] flex items-center gap-1"
                                title="Force refresh now"
                            >
                                <RefreshCw size={12} className={refreshProgress < 100 ? "" : "animate-spin-once"} /> Refresh
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => setShowBusModal(true)}
                        className="bg-teal-500/20 text-teal-400 font-medium px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-teal-500/50 hover:bg-teal-500/30 transition-colors cursor-pointer text-xs md:text-sm"
                    >
                        + Add Bus
                    </button>
                </div>
            </div>
            {busTab === 'live' ? (
                <>
                    <div className="relative w-full md:w-96 mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search by bus number, route, or driver..."
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 pl-10 pr-4 text-white placeholder:text-neutral-500 focus:outline-none focus:border-teal-500 transition-colors"
                            value={busSearchQuery}
                            onChange={(e) => setBusSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Bus creation modal */}
                    {showBusModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 min-w-[320px]">
                            <form onSubmit={handleCreateBus} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                                <h3 className="text-xl font-bold text-white mb-4">Register New Bus</h3>
                                <div className="space-y-4">
                                    <input required placeholder="Bus Number (e.g. DL-11-2093)" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500" value={newBus.bus_number} onChange={e => setNewBus({ ...newBus, bus_number: e.target.value })} />
                                    <input placeholder="Route Name (e.g. City Center → School)" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500" value={newBus.route_name} onChange={e => setNewBus({ ...newBus, route_name: e.target.value })} />
                                    <input type="number" placeholder="Capacity" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500" value={newBus.capacity} onChange={e => setNewBus({ ...newBus, capacity: parseInt(e.target.value) || 40 })} />
                                    <input placeholder="Driver Name" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500" value={newBus.driver_name} onChange={e => setNewBus({ ...newBus, driver_name: e.target.value })} />
                                    <input placeholder="Driver Contact" className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500" value={newBus.driver_contact} onChange={e => setNewBus({ ...newBus, driver_contact: e.target.value })} />
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setShowBusModal(false)} className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white transition-colors cursor-pointer">Cancel</button>
                                    <button type="submit" className="bg-teal-500 hover:bg-teal-400 text-black font-bold px-6 py-2 rounded-xl transition-colors cursor-pointer">Register Bus</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {filteredBuses.length === 0 ? (
                        <EmptyState 
                            icon={<Search size={40} />} 
                            message={busSearchQuery ? `No matches found for "${busSearchQuery}"` : "No buses registered yet"} 
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredBuses.map(bus => {
                                const status = busStatuses[bus.id]
                                return (
                                    <div
                                        key={bus.id}
                                        className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 hover:border-teal-500/50 hover:bg-neutral-900 transition-all cursor-pointer group"
                                        onClick={() => navigate({ to: `/admin/buses/${bus.id}` })}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2.5 rounded-xl ${bus.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-500 border border-neutral-700'}`}>
                                                    <Bus size={22} />
                                                </div>
                                                <div>
                                                    <h3 className="text-white font-bold text-lg">{bus.bus_number}</h3>
                                                    <p className="text-xs text-neutral-500">{bus.route_name || 'No route assigned'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border ${(status?.bus?.state || bus.state) === 'on_the_way'
                                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                    : (status?.bus?.state || bus.state) === 'arrived'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    }`}>
                                                    {(status?.bus?.state || bus.state) === 'on_the_way' ? 'Bus is on the way' : (status?.bus?.state || bus.state) === 'arrived' ? 'Bus is arrived' : 'Bus is stopped'}
                                                </span>
                                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${bus.is_active
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : 'bg-neutral-800 text-neutral-500 border-neutral-700'}`}>
                                                    {bus.is_active ? 'Bus Active' : 'Bus Inactive'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteBus(bus.id); }}
                                                className="ml-2 text-red-500/70 hover:text-red-400 bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                                                title="Remove Bus"
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <DetailItem label="Driver" value={bus.driver_name} small />
                                            <DetailItem label="Driver Phone" value={bus.driver_contact} small />
                                            <DetailItem label="Capacity" value={bus.capacity} small />
                                            <DetailItem label="Students On Board" value={status?.students_present ?? '—'} small />
                                        </div>

                                        {status?.current_location ? (
                                            <div className="mt-4 pt-3 border-t border-neutral-800">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <MapPin size={12} className="text-teal-400" />
                                                        <span className="text-neutral-400">
                                                            {status.current_location.latitude.toFixed(4)}, {status.current_location.longitude.toFixed(4)}
                                                        </span>
                                                        <span className="text-neutral-600 ml-auto">
                                                            {status.is_stopped ? '⏸ Stopped' : `🚌 ${status.current_location.speed?.toFixed(1)} km/h`}
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                                        <div className={`h-full ${status.is_stopped ? 'bg-amber-500' : 'bg-emerald-500'} w-full`}></div>
                                                    </div>
                                                    <p className="text-xs font-medium text-neutral-300 text-right mt-1 pt-1 border-t border-neutral-800/50">
                                                        <span className="text-neutral-500 font-normal">Last Update:</span> {new Date(status.current_location.timestamp).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-4 pt-3 border-t border-neutral-800 text-center">
                                                <p className="text-xs text-neutral-600 italic">No live location data available</p>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                        </div>
                    )}
                </>
            ) : (
                <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6">
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex-1">
                            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Select Bus</label>
                            <select
                                value={selectedHistoryBus}
                                onChange={(e) => setSelectedHistoryBus(e.target.value)}
                                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:border-teal-500 transition-colors"
                            >
                                <option value="">-- Choose a Bus --</option>
                                {buses.map(b => (
                                    <option key={b.id} value={b.id}>{b.bus_number}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Date</label>
                            <input
                                type="date"
                                value={historyDate}
                                onChange={(e) => setHistoryDate(e.target.value)}
                                className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:border-teal-500 transition-colors"
                            />
                        </div>
                    </div>

                    {loadingHistory ? (
                        <div className="py-12 flex justify-center">
                            <Loader2 className="animate-spin text-teal-500" size={32} />
                        </div>
                    ) : !selectedHistoryBus ? (
                        <EmptyState icon={<Bus size={32} />} message="Select a bus to view history" />
                    ) : historyLogs.length === 0 ? (
                        <EmptyState icon={<Hash size={32} />} message="No data recorded for this date" />
                    ) : (
                        <>

                            <div className="relative pl-6 space-y-4 before:absolute before:inset-0 before:ml-[11px] before:w-px before:bg-neutral-800 z-0">
                                {historyLogs.map((log, idx) => (
                                    <div key={idx} className="relative z-10">
                                        {log.type === 'location' ? (
                                            <div className="flex gap-4">
                                                <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-1 shadow-[0_0_0_4px_rgba(23,23,23,0.6)]">
                                                    <MapPin size={12} />
                                                </div>
                                                <div className="flex-1 bg-neutral-950/50 border border-neutral-800/50 rounded-xl p-3">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-sm font-medium text-white">Location Update</span>
                                                        <span className="text-xs text-neutral-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <p className="text-xs text-neutral-400 font-mono">
                                                            {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}<br />
                                                            <span className="text-[10px] text-neutral-500 mt-1 inline-block">
                                                                {log.speed?.toFixed(1) || 0} km/h {log.is_stopped && '(Stopped)'}
                                                            </span>
                                                        </p>
                                                        <a
                                                            href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center justify-center gap-1.5 text-[10px] font-semibold bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border border-teal-500/20 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                                                        >
                                                            Open in Maps ↗
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-4">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-[0_0_0_4px_rgba(23,23,23,0.6)] ${log.status === 'present_in_bus' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                                                    {log.status === 'present_in_bus' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                </div>
                                                <div className="flex-1 bg-neutral-950/50 border border-neutral-800/50 rounded-xl p-3">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-sm font-medium text-white">Student {log.status === 'present_in_bus' ? 'Boarded' : 'Exited'}</span>
                                                        <span className="text-xs text-neutral-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                    </div>
                                                    <p className="text-xs text-neutral-400">
                                                        Student ID: #{log.student_id} marked as {log.status.replace(/_/g, ' ')}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

function DetailItem({ label, value, small }) {
    return (
        <div>
            <p className={`text-neutral-500 ${small ? 'text-[10px]' : 'text-[11px]'} uppercase tracking-wider mb-0.5`}>{label}</p>
            <p className={`text-neutral-200 ${small ? 'text-xs' : 'text-sm'} font-medium`}>{value || '—'}</p>
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
