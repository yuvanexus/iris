import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { User, Cpu, Settings2 } from 'lucide-react'

import { SettingsNav } from '../../components/scanner/SettingsNav'
import { GeneralTab } from '../../components/scanner/GeneralTab'
import { RecognitionTab } from '../../components/scanner/RecognitionTab'
import { AccountTab } from '../../components/scanner/AccountTab'

export const Route = createFileRoute('/scanner/settings')({
    component: SettingsPage,
})

function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general')

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-bold bg-linear-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                    System Settings
                </h1>
                <p className="text-neutral-400 mt-1">Manage network configuration, models, and preferences</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Sidebar */}
                <nav className="space-y-2 sticky top-8 self-start">
                    <SettingsNav icon={<Settings2 size={18} />} label="General" active={activeTab === 'general'} onClick={() => setActiveTab('general')} />
                    <SettingsNav icon={<Cpu size={18} />} label="Recognition Engine" active={activeTab === 'recognition'} onClick={() => setActiveTab('recognition')} />
                    <SettingsNav icon={<User size={18} />} label="Account" active={activeTab === 'account'} onClick={() => setActiveTab('account')} />
                </nav>

                {/* Content */}
                <main className="md:col-span-3">
                    {activeTab === 'general' && <GeneralTab />}
                    {activeTab === 'recognition' && <RecognitionTab />}
                    {activeTab === 'account' && <AccountTab />}
                </main>
            </div>
        </div>
    )
}
