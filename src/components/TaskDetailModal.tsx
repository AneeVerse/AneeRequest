'use client';

import React, { useState, useEffect, useRef } from 'react';
import Linkify from 'linkify-react';
import {
    X, Send, User, Calendar, Flag, Loader2, Trash2,
    CheckCircle2, Circle, Eye,
    MessageSquare, CheckCheck, Check, Shield, ChevronLeft, FileText,
    User as UserIcon, Plus as PlusIcon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { TaskItem } from '@/lib/data/tasks';

import { supabase } from '@/lib/supabase';
import CustomDropdown from '@/components/CustomDropdown';

interface TaskDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: TaskItem | null;
    onUpdate: (updatedTask: TaskItem) => void;
    onDelete: (taskId: string) => void;
    profiles: any[];
    teamMembers: any[];
    requests: any[];
}

interface Attachment {
    name: string;
    url: string;
    type: string;
}

interface Message {
    id: string;
    task_id: string;
    sender_id: string;
    message: string;
    attachments: Attachment[];
    is_read: boolean;
    created_at: string;
    sender?: {
        full_name: string;
        role: string;
        avatar_url?: string;
    };
}

export default function TaskDetailModal({
    isOpen,
    onClose,
    task,
    onUpdate,
    onDelete,
    profiles,
    teamMembers,
    requests
}: TaskDetailModalProps) {
    const { profile, viewAsProfile } = useAuth();
    const displayProfile = viewAsProfile || profile;
    const [isDeleting, setIsDeleting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: '',
        status: '',
        assigned_to: '',
        due_date: '',
        request_ids: [] as string[]
    });

    // Chat State
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title || '',
                description: task.description || '',
                priority: task.priority || 'Medium',
                status: task.status || 'Todo',
                assigned_to: task.assigned_to || '',
                due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
                request_ids: task.request_links?.map(l => l.request?.id).filter(Boolean) as string[] || []
            });

            fetchMessages();

            const channel = supabase
                .channel(`task-chat-${task.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'task_messages',
                        filter: `task_id=eq.${task.id}`
                    },
                    async (payload: any) => {
                        const { data, error } = await supabase
                            .from('task_messages')
                            .select('*, sender:sender_id(full_name, role, avatar_url)')
                            .eq('id', payload.new.id)
                            .single();

                        if (!error && data) {
                            setMessages((prev) => {
                                if (prev.some(m => m.id === data.id)) return prev;
                                return [...prev, data as Message];
                            });
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [task]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        if (!task) return;
        setIsLoadingMessages(true);
        try {
            const response = await fetch(`/api/tasks/${task.id}/messages`);
            const data = await response.json();
            if (response.ok) {
                setMessages(data);
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !displayProfile || isSending || !task) return;

        const messageText = newMessage.trim();
        setIsSending(true);
        setNewMessage('');

        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: Message = {
            id: tempId,
            task_id: task.id,
            sender_id: displayProfile.id,
            message: messageText,
            attachments: [],
            is_read: false,
            created_at: new Date().toISOString(),
            sender: {
                full_name: displayProfile.full_name || 'You',
                role: displayProfile.role || 'team_member'
            }
        };

        setMessages((prev: Message[]) => [...prev, optimisticMessage]);

        try {
            const response = await fetch(`/api/tasks/${task.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    sender_id: displayProfile.id,
                    attachments: []
                })
            });

            if (!response.ok) {
                const err = await response.json();
                console.error('Send failed:', err.error);
                setNewMessage(messageText);
                setMessages((prev: Message[]) => prev.filter(m => m.id !== tempId));
            } else {
                const actualMessage = await response.json();
                setMessages((prev: Message[]) => prev.map(m => m.id === tempId ? actualMessage : m));
            }
        } catch (error) {
            console.error('Send error:', error);
            setNewMessage(messageText);
            setMessages((prev: Message[]) => prev.filter(m => m.id !== tempId));
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen || !task) return null;

    const handleUpdate = async (field: string, value: any) => {
        if (displayProfile?.role !== 'super_admin') return;
        const updatedData = { ...formData, [field]: value };
        setFormData(updatedData);

        try {
            const response = await fetch(`/api/tasks`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: task.id,
                    [field]: value
                })
            });

            if (!response.ok) throw new Error('Failed to update task');
            const updatedTask = await response.json();

            const tm = teamMembers.find((t: any) => t.profile_id === (field === 'assigned_to' ? value : formData.assigned_to));
            const p = profiles.find((pr: any) => pr.id === (field === 'assigned_to' ? value : formData.assigned_to));
            const assignee = tm ? { id: tm.profile_id, full_name: tm.name, team_members: [{ name: tm.name }] } : (p ? { id: p.id, full_name: p.full_name || p.email } : null);

            const currentRequestIds = field === 'request_ids' ? value : formData.request_ids;
            const selectedRequests = requests.filter(r => currentRequestIds.includes(r.id));
            const request_links = selectedRequests.map(r => ({ request: r }));

            onUpdate({ ...updatedTask, assignee, request_links });
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const handleDelete = async () => {
        if (displayProfile?.role !== 'super_admin') return;
        if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/tasks?id=${task.id}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete task');
            onDelete(task.id);
            onClose();
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task');
        } finally {
            setIsDeleting(false);
        }
    };

    const assignees = teamMembers.map((tm: any) => ({
        id: tm.profile_id,
        name: tm.name || tm.full_name || 'Team Member'
    }));

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Todo': return <Circle size={16} className="text-[#279da6]" />;
            case 'In Progress': return <Loader2 size={16} className="text-amber-500 animate-spin" />;
            case 'Review': return <Eye size={16} className="text-blue-400" />;
            case 'Done': return <Check size={16} className="text-emerald-500" />;
            default: return <Circle size={16} />;
        }
    };


    return (
        <div className="fixed inset-0 z-[60] flex justify-end animate-fade-in">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Drawer - wider to accommodate detail + chat */}
            <div
                className="relative w-full md:max-w-4xl h-[100dvh] md:h-full bg-[#121214] border-l border-shark shadow-2xl flex flex-col md:flex-row animate-slide-left"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Left Panel: Task Details */}
                <div className="flex-1 flex flex-col md:border-r border-shark/30 min-w-0">
                    {/* Header */}
                    <div className="h-16 px-6 border-b border-shark flex items-center justify-between bg-[#09090B]/50 backdrop-blur-md shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={onClose} className="p-2 hover:bg-shark/40 rounded-xl text-storm-gray hover:text-white transition-all">
                                <ChevronLeft size={20} />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-[#279da6] bg-shark/40 py-0.5 px-2 rounded-lg border border-[#279da6]/20 shrink-0">
                                        TSK-{task.id.slice(0, 4).toUpperCase()}
                                    </span>
                                    {task.request_links?.[0]?.request?.client && (
                                        <div className="flex items-center gap-2 border-l border-shark/60 pl-3">
                                            <div className="w-5 h-5 rounded bg-shark flex items-center justify-center text-[8px] text-[#279da6] font-black shrink-0 border border-white/5 overflow-hidden">
                                                {task.request_links[0].request.client.avatar_url ? (
                                                    <img
                                                        src={task.request_links[0].request.client.avatar_url}
                                                        alt={task.request_links[0].request.client.organization || 'Org'}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    task.request_links[0].request.client.organization?.[0] || 'O'
                                                )}
                                            </div>
                                            <span className="text-[11px] font-bold text-iron uppercase tracking-widest truncate max-w-[150px]">
                                                {task.request_links[0].request.client.organization || 'Individual'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {displayProfile?.role === 'super_admin' && (
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase text-storm-gray hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20"
                            >
                                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                <span>Delete</span>
                            </button>
                        )}
                    </div>

                    {/* Task Detail Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {/* Title */}
                        <div>
                            <input
                                className="bg-transparent text-xl font-black text-white uppercase tracking-tighter focus:outline-none w-full border-b border-transparent focus:border-[#279da6]/30 pb-1"
                                value={formData.title}
                                readOnly={displayProfile?.role !== 'super_admin'}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                onBlur={() => handleUpdate('title', formData.title)}
                            />
                        </div>

                        {/* Status & Priority Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Status</label>
                                <CustomDropdown
                                    value={formData.status}
                                    disabled={displayProfile?.role !== 'super_admin'}
                                    onChange={val => handleUpdate('status', val)}
                                    options={[
                                        { label: 'Todo', value: 'Todo', icon: <Circle size={14} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                        { label: 'In Progress', value: 'In Progress', icon: <Loader2 size={14} className="text-amber-500 animate-spin" />, color: 'text-amber-500' },
                                        { label: 'Review', value: 'Review', icon: <Eye size={14} className="text-blue-400" />, color: 'text-blue-400' },
                                        { label: 'Done', value: 'Done', icon: <Check size={14} className="text-emerald-500" />, color: 'text-emerald-500' },
                                    ]}
                                    className="flex-1"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Priority</label>
                                <CustomDropdown
                                    value={formData.priority}
                                    disabled={displayProfile?.role !== 'super_admin'}
                                    onChange={val => handleUpdate('priority', val)}
                                    options={[
                                        { label: 'Low', value: 'Low', icon: <Flag size={14} className="text-storm-gray" />, color: 'text-storm-gray' },
                                        { label: 'Medium', value: 'Medium', icon: <Flag size={14} className="text-blue-400" />, color: 'text-blue-400' },
                                        { label: 'High', value: 'High', icon: <Flag size={14} className="text-amber-500" />, color: 'text-amber-500' },
                                        { label: 'Critical', value: 'Critical', icon: <Flag size={14} className="text-rose-500" />, color: 'text-rose-500' },
                                    ]}
                                    className="flex-1"
                                />
                            </div>
                        </div>

                        {/* Assignee & Due Date Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Assigned To</label>
                                <CustomDropdown
                                    value={formData.assigned_to}
                                    disabled={displayProfile?.role !== 'super_admin'}
                                    onChange={val => handleUpdate('assigned_to', val)}
                                    options={[
                                        { label: 'Unassigned', value: '', icon: <PlusIcon size={14} className="text-storm-gray" /> },
                                        ...assignees.map((a: any) => ({
                                            label: a.name,
                                            value: a.id,
                                            icon: <UserIcon size={14} className="text-[#279da6]" />
                                        }))
                                    ]}
                                    className="flex-1"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Due Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-storm-gray z-10" size={14} />
                                    <input
                                        type="date"
                                        value={formData.due_date}
                                        readOnly={displayProfile?.role !== 'super_admin'}
                                        onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                        onBlur={() => handleUpdate('due_date', formData.due_date)}
                                        className="w-full bg-black/40 border border-shark rounded-xl p-3 pl-10 text-iron focus:border-[#279da6]/50 focus:outline-none transition-all font-bold text-xs [color-scheme:dark] disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Linked Request(s) */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Linked Request(s)</label>
                            <div className="space-y-3">
                                <CustomDropdown
                                    value=""
                                    placeholder="Add connection..."
                                    disabled={displayProfile?.role !== 'super_admin'}
                                    onChange={val => {
                                        if (val) {
                                            const newIds = formData.request_ids.includes(val)
                                                ? formData.request_ids
                                                : [...formData.request_ids, val];
                                            handleUpdate('request_ids', newIds);
                                        }
                                    }}
                                    options={[
                                        ...requests.filter(r => !formData.request_ids.includes(r.id)).map((r: any) => ({
                                            label: r.title,
                                            value: r.id,
                                            icon: <FileText size={14} className="text-[#279da6]" />
                                        }))
                                    ]}
                                />

                                {/* Selected Requests Pills */}
                                {formData.request_ids.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.request_ids.map(rid => {
                                            const req = requests.find((r: any) => r.id === rid);
                                            return (
                                                <div key={rid} className="flex items-center gap-2 bg-[#279da6]/10 border border-[#279da6]/30 rounded-lg px-2 py-1">
                                                    <span className="text-[9px] font-bold text-[#279da6] truncate max-w-[200px]">
                                                        {req ? req.title : 'Loading...'}
                                                    </span>
                                                    {displayProfile?.role === 'super_admin' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newIds = formData.request_ids.filter(id => id !== rid);
                                                                handleUpdate('request_ids', newIds);
                                                            }}
                                                            className="text-storm-gray hover:text-white transition-colors"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Description</label>
                            <textarea
                                rows={5}
                                placeholder="Describe the task in detail..."
                                value={formData.description}
                                readOnly={displayProfile?.role !== 'super_admin'}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                onBlur={() => handleUpdate('description', formData.description)}
                                className="w-full bg-black/40 border border-shark rounded-xl p-4 text-iron placeholder:text-storm-gray focus:border-[#279da6]/50 focus:outline-none transition-all resize-none text-sm leading-relaxed disabled:opacity-70 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="h-10 px-6 bg-shark/10 border-t border-shark/30 flex items-center justify-between text-[8px] text-storm-gray font-black uppercase tracking-[0.2em] opacity-60 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <User size={9} />
                                <span>Created by {task.creator?.full_name || 'System'}</span>
                            </div>
                            <div className="w-[1px] h-3 bg-shark/60" />
                            <div className="flex items-center gap-1">
                                <Calendar size={9} />
                                <span>{new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Discussions (identical to ChatDrawer) */}
                <div className="w-[380px] flex flex-col bg-[#09090B]/40 shrink-0">
                    {/* Chat Header */}
                    <div className="h-16 px-6 border-b border-shark/30 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <MessageSquare size={16} className="text-[#279da6]" />
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-iron">Discussion</h3>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#279da6] animate-pulse" />
                            <span className="text-[9px] font-bold text-storm-gray uppercase tracking-tighter">Live</span>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {isLoadingMessages ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-storm-gray">
                                <Loader2 size={32} className="animate-spin text-[#279da6]" />
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Synchronizing messages</p>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
                                <div className="w-16 h-16 rounded-full bg-shark/20 flex items-center justify-center mb-2">
                                    <Send size={24} className="text-storm-gray -rotate-45" />
                                </div>
                                <p className="text-xs font-bold text-iron uppercase">No discussion yet</p>
                                <p className="text-[10px] font-medium text-storm-gray max-w-[200px]">Start the conversation about this task.</p>
                            </div>
                        ) : messages.map((msg: Message, index: number) => {
                            const isMe = msg.sender_id === displayProfile?.id;
                            const showAvatar = index === 0 || messages[index - 1].sender_id !== msg.sender_id;

                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    {!isMe && showAvatar && (
                                        <div className="flex items-center gap-2 mb-2 ml-1">
                                            <div className="w-6 h-6 rounded-lg bg-[#279da6]/20 flex items-center justify-center text-[10px] font-black text-[#279da6]">
                                                {msg.sender?.full_name?.[0] || 'U'}
                                            </div>
                                            <span className="text-[10px] font-black text-storm-gray uppercase tracking-widest flex items-center gap-1">
                                                {msg.sender?.full_name}
                                                {msg.sender?.role !== 'client' && <Shield size={10} className="text-[#279da6]" />}
                                            </span>
                                        </div>
                                    )}
                                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed group relative ${isMe
                                        ? 'bg-shark text-white rounded-tr-none border border-[#279da6]/30'
                                        : 'bg-[#18181B] text-iron border border-shark rounded-tl-none'
                                        }`}>
                                        <Linkify
                                            options={{
                                                target: '_blank',
                                                className: 'text-[#279da6] underline font-bold'
                                            }}
                                        >
                                            {msg.message}
                                        </Linkify>



                                        <div className={`absolute bottom-[-18px] ${isMe ? 'right-0' : 'left-0'} flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                            <span className="text-[8px] font-bold text-storm-gray uppercase">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {isMe && (
                                                msg.is_read ? <CheckCheck size={10} className="text-[#279da6]" /> : <Check size={10} className="text-storm-gray" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area - identical to ChatDrawer */}
                    <div className="p-4 bg-[#09090B]/50 backdrop-blur-md border-t border-shark sticky bottom-0 shrink-0">
                        <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
                            <div className="relative group">
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e);
                                        }
                                    }}
                                    placeholder="Type a message..."
                                    className="w-full bg-[#18181B] border border-shark/60 rounded-2xl py-3 pl-4 pr-12 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 transition-all font-bold min-h-[52px] max-h-32 resize-none custom-scrollbar"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || isSending}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-[#279da6] text-white hover:bg-[#279da6]/90 transition-all disabled:opacity-30 disabled:hover:scale-100 hover:scale-105 active:scale-95 shadow-lg shadow-[#279da6]/20"
                                >
                                    {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </div>
                            <div className="flex items-center justify-center px-2">
                                <span className="text-[8px] font-bold text-storm-gray uppercase tracking-widest">Enter to send • Shift+Enter for new line</span>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
