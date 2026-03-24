import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import {
    Clock, User, AlertCircle, Loader2, CheckCircle2, Circle,
    X, Bus, MapPin, LogIn, LogOut, Calendar
} from 'lucide-react'
import { AttendanceCalendar } from '../../components/admin/AttendanceCalendar'
import { api, fetchJson } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

export const Route = createFileRoute('/parent/attendance')({
    component: ParentAttendance,
})

/* ─── Helpers ─────────────────────────────────────────── */

// Get all days in a month as an array of Date objects

// Format time from ISO string → "08:32 AM"
function formatTime(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

// toDateKey: "2026-03-04"
function toDateKey(d) {
    const dt = new Date(d)
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/* ─── Main Component ──────────────────────────────────── */

function ParentAttendance() {
    const { token } = useAuth()

    // ── Data state ──
    const [children, setChildren] = useState([])
    const [selectedChild, setSelectedChild] = useState(null)
    const [attendanceLog, setAttendanceLog] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // ── Calendar state ──
    const today = new Date()

    // ── Detail modal state ──
    const [selectedDate, setSelectedDate] = useState(null)  // Date object
    const [detailRecords, setDetailRecords] = useState([])  // records for that day
    const [locationHistory, setLocationHistory] = useState([])
    const [loadingDetail, setLoadingDetail] = useState(false)

    /* ── Fetch children ── */
    useEffect(() => {
        const fetchChildren = async () => {
            if (!token) return
            try {
                const data = await fetchJson(api.myProfile(), {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setChildren(data)
                if (data.length > 0) setSelectedChild(data[0])
            } catch (err) {
                console.error('Failed to fetch children:', err)
                setError("Failed to load your children's profiles.")
            } finally {
                setLoading(false)
            }
        }
        fetchChildren()
    }, [token])

    /* ── Fetch attendance for selected child ── */
    useEffect(() => {
        const fetchAttendance = async () => {
            if (!token || !selectedChild) return
            setLoading(true)
            try {
                const logs = await fetchJson(api.studentAttendance(selectedChild.id), {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setAttendanceLog(logs)
            } catch (err) {
                console.error('Failed to fetch attendance:', err)
                setError('Failed to load attendance records.')
            } finally {
                setLoading(false)
            }
        }
        fetchAttendance()
    }, [token, selectedChild])

    /* ── Build a map: dateKey → [records] ── */
    const attendanceByDate = useMemo(() => {
        const map = {}
        attendanceLog.forEach(rec => {
            const key = toDateKey(rec.timestamp)
            if (!map[key]) map[key] = []
            map[key].push(rec)
        })
        return map
    }, [attendanceLog])

    /* ── Open day detail ── */
    const openDayDetail = async (date, records) => {
        setSelectedDate(date)
        setDetailRecords(records || [])
        setLocationHistory([])

        // Try to fetch bus location history for that day
        if (records && records.length > 0 && selectedChild?.bus_id) {
            setLoadingDetail(true)
            try {
                const dayStart = new Date(date)
                dayStart.setHours(0, 0, 0, 0)
                const dayEnd = new Date(date)
                dayEnd.setHours(23, 59, 59, 999)
                const locs = await fetchJson(
                    api.busLocationHistory(selectedChild.bus_id, dayStart.toISOString(), dayEnd.toISOString()),
                    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                )
                setLocationHistory(locs || [])
            } catch {
                setLocationHistory([])
            } finally {
                setLoadingDetail(false)
            }
        }
    }

    /* ── Loading state ── */
    if (loading && children.length === 0) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-emerald-400" />
                <p className="text-neutral-400 ml-3">Loading...</p>
            </div>
        )
    }

    /* ── No children state ── */
    if (children.length === 0 && !loading && !error) {
        return (
            <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-10 text-center flex flex-col items-center">
                <User size={48} className="text-neutral-600 mb-4" />
                <p className="text-xl font-medium text-white mb-2">No Children Linked</p>
                <p className="text-neutral-400 text-sm max-w-md mx-auto">
                    Your account hasn't been linked to any student profiles yet. Please contact the school administrator.
                </p>
            </div>
        )
    }

    const todayKey = toDateKey(today)
    const todayPresent = !!attendanceByDate[todayKey]

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Calendar size={22} className="text-emerald-400" />
                    Attendance Calendar
                </h2>
                <p className="text-neutral-500 text-sm mt-0.5">Track your children's daily bus attendance</p>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500">
                    <AlertCircle size={20} />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* ── Student filter (only when > 1 child) ── */}
            {children.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {children.map(child => {
                        const isActive = selectedChild?.id === child.id
                        return (
                            <button
                                key={child.id}
                                onClick={() => setSelectedChild(child)}
                                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all
                                    ${isActive
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                        : 'bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                                    }`}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                    ${isActive ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-neutral-500'}`}>
                                    {child.name.charAt(0).toUpperCase()}
                                </div>
                                {child.name}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* ── Today's status bar ── */}
            <div className={`p-3 sm:p-4 rounded-xl border flex items-center gap-3
                ${todayPresent
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-neutral-900/40 border-neutral-800'
                }`}>
                {todayPresent ? (
                    <>
                        <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-white font-medium text-sm truncate">{selectedChild?.name} — Present today</p>
                            <p className="text-xs text-neutral-500">
                                Scanned at {formatTime(attendanceByDate[todayKey]?.[0]?.timestamp)}
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <Circle size={20} className="text-neutral-600 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-neutral-400 font-medium text-sm truncate">{selectedChild?.name} — Not marked yet</p>
                            <p className="text-xs text-neutral-600">Will update once scanned</p>
                        </div>
                    </>
                )}
            </div>

            {/* ── Component Calendar ── */}
            <AttendanceCalendar
                allRecords={attendanceLog}
                onDateClick={(date) => {
                    const key = toDateKey(date)
                    const records = attendanceByDate[key] || []
                    openDayDetail(date, records)
                }}
            />

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{Object.keys(attendanceByDate).length}</p>
                    <p className="text-xs text-neutral-500 mt-1">Total Days Present</p>
                </div>
                <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{attendanceLog.length}</p>
                    <p className="text-xs text-neutral-500 mt-1">Total Scans</p>
                </div>
            </div>

            {/* ── Day Detail Modal ── */}
            {selectedDate && (
                <DayDetailModal
                    date={selectedDate}
                    records={detailRecords}
                    student={selectedChild}
                    locationHistory={locationHistory}
                    loadingDetail={loadingDetail}
                    onClose={() => setSelectedDate(null)}
                />
            )}
        </div>
    )
}


/* ─── Day Detail Modal ────────────────────────────────── */

function DayDetailModal({ date, records, student, locationHistory, loadingDetail, onClose }) {
    const dayStr = date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    const entryRec = records.find(r => r.status === 'present_in_bus')
    const exitRec = records.find(r => r.status === 'exited_from_bus')

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal panel */}
            <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-t-2xl sm:rounded-2xl shadow-2xl z-10">
                {/* Drag handle (mobile) */}
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-neutral-700" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                    <div>
                        <h3 className="text-white font-bold text-lg">{dayStr}</h3>
                        <p className="text-neutral-500 text-xs mt-0.5">Attendance details for {student?.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-5">
                    {/* Student info */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
                            {student?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                            <p className="text-white font-semibold">{student?.name}</p>
                            <p className="text-neutral-500 text-xs">{student?.roll_number} · {student?.department || 'Student'}</p>
                        </div>
                    </div>

                    {/* Attendance events */}
                    {records.length === 0 ? (
                        <div className="text-center py-8 text-neutral-600">
                            <Circle size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No attendance recorded on this day</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Timeline</h4>

                            {/* Entry event */}
                            {entryRec && (
                                <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4">
                                    <div className="p-2 bg-emerald-500/15 rounded-lg text-emerald-400">
                                        <LogIn size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-medium text-sm">Entered Bus</p>
                                        <p className="text-neutral-500 text-xs">Bus #{entryRec.bus_id}</p>
                                    </div>
                                    <p className="text-emerald-400 font-mono text-sm font-medium">{formatTime(entryRec.timestamp)}</p>
                                </div>
                            )}

                            {/* Exit event */}
                            {exitRec && (
                                <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
                                    <div className="p-2 bg-amber-500/15 rounded-lg text-amber-400">
                                        <LogOut size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-medium text-sm">Exited Bus</p>
                                        <p className="text-neutral-500 text-xs">Bus #{exitRec.bus_id}</p>
                                    </div>
                                    <p className="text-amber-400 font-mono text-sm font-medium">{formatTime(exitRec.timestamp)}</p>
                                </div>
                            )}

                            {/* Duration if both present */}
                            {entryRec && exitRec && (
                                <div className="bg-neutral-800/50 rounded-xl px-4 py-3 flex items-center justify-between">
                                    <span className="text-neutral-500 text-xs">Duration on bus</span>
                                    <span className="text-white text-sm font-medium">
                                        {(() => {
                                            const mins = Math.round((new Date(exitRec.timestamp) - new Date(entryRec.timestamp)) / 60000)
                                            if (mins < 60) return `${mins} min`
                                            return `${Math.floor(mins / 60)}h ${mins % 60}m`
                                        })()}
                                    </span>
                                </div>
                            )}

                            {/* All raw records that don't match entry/exit */}
                            {records.filter(r => r !== entryRec && r !== exitRec).map(rec => (
                                <div key={rec.id} className="flex items-center gap-3 bg-neutral-800/30 border border-neutral-800 rounded-xl p-4">
                                    <div className="p-2 bg-neutral-700/50 rounded-lg text-neutral-400">
                                        <Clock size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-medium text-sm capitalize">
                                            {rec.status.replace(/_/g, ' ')}
                                        </p>
                                        <p className="text-neutral-500 text-xs">Bus #{rec.bus_id}</p>
                                    </div>
                                    <p className="text-neutral-300 font-mono text-sm">{formatTime(rec.timestamp)}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Bus location history */}
                    <div>
                        <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <MapPin size={14} />
                            Bus Location History
                        </h4>

                        {loadingDetail && (
                            <div className="flex justify-center py-6">
                                <Loader2 size={20} className="animate-spin text-emerald-400" />
                            </div>
                        )}

                        {!loadingDetail && locationHistory.length === 0 && (
                            <div className="text-center py-6 text-neutral-600 text-sm">
                                <MapPin size={24} className="mx-auto mb-2 opacity-40" />
                                No location data available for this day
                            </div>
                        )}

                        {!loadingDetail && locationHistory.length > 0 && (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {locationHistory.slice(0, 20).map((loc, i) => (
                                    <div key={loc.id || i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-800/40 rounded-xl px-3 py-3 border border-neutral-800/50">
                                        <div className="flex items-center gap-3 w-full">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${loc.is_stopped ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-white font-mono truncate">
                                                    {loc.latitude?.toFixed(5)}, {loc.longitude?.toFixed(5)}
                                                </p>
                                                <p className="text-[10px] text-neutral-500">
                                                    {loc.speed > 0 ? `${loc.speed.toFixed(1)} km/h` : 'Stopped'} • {formatTime(loc.timestamp)}
                                                </p>
                                            </div>
                                            {/* Open in maps button */}
                                            <a
                                                href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="shrink-0 flex items-center justify-center gap-1.5 text-[10px] font-semibold bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border border-teal-500/20 px-2.5 py-1.5 rounded-lg transition-colors"
                                            >
                                                Open in Maps ↗
                                            </a>
                                        </div>
                                    </div>
                                ))}
                                {locationHistory.length > 20 && (
                                    <p className="text-center text-xs text-neutral-600 py-1">
                                        +{locationHistory.length - 20} more points
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
