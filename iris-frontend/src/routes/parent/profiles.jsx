import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Users, Bus, Phone, BookOpen, MapPin, Loader2, AlertCircle } from 'lucide-react'
import { api, fetchJson } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

export const Route = createFileRoute('/parent/profiles')({
    component: ParentProfiles,
})

function ParentProfiles() {
    const { token } = useAuth()
    const [children, setChildren] = useState([])
    const [buses, setBuses] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const load = async () => {
            try {
                const kids = await fetchJson(api.myProfile(), {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setChildren(kids)

                // Fetch bus info for each unique bus_id
                const uniqueBusIds = [...new Set(kids.filter(k => k.bus_id).map(k => k.bus_id))]
                const busMap = {}
                await Promise.all(
                    uniqueBusIds.map(async id => {
                        try {
                            const bus = await fetchJson(api.bus(id))
                            busMap[id] = bus
                        } catch { }
                    })
                )
                setBuses(busMap)
            } catch (err) {
                setError('Failed to load profiles.')
            } finally {
                setLoading(false)
            }
        }
        if (token) load()
    }, [token])

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-purple-400" /></div>
    }

    if (error) {
        return (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                <AlertCircle size={18} />
                <p className="text-sm">{error}</p>
            </div>
        )
    }

    if (children.length === 0) {
        return (
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-10 text-center text-neutral-500">
                <Users size={48} className="mx-auto mb-4 opacity-30" />
                <p className="font-medium">No children linked to your account.</p>
                <p className="text-sm mt-2">Contact the school admin to link your children.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {children.map(child => {
                const bus = child.bus_id ? buses[child.bus_id] : null
                return (
                    <div key={child.id} className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6">
                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-14 h-14 rounded-full bg-purple-500/10 border-2 border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xl">
                                {child.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">{child.name}</h3>
                                <p className="text-xs text-neutral-500 font-mono">{child.roll_number}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <InfoRow icon={<BookOpen size={14} />} label="Department" value={child.department} />
                            <InfoRow icon={<Phone size={14} />} label="Contact" value={child.contact} />
                            <InfoRow icon={<MapPin size={14} />} label="Address" value={child.address} />
                            <InfoRow
                                icon={<Bus size={14} />}
                                label="Assigned Bus"
                                value={bus
                                    ? `${bus.bus_number}${bus.route_name ? ` – ${bus.route_name}` : ''}`
                                    : child.bus_id ? `Bus #${child.bus_id}` : 'Not assigned'}
                            />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function InfoRow({ icon, label, value }) {
    return (
        <div className="flex items-start gap-2">
            <span className="text-neutral-500 mt-0.5 shrink-0">{icon}</span>
            <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
                <p className="text-neutral-200 font-medium text-sm">{value || '—'}</p>
            </div>
        </div>
    )
}
