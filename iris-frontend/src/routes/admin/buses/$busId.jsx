import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
    Bus as BusIcon, ArrowLeft, Pencil, MapPin, Loader2, Save, X, Navigation2, Users, FileText, LocateFixed, Target
} from 'lucide-react'
import { api, fetchJson } from '../../../lib/api'
import { useAuth } from '../../../contexts/AuthContext'
import { LiveBusMap } from '../../../components/LiveBusMap'

export const Route = createFileRoute('/admin/buses/$busId')({
    component: BusDetailPage,
})

function BusDetailPage() {
    const { busId } = Route.useParams()
    const navigate = useNavigate()
    const { token } = useAuth()

    const [loading, setLoading] = useState(true)
    const [bus, setBus] = useState(null)
    const [status, setStatus] = useState(null)
    const [passengers, setPassengers] = useState([])

    // Live refresh ticker
    const [refreshTrigger, setRefreshTrigger] = useState(0)

    const [editing, setEditing] = useState(false)
    const [editForm, setEditForm] = useState(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Load static data (Bus info, Passenger List)
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true)
            try {
                const headers = { Authorization: `Bearer ${token}` }
                const [busData, passData] = await Promise.all([
                    fetchJson(api.bus(busId), { headers }),
                    fetchJson(api.busStudents(busId), { headers }).catch(() => [])
                ])
                setBus(busData)
                setEditForm({ ...busData })

                // Fetch student profiles for the passenger records to get names
                const profiles = await fetchJson(api.students(), { headers })
                const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))

                const enrichedPassengers = passData.map(p => ({
                    ...p,
                    student: profileMap[p.student_id] || { name: 'Unknown Student', roll_number: 'N/A' }
                }))
                // Only show people currently physically on the bus
                setPassengers(enrichedPassengers.filter(p => p.status === 'present_in_bus'))
            } catch (err) {
                console.error(err)
                setError('Failed to load bus details')
            } finally {
                setLoading(false)
            }
        }
        loadInitialData()
    }, [busId, token])

    // Load dynamic data (GPS location and status) on an interval
    useEffect(() => {
        const loadStatus = async () => {
            try {
                const data = await fetchJson(api.busStatus(busId))
                setStatus(data)
            } catch (err) {
                console.error('Failed to load bus status', err)
            }
        }

        loadStatus()
        // Auto-refresh every 5 seconds
        const interval = setInterval(() => {
            setRefreshTrigger(prev => prev + 1)
        }, 5000)

        return () => clearInterval(interval)
    }, [busId, refreshTrigger])

    const saveEdit = async () => {
        setSaving(true)
        setError('')
        try {
            const body = {
                bus_number:          editForm.bus_number,
                route_name:          editForm.route_name,
                driver_name:         editForm.driver_name,
                driver_contact:      editForm.driver_contact,
                capacity:            editForm.capacity,
                // Destination geofence — only send a number if the field is actually filled in
                destination_lat:    (editForm.destination_lat != null && editForm.destination_lat !== '') ? Number(editForm.destination_lat) : null,
                destination_lng:    (editForm.destination_lng != null && editForm.destination_lng !== '') ? Number(editForm.destination_lng) : null,
                destination_radius: (editForm.destination_radius != null && editForm.destination_radius !== '') ? Number(editForm.destination_radius) : 100,
                is_active:           editForm.is_active,
            }
            const updated = await fetchJson(api.bus(busId), {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            })
            setBus(updated)
            setEditing(false)
        } catch (err) {
            setError(err.message || 'Failed to save changes')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="py-20 flex justify-center"><Loader2 size={40} className="text-teal-500 animate-spin" /></div>
    if (!bus) return <div className="py-20 text-center text-neutral-500">Bus not found</div>

    // Map requires array formats
    const busesArray = [bus]
    const busStatusesObj = status ? { [bus.id]: status } : {}

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            {/* Header / Nav */}
            <div className="flex items-center justify-between">
                <Link to="/admin/buses" className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-sm font-medium">
                    <ArrowLeft size={16} /> Back to Fleet
                </Link>
                {!editing && (
                    <button onClick={() => setEditing(true)} className="flex items-center gap-2 bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 px-4 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer">
                        <Pencil size={16} /> Edit Bus Details
                    </button>
                )}
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                {/* Left Column - Core Info & Live Map */}
                <div className="md:col-span-2 space-y-6">

                    {/* Main Profile Card */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden relative">
                        <div className="h-24 bg-gradient-to-r from-blue-500/20 to-teal-500/20 border-b border-neutral-800 absolute top-0 w-full" />

                        <div className="p-6 pt-16 relative z-10">
                            <div className="w-24 h-24 rounded-2xl bg-neutral-950 border-4 border-neutral-900 flex items-center justify-center font-bold bg-gradient-to-br from-blue-400 to-teal-500 text-white shadow-xl mb-4">
                                <BusIcon size={40} />
                            </div>

                            {editing ? (
                                <div className="space-y-4 max-w-lg mt-4">
                                    <div className="grid grid-cols-2 gap-4 text-left">
                                        <div className="col-span-2">
                                            <label className="text-xs text-neutral-500 uppercase">Bus Number</label>
                                            <input value={editForm.bus_number || ''} onChange={e => setEditForm({ ...editForm, bus_number: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 mt-1" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs text-neutral-500 uppercase">Route Name</label>
                                            <input value={editForm.route_name || ''} onChange={e => setEditForm({ ...editForm, route_name: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 uppercase">Driver Name</label>
                                            <input value={editForm.driver_name || ''} onChange={e => setEditForm({ ...editForm, driver_name: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 uppercase">Driver Contact</label>
                                            <input value={editForm.driver_contact || ''} onChange={e => setEditForm({ ...editForm, driver_contact: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 mt-1" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-neutral-500 uppercase">Capacity</label>
                                            <input type="number" value={editForm.capacity || ''} onChange={e => setEditForm({ ...editForm, capacity: parseInt(e.target.value) || 0 })} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 mt-1" />
                                        </div>
                                        <div className="col-span-2 flex items-center gap-3 bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 mt-1">
                                            <input 
                                                type="checkbox" 
                                                checked={editForm.is_active ?? true} 
                                                onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })}
                                                className="w-4 h-4 rounded border-neutral-700 text-teal-500 focus:ring-teal-500 bg-neutral-900 cursor-pointer"
                                                id="is_active_toggle"
                                            />
                                            <label htmlFor="is_active_toggle" className="text-sm font-medium text-white cursor-pointer select-none">
                                                Bus Active <span className="text-xs text-neutral-500 font-normal ml-2">(Uncheck to mark bus as inactive)</span>
                                            </label>
                                        </div>

                                        {/* ── Destination Geofence ────────────────────── */}
                                        <div className="col-span-2 mt-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs text-teal-400 uppercase font-semibold flex items-center gap-1.5">
                                                    <Target size={12} /> Destination / Arrival Geofence
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.geolocation?.getCurrentPosition(
                                                            (pos) => setEditForm(f => ({
                                                                ...f,
                                                                destination_lat: pos.coords.latitude.toFixed(6),
                                                                destination_lng: pos.coords.longitude.toFixed(6),
                                                            })),
                                                            (err) => alert('Could not get location: ' + err.message)
                                                        )
                                                    }}
                                                    className="flex items-center gap-1 text-[10px] text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-lg px-2 py-1 hover:bg-teal-500/20 transition-colors cursor-pointer"
                                                >
                                                    <LocateFixed size={11} /> Use My Location
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-neutral-500 mb-3">
                                                When the bus GPS enters this radius, it will auto-mark as Arrived and exit all on-board students.
                                            </p>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-neutral-500 uppercase">Latitude</label>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        placeholder="e.g. 28.6139"
                                                        value={editForm.destination_lat ?? ''}
                                                        onChange={e => setEditForm({ ...editForm, destination_lat: e.target.value })}
                                                        className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 mt-1 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-neutral-500 uppercase">Longitude</label>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        placeholder="e.g. 77.2090"
                                                        value={editForm.destination_lng ?? ''}
                                                        onChange={e => setEditForm({ ...editForm, destination_lng: e.target.value })}
                                                        className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 mt-1 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-neutral-500 uppercase">Radius (m)</label>
                                                    <input
                                                        type="number"
                                                        min="10"
                                                        placeholder="100"
                                                        value={editForm.destination_radius ?? 100}
                                                        onChange={e => setEditForm({ ...editForm, destination_radius: e.target.value })}
                                                        className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white outline-none focus:border-teal-500 mt-1 text-sm"
                                                    />
                                                </div>
                                            </div>
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
                                    <h1 className="text-3xl font-bold text-white mb-1">{bus.bus_number}</h1>
                                    <p className="text-neutral-400 font-mono mb-6">{bus.route_name || 'No Route Assigned'}</p>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 pt-6 border-t border-neutral-800/50">
                                        <InfoItem icon={<FileText size={16} className="text-blue-500" />} label="Driver" value={bus.driver_name} />
                                        <InfoItem icon={<FileText size={16} className="text-blue-500" />} label="Driver Contact" value={bus.driver_contact} />
                                        <InfoItem icon={<Users size={16} className="text-teal-500" />} label="Capacity" value={bus.capacity} />
                                        <InfoItem icon={<Users size={16} className="text-amber-500" />} label="Currently On Board" value={status?.students_present ?? passengers.length} />
                                        <div className="col-span-1 md:col-span-2 flex gap-3">
                                            <div className="mt-0.5"><Target size={16} className={bus.is_active ? "text-emerald-500" : "text-neutral-500"} /></div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-0.5">Status</p>
                                                <p className={`text-sm font-medium ${bus.is_active ? "text-emerald-400" : "text-neutral-400"}`}>{bus.is_active ? 'Bus Active' : 'Bus Inactive'}</p>
                                            </div>
                                        </div>
                                        {/* Destination geofence info */}
                                        <InfoItem
                                            icon={<Target size={16} className={bus.destination_lat ? "text-emerald-500" : "text-neutral-600"} />}
                                            label="Arrival Destination"
                                            value={
                                                bus.destination_lat
                                                    ? `${Number(bus.destination_lat).toFixed(4)}, ${Number(bus.destination_lng).toFixed(4)} (±${bus.destination_radius}m)`
                                                    : 'Not configured'
                                            }
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Live Tracker */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Navigation2 size={18} className="text-teal-400" /> Live Tracking
                            </h2>
                            {status?.current_location && (
                                <span className={`text-xs px-2 py-1 rounded-lg font-medium border ${status.is_stopped ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                                    {status.is_stopped ? '⏸ Stopped' : `🟢 Moving (${status.current_location.speed?.toFixed(1) || 0} km/h)`}
                                </span>
                            )}
                        </div>

                        {status ? (
                            <LiveBusMap
                                buses={busesArray}
                                busStatuses={busStatusesObj}
                                selectedBusId={bus.id}
                            />
                        ) : (
                            <div className="h-[400px] rounded-2xl border border-neutral-800 bg-neutral-950 flex flex-col items-center justify-center text-neutral-500">
                                <MapPin size={40} className="mb-4 opacity-50" />
                                <p>Awaiting GPS Link</p>
                            </div>
                        )}

                        {status?.current_location && (
                            <p className="text-xs text-neutral-500 text-right mt-3">
                                Last updated: {new Date(status.current_location.timestamp).toLocaleTimeString()}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function InfoItem({ icon, label, value, colSpan = 1 }) {
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
