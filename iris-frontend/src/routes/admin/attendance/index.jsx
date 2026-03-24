import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Loader2, ArrowRight, CalendarCheck } from 'lucide-react'
import { AttendanceCalendar } from '../../../components/admin/AttendanceCalendar'
import { api, fetchJson } from '../../../lib/api'

export const Route = createFileRoute('/admin/attendance/')({
    component: AttendancePage,
})

function AttendancePage() {
    const [allRecords, setAllRecords] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            try {
                const busesData = await fetchJson(api.buses()).catch(() => [])

                // Fetch all attendance records per bus
                const allRecs = []
                for (const bus of busesData) {
                    const records = await fetchJson(api.busAttendance(bus.id)).catch(() => [])
                    allRecs.push(...records.map(r => ({ ...r, bus_number: bus.bus_number })))
                }
                allRecs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                setAllRecords(allRecs)
            } catch (err) {
                console.error('Failed to load attendance:', err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    if (loading) {
        return <div className="py-12 flex justify-center"><Loader2 size={32} className="text-teal-500 animate-spin" /></div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                   <h1 className="text-2xl font-bold text-white tracking-tight">Attendance Dashboard</h1>
                   <p className="text-neutral-400 text-sm mt-1">Overview of student attendance history</p>
                </div>
                <Link to="/admin/attendance/today" className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <CalendarCheck size={18} />
                    <span>View Today's Attendance</span>
                    <ArrowRight size={18} />
                </Link>
            </div>

            {/* ── Compact Calendar View Component ── */}
            <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6">
                <div className="mb-5">
                    <h2 className="text-lg font-bold text-white">Attendance History</h2>
                    <p className="text-xs text-neutral-500">Historical logs of all bus attendances.</p>
                </div>
                <AttendanceCalendar allRecords={allRecords} />
            </div>
        </div>
    )
}

