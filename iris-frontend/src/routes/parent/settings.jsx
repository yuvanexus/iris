import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Settings, LogOut, Users } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export const Route = createFileRoute('/parent/settings')({
  component: ParentSettings,
})

function ParentSettings() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-neutral-800/50 border border-neutral-700/50 rounded-xl text-neutral-400">
            <Settings size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-neutral-500 text-sm mt-0.5">Manage your account and preferences</p>
          </div>
        </div>
      </header>

      <div className="bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Name</p>
            <p className="text-neutral-200 font-medium">{user?.full_name || 'Not Provided'}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Email</p>
            <p className="text-neutral-200 font-medium">{user?.email}</p>
          </div>
          {/* <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Role</p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium">
              <Users size={14} /> Parent
            </div>
          </div> */}
        </div>
      </div>

      <div className="pt-4 mt-8 border-t border-neutral-800">
        <button
          onClick={handleLogout}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all font-medium"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
