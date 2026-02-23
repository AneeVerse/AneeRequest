'use client';

import React from 'react';
import {
    Clock,
    MoreHorizontal,
    User,
    AlertCircle,
    CheckCircle2,
    CircleDashed,
    RefreshCcw,
    Box,
    MessageSquare
} from 'lucide-react';
import { TaskItem } from '@/lib/data/tasks';

interface TasksTableProps {
    tasks: TaskItem[];
    onTaskUpdated: (tasks: TaskItem[]) => void;
    onTaskClick?: (task: TaskItem) => void;
    onOpenChat?: (task: TaskItem) => void;
}

export default function TasksTable({ tasks, onTaskUpdated, onTaskClick, onOpenChat }: TasksTableProps) {

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Todo': return <CircleDashed size={14} className="text-storm-gray" />;
            case 'In Progress': return <RefreshCcw size={14} className="text-malibu animate-spin-slow" />;
            case 'Review': return <AlertCircle size={14} className="text-amber-400" />;
            case 'Done': return <CheckCircle2 size={14} className="text-emerald-400" />;
            default: return <CircleDashed size={14} />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Critical': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
            case 'High': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            case 'Medium': return 'text-malibu bg-malibu/10 border-malibu/20';
            case 'Low': return 'text-storm-gray bg-storm-gray/10 border-storm-gray/20';
            default: return 'text-iron bg-shark/40 border-shark';
        }
    };

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-shark/40 rounded-2xl flex items-center justify-center text-storm-gray mb-4 border border-shark">
                    <Box size={32} />
                </div>
                <h3 className="text-lg font-bold text-iron">No tasks found</h3>
                <p className="text-sm text-storm-gray max-w-xs mx-auto">Tasks assigned to the team or created by you will appear here.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-shark">
                        <th className="px-5 py-4 w-12 border-r border-shark/60 text-center text-[11px] font-black text-storm-gray uppercase tracking-widest">#</th>
                        <th className="px-6 py-4 text-[11px] font-black text-storm-gray uppercase tracking-widest">Task</th>
                        <th className="px-6 py-4 text-[11px] font-black text-storm-gray uppercase tracking-widest">Assignee</th>
                        <th className="px-6 py-4 text-[11px] font-black text-storm-gray uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4 text-[11px] font-black text-storm-gray uppercase tracking-widest">Priority</th>
                        <th className="px-6 py-4 text-[11px] font-black text-storm-gray uppercase tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-shark/40">
                    {tasks.map((task, index) => (
                        <tr key={task.id} className="group hover:bg-shark/20 transition-all cursor-pointer">
                            <td className="px-5 py-5 border-r border-shark/60 text-center text-[12px] font-black text-storm-gray" onClick={() => onTaskClick?.(task)}>
                                {(index + 1).toString().padStart(2, '0')}
                            </td>                            <td className="px-6 py-5" onClick={() => onTaskClick?.(task)}>
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-bold text-iron group-hover:text-[#279da6] transition-colors line-clamp-1">{task.title}</span>
                                    <div className="flex items-center gap-2 text-[10px] text-storm-gray font-medium">
                                        <span className="uppercase tracking-wider">TSK-{task.id.slice(0, 4)}</span>
                                        <span>•</span>
                                        <div className="flex items-center gap-1">
                                            <Clock size={10} />
                                            <span>{formatDate(task.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-shark border border-shark flex items-center justify-center text-[10px] font-black text-iron overflow-hidden">
                                        {task.assignee ? (
                                            (task.assignee as any).team_members?.[0]?.name?.[0] || task.assignee.full_name?.[0] || <User size={12} className="text-storm-gray" />
                                        ) : (
                                            <User size={12} className="text-storm-gray" />
                                        )}
                                    </div>
                                    <span className="text-xs font-bold text-iron">
                                        {(task.assignee as any).team_members?.[0]?.name || task.assignee?.full_name || 'Unassigned'}
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-black/40 border border-shark w-fit group-hover:border-[#279da6]/20 transition-all">
                                    {getStatusIcon(task.status)}
                                    <span className="text-[10px] font-black uppercase tracking-tight text-iron">{task.status}</span>
                                </div>
                            </td>
                            <td className="px-6 py-5">
                                <div className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter w-fit ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                </div>
                            </td>
                            <td className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    {onOpenChat && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onOpenChat(task); }}
                                            className="p-2 text-storm-gray hover:text-[#279da6] transition-colors"
                                            title="Open Discussion"
                                        >
                                            <MessageSquare size={16} />
                                        </button>
                                    )}
                                    <button className="p-2 text-storm-gray hover:text-white transition-colors">
                                        <MoreHorizontal size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
