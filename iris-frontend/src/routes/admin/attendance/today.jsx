import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { CalendarCheck, Search, Loader2, ArrowLeft } from 'lucide-react'
import { api, fetchJson } from '../../../lib/api'
import { useAuth } from '../../../contexts/AuthContext'

export const Route = createFileRoute('/admin/attendance/today')({
    component: TodayAttendancePage,
})

function TodayAttendancePage() {
    const { token } = useAuth()
    const [todayRecords, setTodayRecords] = useState([])
    const [buses, setBuses] = useState([])
    const [students, setStudents] = useState([])
    const [departments, setDepartments] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedDepartment, setSelectedDepartment] = useState('all')
    const [selectedBus, setSelectedBus] = useState('all')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            try {
                const headers = token ? { Authorization: `Bearer ${token}` } : {}

                // Fetch today's attendance, buses, and students in parallel
                const [todayData, busesData, studentsData, deptsData] = await Promise.all([
                    fetchJson(api.todayAttendance(), { headers }).catch(() => []),
                    fetchJson(api.buses()).catch(() => []),
                    fetchJson(api.students(), { headers }).catch(() => []),
                    fetchJson(api.departments(), { headers }).catch(() => []),
                ])

                setTodayRecords(todayData)
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
    }, [token])

    if (loading) {
        return <div className="py-12 flex justify-center"><Loader2 size={32} className="text-teal-500 animate-spin" /></div>
    }

    const filteredTodayRecords = todayRecords.filter(rec => {
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
            <div className="flex items-center gap-4 mb-4">
                <Link to="/admin/attendance" className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Today's Attendance</h1>
                    <p className="text-neutral-400 text-sm mt-1">Live overview of student check-ins and check-outs for today</p>
                </div>
            </div>

            {/* ── Today's Attendance Summary ── */}
            <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                        <CalendarCheck size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Today's Attendance</h2>
                        <p className="text-xs text-neutral-500">
                            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="ml-auto bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 flex items-center">
                        <span className="text-emerald-400 font-bold text-lg">{todayRecords.length}</span>
                        <span className="text-neutral-500 text-sm ml-1.5 hidden sm:inline">students</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-3 mb-5 py-4 border-t border-b border-neutral-800">
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
                    <div className="flex flex-col sm:flex-row gap-3">
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

                {filteredTodayRecords.length === 0 ? (
                    <p className="text-neutral-600 text-sm text-center py-4">No students found matching your criteria.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-neutral-800/50 text-neutral-400 border-b border-neutral-700/50">
                                <tr>
                                    <th className="px-4 py-3 font-medium rounded-tl-xl text-xs uppercase tracking-wider">Student</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Roll No.</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Bus No.</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Department</th>
                                    <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 font-medium rounded-tr-xl text-xs uppercase tracking-wider text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/50">
                                {filteredTodayRecords.map((rec) => {
                                    const isExited = rec.status === 'exited_from_bus'
                                    const studentData = students.find(s => s.id === rec.student_id)
                                    const busData = buses.find(b => b.id === rec.bus_id)
                                    const deptData = departments.find(d => (d.id || d._id) === studentData?.department_id)

                                    return (
                                        <tr key={rec.id} className="hover:bg-neutral-800/30 transition-colors group">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isExited ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                                        {rec.student_name?.charAt(0)?.toUpperCase() || '#'}
                                                    </div>
                                                    <div className="font-medium text-white group-hover:text-teal-400 transition-colors">
                                                        {rec.student_name}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-neutral-300">
                                                {studentData?.roll_number || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-neutral-300">
                                                {busData?.bus_number || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-neutral-300">
                                                {deptData?.name || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${isExited ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isExited ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                                                    {isExited ? 'Exited Bus' : 'In Bus'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-neutral-400">
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
