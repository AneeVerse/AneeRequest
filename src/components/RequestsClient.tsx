'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
    LayoutList
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ChatDrawer from '@/components/ChatDrawer';
import CreateRequestModal from '@/components/CreateRequestModal';
import type { RequestItem, Profile, TeamMember } from '@/lib/data/requests';
import RequestsTable from '@/components/RequestsTable';

interface RequestsClientProps {
    initialRequests: RequestItem[];
    initialProfiles: Profile[];
    initialTeamMembers: TeamMember[];
}

export default function RequestsClient({
    initialRequests,
    initialProfiles,
    initialTeamMembers
}: RequestsClientProps) {
    const router = useRouter();
    const { isImpersonating, profile, viewAsProfile } = useAuth();
    const displayProfile = viewAsProfile || profile;

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState('All');
    const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const subTabs = ['All', 'Assigned', 'Open', 'Unassigned', 'Completed'];

    const [requests, setRequests] = useState<RequestItem[]>(initialRequests);
    const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers);

    // Update state when initial props change (from SSR refresh)
    React.useEffect(() => {
        setRequests(initialRequests);
        setProfiles(initialProfiles);
        setTeamMembers(initialTeamMembers);
    }, [initialRequests, initialProfiles, initialTeamMembers]);

    const handleUpdateField = async (requestId: string, field: string, value: any) => {
        const originalRequests = [...requests];

        // Optimistic UI update
        const updatedRequests = requests.map((req: RequestItem) => {
            if (req.id === requestId) {
                const updatedReq = { ...req, [field]: value };
                if (field === 'assigned_to') {
                    const profile = profiles.find((p: Profile) => p.id === value);
                    updatedReq.assignee = profile ? { id: profile.id, full_name: profile.full_name } : null;
                }
                return updatedReq;
            }
            return req;
        });

        // Update local state immediately
        setRequests(updatedRequests);

        try {
            const response = await fetch(`/api/requests?id=${requestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            });

            if (!response.ok) {
                // Rollback on error
                setRequests(originalRequests);
                alert(`Failed to update ${field}`);
            } else {
                // Revalidate to get fresh data from server
                router.refresh();
            }
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
            setRequests(originalRequests);
        }
    };

    const handleRequestCreated = () => {
        // Revalidate requests after creating a new one
        router.refresh();
    };

    // Data visibility logic
    const isTeamMember = displayProfile?.role === 'team_member';
    const isTeamAdmin = displayProfile?.team_role === 'admin';
    const isClient = displayProfile?.role === 'client';

    const visibleRequests = (() => {
        if (isClient) {
            return requests.filter((req: RequestItem) => req.client?.id === displayProfile?.id);
        }
        if (isTeamMember && !isTeamAdmin) {
            return requests.filter((req: RequestItem) => req.assigned_to === displayProfile?.id);
        }
        return requests;
    })();

    const tabFilteredRequests = visibleRequests.filter((req: RequestItem) => {
        // Tab filters
        let matchesTab = true;
        if (activeTab === 'Assigned') matchesTab = !!req.assigned_to;
        else if (activeTab === 'Unassigned') matchesTab = !req.assigned_to;
        else if (activeTab === 'Open') matchesTab = req.status !== 'Done';
        else if (activeTab === 'Completed') matchesTab = req.status === 'Done';

        return matchesTab;
    });

    // Compute counts per tab for notification badges
    const tabCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        subTabs.forEach(tab => {
            counts[tab] = visibleRequests.filter(req => {
                if (tab === 'All') return true;
                if (tab === 'Assigned') return !!req.assigned_to;
                if (tab === 'Unassigned') return !req.assigned_to;
                if (tab === 'Open') return req.status !== 'Done';
                if (tab === 'Completed') return req.status === 'Done';
                return true;
            }).length;
        });
        return counts;
    }, [visibleRequests, subTabs]);

    return (
        <div className={`flex h-screen bg-[#09090B] text-iron font-sans overflow-hidden transition-all duration-500 ${isImpersonating ? 'p-1.5' : ''}`} style={isImpersonating ? { backgroundColor: '#0f2b1a' } : undefined}>
            <Sidebar isCollapsed={isSidebarCollapsed} />

            <div className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative">
                <div className={`flex-1 flex flex-col min-w-0 bg-[#121214] rounded-t-2xl overflow-hidden border-t border-l border-r mt-6 mr-6 transition-all duration-500 ${isImpersonating ? 'border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15),0_0_40px_rgba(34,197,94,0.08),inset_0_0_20px_rgba(34,197,94,0.03)]' : 'border-shark'}`}>
                    <div className="border-b border-shark">
                        <Header
                            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            label="Requests"
                            labelIcon={<LayoutList size={16} className="text-[#279da6]" />}
                            tabs={subTabs}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            tabCounts={tabCounts}
                            onCreate={() => setIsCreateModalOpen(true)}
                        />
                    </div>

                    <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#18181B]">
                        <div className="p-6">
                            <RequestsTable
                                requests={tabFilteredRequests}
                                profiles={profiles}
                                teamMembers={teamMembers}
                                showClientColumn={true}
                                onUpdateField={handleUpdateField}
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                            />
                        </div>
                    </main>
                </div>
            </div>

            <ChatDrawer
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                requestId={selectedRequest?.id || ''}
                requestTitle={selectedRequest?.title || ''}
            />

            <CreateRequestModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleRequestCreated}
            />
        </div >
    );
}
