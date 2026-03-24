import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { LayoutDashboard, Users, Bus, ScanFace, UserCheck, Loader2 } from 'lucide-react'
import { api, fetchJson } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

export const Route = createFileRoute('/admin/')({
    component: AdminOverview,
})

function AdminOverview() {
    const { token } = useAuth()
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await fetchJson(api.adminStats(), { headers: { Authorization: `Bearer ${token}` } })
                setStats(data)
            } catch (err) {
                console.error('Failed to load stats:', err)
            } finally {
                setLoading(false)
            }
        }
        loadStats()
    }, [])

    return (
        <div className="space-y-6">
            <header className="mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-400">
                        <LayoutDashboard size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                            Overview
                        </h1>
                        <p className="text-neutral-500 text-sm mt-0.5">High-level system statistics</p>
                    </div>
                </div>
            </header>

            {loading ? (
                <div className="py-12 flex justify-center">
                    <Loader2 size={40} className="text-teal-500 animate-spin" />
                </div>
            ) : (
                stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <StatCard icon={<Users size={20} />} label="Students" value={stats.total_students} color="teal" />
                        <StatCard icon={<ScanFace size={20} />} label="Face Records" value={stats.total_landmarks} color="purple" />
                        <StatCard icon={<Bus size={20} />} label="Buses" value={stats.total_buses} color="blue" />
                        <StatCard icon={<UserCheck size={20} />} label="On Bus Now" value={stats.students_on_bus} color="emerald" />
                    </div>
                )
            )}
        </div>
    )
}

function StatCard({ icon, label, value, color }) {
    const colorMap = {
        teal: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
        purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
        blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    }
    return (
        <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg border ${colorMap[color]}`}>{icon}</div>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-neutral-500 mt-1">{label}</p>
        </div>
    )
}
