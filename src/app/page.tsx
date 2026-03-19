'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import RequestsTable from '@/components/RequestsTable';
import Charts from '@/components/Charts';
import {
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Users,
  Zap,
  Clock
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { isImpersonating } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');

  const overviewTabs = ['Overview', 'Analytics', 'Performance', 'Usage'];

  return (
    <div className={`flex h-screen bg-[#09090B] text-iron font-sans overflow-hidden transition-[padding,background-color] duration-500 ${isImpersonating ? 'p-1.5' : ''}`} style={isImpersonating ? { backgroundColor: '#0f2b1a' } : undefined}>
      <Sidebar isCollapsed={isSidebarCollapsed} isMobileOpen={isMobileOpen} onMobileClose={() => setIsMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative">
        <div className={`flex-1 flex flex-col min-w-0 bg-[#101011] rounded-t-2xl overflow-hidden border-t border-l border-r mt-6 responsive-content-wrapper transition-[border-color,box-shadow] duration-500 ${isImpersonating ? 'border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15),0_0_40px_rgba(34,197,94,0.08),inset_0_0_20px_rgba(34,197,94,0.03)]' : 'border-shark'}`}>
          <Header

            onMobileMenuToggle={() => setIsMobileOpen(true)}
            label="Overview"
            labelIcon={<LayoutDashboard size={16} className="text-santas-gray" />}
            tabs={overviewTabs}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          <main className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="px-3 sm:px-6 pb-6 pt-2">
              {/* High-Fidelity Content Container */}
              <div className="bg-[#18181B] border border-shark rounded-2xl p-6 shadow-2xl space-y-8">

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                  {[
                    { label: 'Total Revenue', value: '$45,231.89', trend: '+20.1%', icon: <Zap className="text-malibu" size={18} />, up: true },
                    { label: 'Active Clients', value: '+2,350', trend: '+180.1%', icon: <Users className="text-emerald-400" size={18} />, up: true },
                    { label: 'Total Requests', value: '12,234', trend: '+19%', icon: <Zap className="text-amber-400" size={18} />, up: true },
                    { label: 'Active Now', value: '573', trend: '+201', icon: <Clock className="text-rose-400" size={18} />, up: true },
                  ].map((stat, i) => (
                    <div key={i} className="bg-shark/10 border border-shark rounded-xl p-5 hover:bg-shark/20 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-shark/40 rounded-lg border border-shark group-hover:border-malibu/20 transition-all">
                          {stat.icon}
                        </div>
                        <div className={`flex items-center gap-1 text-[12px] font-bold px-1.5 py-0.5 rounded-full ${stat.up ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {stat.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                          {stat.trend}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-santas-gray uppercase tracking-wider">{stat.label}</p>
                        <h3 className="text-2xl font-bold text-iron">{stat.value}</h3>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <Charts />
                  </div>
                  <div className="bg-shark/10 border border-shark rounded-xl p-6 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold text-iron">Performance Goals</h3>
                      <TrendingUp size={16} className="text-malibu" />
                    </div>
                    <div className="space-y-6">
                      {[
                        { label: 'Request Resolution', value: 85, color: 'bg-malibu' },
                        { label: 'Client Satisfaction', value: 92, color: 'bg-emerald-400' },
                        { label: 'Build Stability', value: 78, color: 'bg-amber-400' },
                      ].map((goal, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between text-[12px] font-bold">
                            <span className="text-santas-gray uppercase tracking-wider">{goal.label}</span>
                            <span className="text-iron">{goal.value}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-shark rounded-full overflow-hidden">
                            <div className={`h-full ${goal.color}`} style={{ width: `${goal.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="mt-8 w-full py-2.5 rounded-lg bg-iron text-cod-gray text-xs font-bold hover:bg-white transition-all">
                      View Full Report
                    </button>
                  </div>
                </div>

                {/* Recent Requests */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-iron">Recent Requests</h3>
                    <button className="text-xs font-bold text-malibu hover:underline">View all</button>
                  </div>
                  <div className="bg-black/20 border border-shark/60 rounded-xl overflow-hidden">
                    <RequestsTable />
                  </div>
                </div>

              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
