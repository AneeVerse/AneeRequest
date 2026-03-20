'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import RequestsTable from '@/components/RequestsTable';
import InlineRequestForm from './InlineRequestForm';

interface ClientRequestsTabProps {
    isLoadingData: boolean;
    requests: any[];
    profiles: any[];
    teamMembers: any[];
    isCreatingRequest: boolean;
    requestFormData: any;
    setRequestFormData: (data: any) => void;
    inlineRequestInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function ClientRequestsTab({
    isLoadingData,
    requests,
    profiles,
    teamMembers,
    isCreatingRequest,
    requestFormData,
    setRequestFormData,
    inlineRequestInputRef
}: ClientRequestsTabProps) {
    return (
        <div className="space-y-6 animate-fade-in">
            <InlineRequestForm
                isOpen={isCreatingRequest}
                isActiveTab={true}
                formData={requestFormData}
                setFormData={setRequestFormData}
                inputRef={inlineRequestInputRef}
            />

            {isLoadingData ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={24} className="animate-spin text-[#279da6]" />
                </div>
            ) : (
                <RequestsTable
                    requests={requests}
                    profiles={profiles}
                    teamMembers={teamMembers}
                    showClientColumn={false}
                />
            )}
        </div>
    );
}
