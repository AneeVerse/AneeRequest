'use client';

import React from 'react';
import {
    CheckSquare,
    Pencil,
    Flag,
    UserCog,
    FileText,
    Calendar,
    X,
    Plus,
    Loader2
} from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';
import TasksTable from '@/components/TasksTable';

interface TasksTabProps {
    isCreatingTask: boolean;
    setIsCreatingTask: (creating: boolean) => void;
    taskFormData: any;
    setTaskFormData: (data: any) => void;
    handleCreateLinkedTask: () => void;
    allRequests: any[];
    teamMembers: any[];
    isLoadingTasks: boolean;
    linkedTasks: any[];
    profiles: any[];
    handleTaskUpdate: (taskId: string, field: string, value: any) => Promise<void>;
}

const TasksTab: React.FC<TasksTabProps> = ({
    isCreatingTask,
    setIsCreatingTask,
    taskFormData,
    setTaskFormData,
    handleCreateLinkedTask,
    allRequests,
    teamMembers,
    isLoadingTasks,
    linkedTasks,
    profiles,
    handleTaskUpdate
}) => {
    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="w-full">
                {/* Inline Task Creation Form */}
                <div
                    className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCreatingTask
                        ? 'max-h-[600px] opacity-100 mb-8 translate-y-0 scale-100 blur-0'
                        : 'max-h-0 opacity-0 mb-0 -translate-y-4 scale-95 blur-md pointer-events-none'
                        }`}
                >
                    <div className="p-1 bg-[#101011]/90 backdrop-blur-2xl border border-[#279da6]/30 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(39,157,166,0.08)] ring-1 ring-white/5 relative overflow-hidden">
                        <div className="p-6 space-y-6">
                            <div className="flex items-start gap-6">
                                <div className="flex flex-col items-center gap-3 shrink-0">
                                    <div className="w-14 h-14 rounded-2xl bg-amber-400/10 flex items-center justify-center text-amber-400 shadow-inner ring-1 ring-amber-400/20">
                                        <CheckSquare size={28} />
                                    </div>
                                    <p className="text-[10px] font-black text-storm-gray uppercase tracking-widest">Task</p>
                                </div>

                                <div className="flex-1 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Task Title</label>
                                            <div className="relative group">
                                                <Pencil size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                                                <input
                                                    type="text"
                                                    value={taskFormData.title}
                                                    onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' && taskFormData.title.trim()) handleCreateLinkedTask(); }}
                                                    placeholder="What needs to be done?"
                                                    className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Priority</label>
                                            <CustomDropdown
                                                value={taskFormData.priority}
                                                onChange={(val: any) => setTaskFormData({ ...taskFormData, priority: val })}
                                                options={[
                                                    { label: 'Low', value: 'Low', icon: <Flag size={14} className="text-storm-gray" />, color: 'text-storm-gray' },
                                                    { label: 'Medium', value: 'Medium', icon: <Flag size={14} className="text-blue-400" />, color: 'text-blue-400' },
                                                    { label: 'High', value: 'High', icon: <Flag size={14} className="text-amber-500" />, color: 'text-amber-500' },
                                                    { label: 'Critical', value: 'Critical', icon: <Flag size={14} className="text-rose-500" />, color: 'text-rose-500' }
                                                ]}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Assignee</label>
                                            <CustomDropdown
                                                value={taskFormData.assigned_to}
                                                onChange={(val: any) => setTaskFormData({ ...taskFormData, assigned_to: val })}
                                                options={[
                                                    { label: 'Select Member', value: '' },
                                                    ...teamMembers.filter((tm: any) => tm.profile_id).map((tm: any) => ({
                                                        label: tm.name,
                                                        value: tm.profile_id,
                                                        icon: <UserCog size={14} className="text-[#279da6]" />
                                                    }))
                                                ]}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Description</label>
                                            <div className="relative group/input">
                                                <FileText size={14} className="absolute left-3.5 top-3 text-storm-gray group-focus-within/input:text-[#279da6] transition-colors" />
                                                <textarea
                                                    value={taskFormData.description}
                                                    onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                                                    placeholder="Add details about this task..."
                                                    className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold min-h-[42px] max-h-[120px] custom-scrollbar"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Due Date</label>
                                            <div className="relative group/input">
                                                <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within/input:text-[#279da6] transition-colors z-10" />
                                                <input
                                                    type="date"
                                                    value={taskFormData.due_date}
                                                    onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
                                                    className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron focus:outline-none focus:border-[#279da6]/40 transition-all font-bold [color-scheme:dark]"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Link to Requests</label>
                                            <CustomDropdown
                                                value={''}
                                                onChange={(val: any) => {
                                                    if (val && !taskFormData.request_ids.includes(val)) {
                                                        setTaskFormData({ ...taskFormData, request_ids: [...taskFormData.request_ids, val] });
                                                    }
                                                }}
                                                options={[
                                                    { label: 'Select Requests', value: '' },
                                                    ...allRequests.map((r: any) => ({
                                                        label: r.title,
                                                        value: r.id,
                                                        icon: <FileText size={14} className={taskFormData.request_ids.includes(r.id) ? 'text-[#279da6]' : 'text-storm-gray'} />
                                                    }))
                                                ]}
                                            />
                                            {taskFormData.request_ids.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {taskFormData.request_ids.map((rid: string) => {
                                                        const req = allRequests.find((r: any) => r.id === rid);
                                                        return (
                                                            <div key={rid} className="flex items-center gap-1 px-2 py-0.5 bg-[#279da6]/10 border border-[#279da6]/20 rounded-md text-[9px] font-bold text-[#279da6]">
                                                                <span className="truncate max-w-[80px]">{req?.title || 'Unknown'}</span>
                                                                <button onClick={() => setTaskFormData({ ...taskFormData, request_ids: taskFormData.request_ids.filter((r: string) => r !== rid) })}>
                                                                    <X size={10} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="px-8 py-5 bg-shark/20 border-t border-shark/50 flex items-center justify-end gap-3">
                                    <button
                                        onClick={() => setIsCreatingTask(false)}
                                        className="px-5 py-2 text-[10px] font-black text-storm-gray hover:text-white uppercase tracking-[0.2em] transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateLinkedTask}
                                        disabled={!taskFormData.title.trim()}
                                        className="px-8 py-3 bg-[#279da6] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#279da6]/20 hover:bg-[#279da6]/90 transition-all flex items-center gap-2"
                                    >
                                        <Plus size={12} />
                                        Create Task
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {isLoadingTasks ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={24} className="animate-spin text-[#279da6]" />
                    </div>
                ) : (
                    <TasksTable
                        tasks={linkedTasks}
                        profiles={profiles}
                        teamMembers={teamMembers}
                        onUpdateField={handleTaskUpdate}
                        showRequestColumn={false}
                    />
                )}
            </div>
        </div>
    );
};

export default TasksTab;
