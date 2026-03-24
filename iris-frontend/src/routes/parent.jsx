import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router'
import { useState } from 'react'
import { LayoutDashboard, Users, ClipboardList, Map, Settings, Camera, Menu, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export const Route = createFileRoute('/parent')({
    component: ParentLayout,
})

function ParentLayout() {
    const { user } = useAuth()
    const location = useLocation()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const parentNavItems = [
        { to: '/parent', icon: <LayoutDashboard size={24} />, label: 'Overview', SidebarIcon: <LayoutDashboard size={20} /> },
        { to: '/parent/profiles', icon: <Users size={24} />, label: 'Profiles', SidebarIcon: <Users size={20} /> },
        { to: '/parent/attendance', icon: <ClipboardList size={24} />, label: 'Attendance', SidebarIcon: <ClipboardList size={20} /> },
        { to: '/parent/tracking', icon: <Map size={24} />, label: 'Tracking', SidebarIcon: <Map size={20} /> },
        { to: '/parent/settings', icon: <Settings size={24} />, label: 'Settings', SidebarIcon: <Settings size={20} /> },
    ]

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-neutral-950 text-neutral-50 font-sans">
            {/* Mobile Header */}
            <header className="md:hidden sticky top-0 z-40 bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-800 flex items-center justify-between p-4">
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 -ml-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <Menu size={24} />
                </button>
                <div className="flex items-center gap-2 text-purple-400">
                    <Camera size={20} />
                    <span className="font-bold text-white tracking-tight">Iris<span className="text-purple-400">Sync</span></span>
                </div>
                <div className="w-10"></div> {/* Spacer for centering */}
            </header>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Navigation (Sidebar Desktop & Mobile) */}
            <nav className={`fixed inset-y-0 left-0 z-50 w-64 bg-neutral-900/95 md:bg-neutral-900/50 backdrop-blur-xl border-r border-neutral-800 p-6 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-3 text-purple-400 drop-shadow-md">
                        <Camera size={28} />
                        <h1 className="text-xl font-bold tracking-tight text-white hidden md:block">Iris<span className="text-purple-400">Sync</span></h1>
                        <h1 className="text-xl font-bold tracking-tight text-white md:hidden">Menu</h1>
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="md:hidden p-2 -mr-2 text-neutral-400 hover:text-white rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-col gap-2 grow">
                    {parentNavItems.map(item => (
                        <SidebarItem key={item.to} to={item.to} icon={item.SidebarIcon} label={item.label} onClick={() => setIsMobileMenuOpen(false)} />
                    ))}
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 w-full bg-linear-to-br from-neutral-950 via-neutral-900 to-black md:ml-64 min-h-[calc(100vh-64px)] md:min-h-screen">
                <div className="p-4 md:p-8 max-w-7xl mx-auto pb-12">
                    {/* Header */}
                    {/* <header className="mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                                <Users size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                                    Parent Dashboard
                                </h1>
                                <p className="text-neutral-500 text-sm mt-0.5">Welcome, {user?.full_name || user?.email || 'Parent'}</p>
                            </div>
                        </div>
                    </header> */}

                    <Outlet />
                </div>
            </main>
        </div>
    )
}

function NavItem({ to, icon, label }) {
    return (
        <Link
            to={to}
            className="flex flex-col items-center gap-1 text-neutral-400 hover:text-white transition-colors relative"
            activeProps={{ className: "text-teal-400 font-medium" }}
            activeOptions={to === '/parent' ? { exact: true } : {}}
        >
            {({ isActive }) => (
                <>
                    <div className={`p-1 rounded-full transition-all duration-300 ${isActive ? 'bg-teal-500/20 text-teal-400' : ''}`}>
                        {icon}
                    </div>
                    <span className="text-[10px]">{label}</span>
                    {isActive && (
                        <div className="absolute -bottom-2 h-1 w-1 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]"></div>
                    )}
                </>
            )}
        </Link>
    )
}

function SidebarItem({ to, icon, label, exact, onClick }) {
    return (
        <Link
            to={to}
            onClick={onClick}
            className="group flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-all outline-none"
            activeProps={{ className: "bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium shadow-[0_0_15px_rgba(45,212,191,0.1)]" }}
            activeOptions={to === '/parent' ? { exact: true } : {}}
        >
            {({ isActive }) => (
                <>
                    <div className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]' : 'group-hover:scale-110'}`}>
                        {icon}
                    </div>
                    <span className="text-sm font-medium">{label}</span>
                </>
            )}
        </Link>
    )
}
