import { Outlet, createRootRoute, useLocation, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'

export const Route = createRootRoute({
    component: () => {
        const location = useLocation()
        const navigate = useNavigate()
        const { user, loading } = useAuth()
        const role = user?.role
        const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'

        useEffect(() => {
            if (loading) return;

            if (!user && !isAuthPage) {
                navigate({ to: '/login', replace: true })
                return
            }

            if (user && !isAuthPage) {
                if (role === 'scanner' && !['/scanner', '/scanner/settings'].includes(location.pathname)) {
                    navigate({ to: '/scanner', replace: true })
                } else if (role === 'parent' && !location.pathname.startsWith('/parent')) {
                    navigate({ to: '/parent', replace: true })
                } else if (role === 'admin' && !location.pathname.startsWith('/admin')) {
                    navigate({ to: '/admin', replace: true })
                }
            }
        }, [user, loading, isAuthPage, location.pathname, navigate, role])

        if (loading) {
            return (
                <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                    <Loader2 size={40} className="text-teal-500 animate-spin" />
                </div>
            )
        }


        return (
            <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans">
                <main className="w-full h-full min-h-screen transition-all bg-linear-to-br from-neutral-950 via-neutral-900 to-black overflow-y-auto overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        )
    },
})
