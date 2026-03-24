import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Loader2, Users, Search, Calendar, ChevronLeft } from 'lucide-react'
import { api, fetchJson } from '../../../lib/api'
import { useAuth } from '../../../contexts/AuthContext'

export const Route = createFileRoute('/admin/attendance/$date')({
    component: AttendanceByDatePage,
})

function AttendanceByDatePage() {
    const { date } = Route.useParams()
    const navigate = useNavigate()
    const { token } = useAuth()
    
    const [records, setRecords] = useState([])
    const [buses, setBuses] = useState([])
    const [students, setStudents] = useState([])
    const [departments, setDepartments] = useState([])
    
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedDepartment, setSelectedDepartment] = useState('all')
    const [selectedBus, setSelectedBus] = useState('all')
    const [loading, setLoading] = useState(true)

    // Format the date for display (e.g., "March 14, 2026")
    const displayDate = new Date(date).toLocaleDateString(undefined, { 
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
    })

    useEffect(() => {
        const loadData = async () => {
            try {
                const headers = token ? { Authorization: `Bearer ${token}` } : {}

                const [attendanceData, busesData, studentsData, deptsData] = await Promise.all([
                    fetchJson(api.attendanceByDate(date), { headers }).catch(() => []),
                    fetchJson(api.buses()).catch(() => []),
                    fetchJson(api.students(), { headers }).catch(() => []),
                    fetchJson(api.departments(), { headers }).catch(() => []),
                ])

                setRecords(attendanceData)
                setBuses(busesData)
                setStudents(studentsData)
                setDepartments(deptsData || [])
            } catch (err) {
                console.error('Failed to load attendance:', err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [token, date])

    if (loading) {
        return <div className="py-12 flex justify-center"><Loader2 size={32} className="text-teal-500 animate-spin" /></div>
    }

    const filteredRecords = records.filter(rec => {
        const student = students.find(s => s.id === rec.student_id);
        let match = true;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const nameMatch = (student?.name || rec.student_name || '').toLowerCase().includes(q);
            const rollMatch = (student?.roll_number || rec.roll_number || '').toLowerCase().includes(q);
            if (!nameMatch && !rollMatch) match = false;
        }

        if (selectedBus !== 'all' && rec.bus_id !== selectedBus) {
            match = false;
        }

        if (selectedDepartment !== 'all' && student?.department_id !== selectedDepartment) {
            match = false;
        }

        return match;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => navigate({ to: '/admin/attendance' })}
                    className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Calendar size={22} className="text-emerald-500" />
                        Attendance for {displayDate}
                    </h1>
                    <p className="text-neutral-500 text-sm mt-0.5">Showing {filteredRecords.length} record(s)</p>
                </div>
            </div>

            <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-3 mb-5 py-4 border-b border-neutral-800">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name or roll number..."
                            className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3">
                        <select
                            className="bg-neutral-900 border border-neutral-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                        >
                            <option value="all">All Departments</option>
                            {departments.map((d) => (
                                <option key={d.id || d._id} value={d.id || d._id}>{d.name}</option>
                            ))}
                        </select>
                        <select
                            className="bg-neutral-900 border border-neutral-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                            value={selectedBus}
                            onChange={(e) => setSelectedBus(e.target.value)}
                        >
                            <option value="all">All Buses</option>
                            {buses.map((b) => (
                                <option key={b.id} value={b.id}>{b.bus_number}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {filteredRecords.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
                        <Search size={32} className="mb-3 opacity-50" />
                        <p>No attendance records match your filters on this date.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-800 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                    <th className="px-4 py-3 font-medium">Student</th>
                                    <th className="px-4 py-3 font-medium">Roll No</th>
                                    <th className="px-4 py-3 font-medium">Department</th>
                                    <th className="px-4 py-3 font-medium">Bus</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map(rec => {
                                    const student = students.find(s => s.id === rec.student_id)
                                    const isExited = rec.status === 'exited_from_bus'
                                    const busLabel = buses.find(b => b.id === rec.bus_id)?.bus_number || `Bus #${rec.bus_id}`
                                    
                                    return (
                                        <tr key={rec.id} className="border-b border-neutral-800/50 hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isExited ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                        {rec.student_name?.charAt(0)?.toUpperCase() || '#'}
                                                    </div>
                                                    <span className="text-sm font-medium text-white">{rec.student_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-neutral-400">
                                                {student?.roll_number || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-neutral-400">
                                                {departments.find(d => d.id === student?.department_id)?.name || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-neutral-400 font-mono">
                                                {busLabel}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${isExited 
                                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                    {isExited ? <XCircle size={10} /> : <CheckCircle2 size={10} />}
                                                    {isExited ? 'Exited' : 'In Bus'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-neutral-400 text-right font-mono">
                                                {new Date(rec.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
