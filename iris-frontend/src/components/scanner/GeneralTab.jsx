import { Settings } from 'lucide-react'
import { SettingToggle } from './SettingToggle'

export function GeneralTab() {
    return (
        <div className="space-y-6">
            {/* General Settings */}
            <section className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 lg:p-8 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <Settings className="text-gray-400" />
                    General Settings
                </h2>
                <div className="space-y-6">
                    <SettingToggle title="Dark Theme" description="Force dark mode styling across the platform." enabled={true} />
                    <div className="h-px w-full bg-neutral-800/60"></div>
                </div>
            </section>
        </div>
    )
}
