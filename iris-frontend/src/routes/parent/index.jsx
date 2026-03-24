import { createFileRoute, Link } from '@tanstack/react-router'
import { Users, Bus, Clock } from 'lucide-react'

export const Route = createFileRoute('/parent/')({
    component: ParentDashboard,
})

function ParentDashboard() {
    return (
        <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 text-center text-neutral-400 mt-10">
            <Users size={48} className="mx-auto text-neutral-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Student Information</h3>
            <p>Track your child's bus location, attendance, and profile here.</p>
            <div className="mt-8 flex justify-center gap-4 flex-wrap">
                <Link to="/parent/tracking" className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4 flex flex-col items-center hover:bg-neutral-900 transition-colors">
                    <Bus className="text-blue-400 mb-2" />
                    <span className="text-sm font-medium text-white">Live Tracking</span>
                </Link>
                <Link to="/parent/attendance" className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4 flex flex-col items-center hover:bg-neutral-900 transition-colors">
                    <Clock className="text-emerald-400 mb-2" />
                    <span className="text-sm font-medium text-white">Attendance</span>
                </Link>
                <Link to="/parent/profiles" className="bg-neutral-950/50 border border-neutral-800 rounded-xl p-4 flex flex-col items-center hover:bg-neutral-900 transition-colors">
                    <Users className="text-purple-400 mb-2" />
                    <span className="text-sm font-medium text-white">My Children</span>
                </Link>
            </div>
        </div>
    )
}
