import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
    Users, ScanFace, Loader2, ChevronLeft, ChevronRight, Eye, Search
} from 'lucide-react'
import { api, fetchJson } from '../../../lib/api'
import { useAuth } from '../../../contexts/AuthContext'

export const Route = createFileRoute('/admin/students/')({
    component: StudentsPage,
})

function StudentsPage() {
    const { token } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [students, setStudents] = useState([])
    const [registeredFaceIds, setRegisteredFaceIds] = useState(new Set())
    const [searchQuery, setSearchQuery] = useState('')

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    useEffect(() => {
        const loadStudents = async () => {
            try {
                const headers = token ? { Authorization: `Bearer ${token}` } : {}
                const [studentsData, encodings] = await Promise.all([
                    fetchJson(api.students(), { headers }),
                    fetchJson(api.faceEncodings(), { headers }).catch(() => []),
                ])
                setStudents(studentsData || [])
                setRegisteredFaceIds(new Set(encodings.map(e => e.student_id)))
            } catch (err) {
                console.error('Failed to load students:', err)
            } finally {
                setLoading(false)
            }
        }
        loadStudents()
    }, [token])

    const goToDetail = (studentId, e) => {
        e.stopPropagation()
        navigate({ to: `/admin/students/${studentId}` })
    }

    // Reset to page 1 when searching
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery])

    if (loading) {
        return <div className="py-12 flex justify-center"><Loader2 size={32} className="text-teal-500 animate-spin" /></div>
    }

    const filteredStudents = students.filter(student => 
        student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.roll_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.id?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const currentStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage)

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-2">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, roll no, or ID..."
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-neutral-500 focus:outline-none focus:border-teal-500 transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="text-sm text-neutral-500">
                    Total: <span className="text-white font-medium">{filteredStudents.length}</span> {filteredStudents.length === 1 ? 'student' : 'students'}
                </div>
            </div>

            {filteredStudents.length === 0 ? (
                <EmptyState 
                    icon={<Search size={40} />} 
                    message={searchQuery ? `No matches found for "${searchQuery}"` : "No students registered yet"} 
                />
            ) : (
                <div className="grid grid-cols-1 gap-4">
                {/* Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    <div className="col-span-4">Student</div>
                    <div className="col-span-2">Roll Number</div>
                    <div className="col-span-2">Department</div>
                    <div className="col-span-3">Parent</div>
                    <div className="col-span-1 text-right">Action</div>
                </div>

                {currentStudents.map(student => (
                    <div
                        key={student.id}
                        className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-xl px-6 py-4 hover:border-teal-500/50 hover:bg-neutral-900 transition-all cursor-pointer group"
                        onClick={(e) => goToDetail(student.id, e)}
                    >
                        {/* Mobile layout */}
                        <div className="md:hidden space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-sm">
                                        {student.name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{student.name}</p>
                                        <p className="text-xs text-neutral-500">{student.roll_number || "—"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaceBadge hasLandmarks={registeredFaceIds.has(student.id)} />
                                    <Eye size={16} className="text-neutral-500" />
                                </div>
                            </div>
                        </div>

                        {/* Desktop layout */}
                        <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-4 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-sm shrink-0 group-hover:bg-teal-500 text-white transition-colors border-none group-hover:shadow-[0_0_15px_rgba(20,184,166,0.3)]">
                                    {student.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-white font-medium text-sm truncate">{student.name}</p>
                                    <p className="text-xs text-neutral-500 truncate">{student.address || "—"}</p>
                                </div>
                            </div>
                            <div className="col-span-2 text-sm text-neutral-300 font-mono">{student.roll_number || "—"}</div>
                            <div className="col-span-2 text-sm text-neutral-400">{student.department || "—"}</div>
                            <div className="col-span-3 text-sm text-neutral-400">
                                {student.parent_contact || student.extra_info?.parent_name || '—'}
                            </div>
                            <div className="col-span-1 flex justify-end items-center gap-3">
                                <FaceBadge hasLandmarks={registeredFaceIds.has(student.id)} />
                                <div className="p-1.5 text-neutral-500 group-hover:text-teal-400 group-hover:bg-teal-500/10 rounded-lg transition-colors">
                                    <Eye size={16} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4 border-t border-neutral-800/50 mt-4">
                    <p className="text-sm text-neutral-400">
                        Showing <span className="text-white font-medium">{startIndex + 1}</span> to <span className="text-white font-medium">{Math.min(startIndex + itemsPerPage, filteredStudents.length)}</span> of <span className="text-white font-medium">{filteredStudents.length}</span> results
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm font-medium pr-3"
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <div className="px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm font-medium min-w-8 text-center">
                            {currentPage}
                        </div>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm font-medium pl-3"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function FaceBadge({ hasLandmarks }) {
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${hasLandmarks
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-neutral-800 text-neutral-500 border-neutral-700'}`}>
            <ScanFace size={10} />
            {hasLandmarks ? 'Registered' : 'None'}
        </span>
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
