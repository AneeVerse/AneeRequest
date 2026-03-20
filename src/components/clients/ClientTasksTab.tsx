'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import TasksTable from '@/components/TasksTable';
import InlineTaskForm from './InlineTaskForm';

interface ClientTasksTabProps {
    isLoadingData: boolean;
    tasks: any[];
    profiles: any[];
    teamMembers: any[];
    isCreatingTask: boolean;
    taskFormData: any;
    setTaskFormData: (data: any) => void;
    inlineTaskInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function ClientTasksTab({
    isLoadingData,
    tasks,
    profiles,
    teamMembers,
    isCreatingTask,
    taskFormData,
    setTaskFormData,
    inlineTaskInputRef
}: ClientTasksTabProps) {
    return (
        <div className="space-y-6 animate-fade-in">
            <InlineTaskForm
                isOpen={isCreatingTask}
                isActiveTab={true}
                formData={taskFormData}
                setFormData={setTaskFormData}
                inputRef={inlineTaskInputRef}
                teamMembers={teamMembers}
            />

            {isLoadingData ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={24} className="animate-spin text-[#279da6]" />
                </div>
            ) : (
                <TasksTable
                    tasks={tasks}
                    profiles={profiles}
                    teamMembers={teamMembers}
                    showRequestColumn={true}
                />
            )}
        </div>
    );
}
