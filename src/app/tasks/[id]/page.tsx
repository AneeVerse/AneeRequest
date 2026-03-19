'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
    ChevronLeft,
    MoreHorizontal,
    Send,
    Paperclip,
    User,
    Trash2,
    AlertCircle,
    CheckCircle2,
    Clock,
    MessageSquare,
    Loader2,
    Bold,
    Italic,
    Underline,
    List,
    Link as LinkIcon,
    Smile,
    Plus,
    X,
    CircleDashed,
    RefreshCcw,
    Flag,
    Pencil,
    CheckSquare,
    FolderOpen,
    ExternalLink,
    Image as ImageIcon,
    Film,
    FileText,
    RefreshCw,
    Circle,
    Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import ImpersonationWarning from '@/components/ImpersonationWarning';
import FilePreviewModal from '@/components/FilePreviewModal';
import CustomDropdown from '@/components/CustomDropdown';
import CustomDatePicker from '@/components/CustomDatePicker';
import { formatDate, formatTime } from '@/lib/dateUtils';

interface Message {
    id: string;
    task_id: string;
    sender_id: string;
    message: string;
    attachments: any[];
    is_read: boolean;
    created_at: string;
    is_edited?: boolean;
    sender: {
        full_name: string;
        role: string;
        avatar_url?: string | null;
    };
}

interface TaskDetails {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    created_at: string;
    updated_at: string;
    due_date: string | null;
    assigned_to: string | null;
    request_links?: {
        request: {
            id: string;
            slug: string | null;
            title: string;
        } | null;
    }[] | null;
    created_by: string | null;
    assignee: {
        id: string;
        full_name: string;
        avatar_url?: string | null;
    } | null;
    creator: {
        id: string;
        full_name: string;
        avatar_url?: string | null;
    } | null;
}

interface TeamMember {
    id: string;
    name: string;
    email: string;
    profile_id: string | null;
    avatar_url: string | null;
}

interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    size: number | null;
    createdTime: string;
    folder: string;
    previewUrl: string;
    webViewLink: string;
}

export default function TaskDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { profile, viewAsProfile, isImpersonating } = useAuth();
    const displayProfile = viewAsProfile || profile;
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);
    const [task, setTask] = useState<TaskDetails | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const searchParams = useSearchParams();
    const initialTab = (searchParams.get('tab') as 'task' | 'files') || 'task';
    const [activeTab, setActiveTabInternal] = useState<'task' | 'files'>(initialTab);
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState('');
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editedMessageContent, setEditedMessageContent] = useState('');

    // Files state
    const [requestFiles, setRequestFiles] = useState<DriveFile[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [isCreatingRequestedFolder, setIsCreatingRequestedFolder] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState<any | null>(null);

    // Delete state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // WYSIWYG formatting
    const execFormat = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleEditorInput();
    };

    const handleInsertLink = () => {
        const url = prompt('Enter URL:');
        if (url) {
            document.execCommand('createLink', false, url);
            editorRef.current?.focus();
            handleEditorInput();
        }
    };

    const handleEditorInput = () => {
        const text = editorRef.current?.textContent?.trim() || '';
        setNewMessage(text);
    };

    const isHtmlContent = (text: string) => /<[a-z][\s\S]*>/i.test(text);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Tabs state
    useEffect(() => {
        const tab = searchParams.get('tab') as 'task' | 'files';
        if (tab && tab !== activeTab) {
            setActiveTabInternal(tab);
        }
    }, [searchParams]);

    const setActiveTab = (tab: 'task' | 'files') => {
        setActiveTabInternal(tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.replace(`/tasks/${id}?${params.toString()}`);
    };

    useEffect(() => {
        if (id) {
            const initPage = async () => {
                setIsLoading(true);
                try {
                    await Promise.all([
                        fetchTaskDetails(),
                        fetchMessages(),
                        fetchTeamMembers(),
                        fetchRequests()
                    ]);
                } finally {
                    setIsLoading(false);
                }
            };

            initPage();
        }
    }, [id]);

    useEffect(() => {
        if (task?.id) {
            // Subscribe to real-time messages
            const channel = supabase
                .channel(`task_messages:${task.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'task_messages',
                        filter: `task_id=eq.${task.id}`,
                    },
                    async (payload) => {
                        const { data, error } = await supabase
                            .from('task_messages')
                            .select('*, sender:sender_id(full_name, role, avatar_url)')
                            .eq('id', payload.new.id)
                            .single();

                        if (!error && data) {
                            setMessages(prev => {
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
    }, [task?.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchTaskDetails = async () => {
        try {
            const response = await fetch(`/api/tasks?id=${id}`);
            const data = await response.json();
            if (response.ok) {
                const found = Array.isArray(data) ? (data.find((t: any) => t.id === id || t.slug === id)) : data;
                setTask(found);
            }
        } catch (error) {
            console.error('Error fetching task details:', error);
        }
    };

    const fetchMessages = async () => {
        try {
            const response = await fetch(`/api/tasks/${id}/messages`);
            const data = await response.json();
            if (response.ok) {
                setMessages(data);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const fetchTeamMembers = async () => {
        try {
            const response = await fetch('/api/team');
            if (response.ok) {
                const data = await response.json();
                setTeamMembers(data);
            }
        } catch (error) {
            console.error('Error fetching team members:', error);
        }
    };

    const fetchRequests = async () => {
        try {
            const response = await fetch('/api/requests');
            if (response.ok) {
                const data = await response.json();
                setRequests(data);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        }
    };

    const fetchRequestFiles = async () => {
        const requestId = task?.request_links?.[0]?.request?.id;
        if (!requestId) return;

        setIsLoadingFiles(true);
        try {
            const response = await fetch(`/api/requests/${requestId}/files`);
            if (response.ok) {
                const data = await response.json();
                setRequestFiles(data);
            }
        } catch (error) {
            console.error('Error fetching request files:', error);
        } finally {
            setIsLoadingFiles(false);
        }
    };

    const handleCreateFolder = async () => {
        const requestId = task?.request_links?.[0]?.request?.id;
        if (!requestId) return;

        setIsCreatingRequestedFolder(true);
        try {
            const response = await fetch(`/api/requests/${requestId}/files`, {
                method: 'POST'
            });
            if (response.ok) {
                fetchRequestFiles();
            } else {
                const err = await response.json();
                alert(`Error creating folder: ${err.error}`);
            }
        } catch (error) {
            console.error('Failed to create folder:', error);
            alert('Failed to create folder. Please try again.');
        } finally {
            setIsCreatingRequestedFolder(false);
        }
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType?.startsWith('image/')) return <ImageIcon size={18} className="text-purple-400" />;
        if (mimeType?.startsWith('video/')) return <Film size={18} className="text-rose-400" />;
        return <FileText size={18} className="text-[#279da6]" />;
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    useEffect(() => {
        if (activeTab === 'files' && requestFiles.length === 0) {
            fetchRequestFiles();
        }
    }, [activeTab, task?.request_links]);

    const handleSendMessage = async (e?: React.FormEvent, attachments: any[] = []) => {
        if (e) e.preventDefault();
        const editorHtml = editorRef.current?.innerHTML || '';
        const textContent = editorRef.current?.textContent?.trim() || '';

        if (!textContent && attachments.length === 0) return;
        if (!displayProfile || isSending) return;

        const messageContent = textContent ? editorHtml : '';
        setIsSending(true);
        setNewMessage('');
        if (editorRef.current) editorRef.current.innerHTML = '';

        // Optimistic message
        const optimisticId = `temp-${Date.now()}`;
        const tempMessage: Message = {
            id: optimisticId,
            task_id: id as string,
            sender_id: displayProfile.id,
            message: messageContent,
            attachments: attachments,
            is_read: false,
            created_at: new Date().toISOString(),
            sender: {
                full_name: displayProfile.full_name || 'You',
                role: displayProfile.role || 'user'
            }
        };

        setMessages(prev => [...prev, tempMessage]);

        try {
            const response = await fetch(`/api/tasks/${id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageContent,
                    sender_id: displayProfile.id,
                    attachments: attachments
                })
            });

            if (!response.ok) {
                setMessages(prev => prev.filter(m => m.id !== optimisticId));
                if (editorRef.current) editorRef.current.innerHTML = messageContent;
                setNewMessage(textContent);
            } else {
                const finalMsg = await response.json();
                setMessages(prev => prev.map(m => m.id === optimisticId ? finalMsg : m));
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => prev.filter(m => m.id !== optimisticId));
            if (editorRef.current) editorRef.current.innerHTML = messageContent;
            setNewMessage(textContent);
        } finally {
            setIsSending(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !displayProfile) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('taskId', id as string);
        formData.append('senderId', displayProfile.id);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                handleSendMessage(undefined, [{
                    url: data.url,
                    name: data.name,
                    type: data.type,
                    ...(data.drive_file_id ? { drive_file_id: data.drive_file_id } : {})
                }]);
            } else {
                const err = await response.json();
                alert(`Upload failed: ${err.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert("Error uploading file");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleEditMessage = async (messageId: string, content: string) => {
        if (!content.trim()) return;

        try {
            const response = await fetch(`/api/tasks/${id}/messages`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: messageId,
                    message: content
                })
            });

            if (response.ok) {
                const updatedMsg = await response.json();
                setMessages(prev => prev.map(m => m.id === messageId ? updatedMsg : m));
                setEditingMessageId(null);
                setEditedMessageContent('');
            } else {
                alert('Failed to update message');
            }
        } catch (error) {
            console.error('Error updating message:', error);
            alert('Error updating message');
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (!confirm('Are you sure you want to delete this message?')) return;

        try {
            const response = await fetch(`/api/tasks/${id}/messages?messageId=${messageId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setMessages(prev => prev.filter(m => m.id !== messageId));
            } else {
                alert('Failed to delete message');
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            alert('Error deleting message');
        }
    };

    const handleUpdateField = async (field: string, value: any) => {
        if (!task || !isAdmin) return;

        const originalTask = { ...task };
        const newTask = { ...task, [field]: value };

        if (field === 'assigned_to') {
            const tm = teamMembers.find(t => t.profile_id === value);
            newTask.assignee = tm ? { id: tm.profile_id!, full_name: tm.name } : null;
        }

        if (field === 'request_ids') {
            const selectedRequests = requests.filter(r => value.includes(r.id));
            newTask.request_links = selectedRequests.map(r => ({ request: r }));
        }

        setTask(newTask);

        try {
            const response = await fetch(`/api/tasks`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: task.id,
                    [field]: value
                })
            });

            if (!response.ok) {
                setTask(originalTask);
                alert(`Failed to update ${field}`);
            }
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
            setTask(originalTask);
        }
    };

    const handleDeleteTask = async () => {
        if (!task || !isSuperAdmin) return;
        setIsDeleting(true);
        setDeleteError(null);

        try {
            const response = await fetch(`/api/tasks?id=${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                router.push('/tasks');
            } else {
                const err = await response.json();
                setDeleteError(err.error || 'Failed to delete task');
            }
        } catch (error) {
            console.error('Delete task failed:', error);
            setDeleteError('An unexpected error occurred while deleting the task');
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading && !task) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#09090B]">
                <Loader2 size={32} className="animate-spin text-[#279da6]" />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#09090B] text-iron">
                <div className="text-center">
                    <AlertCircle size={48} className="mx-auto mb-4 text-rose-500 opacity-50" />
                    <p className="font-bold">Task not found</p>
                    <button onClick={() => router.push('/tasks')} className="mt-4 text-[#279da6] hover:underline">Return to list</button>
                </div>
            </div>
        );
    }

    const isSuperAdmin = displayProfile?.role === 'super_admin';
    const isTeamAdmin = displayProfile?.team_role === 'admin';
    const isAdmin = isSuperAdmin || isTeamAdmin || displayProfile?.role === 'admin';

    return (
        <>
            <div className={`flex h-screen bg-[#09090B] text-iron font-sans overflow-hidden transition-all duration-500 ${isImpersonating ? 'p-1.5' : ''}`} style={isImpersonating ? { backgroundColor: '#0f2b1a' } : undefined}>
                <Sidebar isCollapsed={isSidebarCollapsed} isMobileOpen={isMobileOpen} onMobileClose={() => setIsMobileOpen(false)} />

                <div className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative">
                    <div className={`flex-1 flex flex-col min-w-0 bg-[#101011] rounded-t-2xl overflow-hidden border-t border-l border-r mt-6 mr-6 responsive-content-wrapper transition-all duration-500 ${isImpersonating ? 'border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15),0_0_40px_rgba(34,197,94,0.08),inset_0_0_20px_rgba(34,197,94,0.03)]' : 'border-shark'}`}>

                        {/* Header */}
                        <div className="border-b border-shark">
                            <Header
                                onMobileMenuToggle={() => setIsMobileOpen(true)}
                                labelIcon={<CheckSquare size={16} className="text-[#279da6]" />}
                                tabs={[
                                    { label: 'task', icon: <CheckSquare size={12} /> },
                                    { label: 'files', icon: <FolderOpen size={12} /> }
                                ]}
                                activeTab={activeTab}
                                setActiveTab={(tab) => setActiveTab(tab as any)}
                                label={
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                        <span className="text-[12px] text-storm-gray font-black uppercase tracking-[0.2em] opacity-70">
                                            Active
                                        </span>
                                    </div>
                                }
                            >
                                <div className="hidden lg:flex items-center ml-4 flex-1 min-w-0">
                                    <h2 className="text-[22px] font-bold text-white uppercase tracking-tight truncate">
                                        TSK-{task.id.slice(0, 4).toUpperCase()} {task.title}
                                    </h2>
                                </div>
                            </Header>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* Main Content Area */}
                            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                                {activeTab === 'task' && (
                                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                                            <div className="pt-6 pb-8 px-8 max-w-4xl mx-auto w-full">
                                                <div className="relative mb-6 pt-1">
                                                    <div className="absolute -left-14 top-0 w-10 h-10 rounded-full bg-shark flex items-center justify-center text-[#279da6] border border-white/5 shadow-inner z-10">
                                                        <MessageSquare size={18} />
                                                    </div>
                                                    <div className="w-full">
                                                        <div className="bg-shark/20 border border-shark/50 rounded-2xl p-6 shadow-sm">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <span className="text-[12px] font-bold text-[#279da6] uppercase tracking-widest">Last Updated</span>
                                                                <span className="text-[12px] text-[#ff2056] font-bold uppercase tracking-widest">
                                                                    {formatDate(task.updated_at)} • {formatTime(task.updated_at)}
                                                                </span>
                                                            </div>
                                                            {isEditingDescription ? (
                                                                <div className="space-y-3">
                                                                    <textarea
                                                                        value={editedDescription}
                                                                        onChange={(e) => setEditedDescription(e.target.value)}
                                                                        className="w-full bg-black/40 border border-[#279da6]/30 rounded-xl p-4 text-[12px] text-iron focus:outline-none focus:border-[#279da6] min-h-[120px] transition-all resize-none font-bold"
                                                                        placeholder="Enter task description..."
                                                                    />
                                                                    <div className="flex items-center gap-2 justify-end">
                                                                        <button
                                                                            onClick={() => setIsEditingDescription(false)}
                                                                            className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-storm-gray hover:text-white transition-all"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                        <button
                                                                            onClick={async () => {
                                                                                await handleUpdateField('description', editedDescription);
                                                                                setIsEditingDescription(false);
                                                                            }}
                                                                            className="px-4 py-1.5 rounded-lg bg-[#279da6] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#20838b] transition-all shadow-lg shadow-[#279da6]/20"
                                                                        >
                                                                            Save Changes
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="group relative">
                                                                    <p className="text-iron text-[12px] leading-relaxed whitespace-pre-wrap font-bold pr-10">
                                                                        {task.description || 'No description provided.'}
                                                                    </p>
                                                                    {isAdmin && (
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditedDescription(task.description || '');
                                                                                setIsEditingDescription(true);
                                                                            }}
                                                                            className="absolute top-0 right-0 p-2 text-storm-gray hover:text-[#279da6] opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-[#279da6]/10"
                                                                            title="Edit Description"
                                                                        >
                                                                            <Pencil size={14} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Timeline Splitter */}
                                                <div className="relative flex items-center justify-center my-8">
                                                    <div className="absolute inset-0 flex items-center">
                                                        <div className="w-full border-t border-shark/40"></div>
                                                    </div>
                                                    <span className="relative px-4 py-1.5 bg-[#121214] border border-shark rounded-full text-[12px] font-bold text-storm-gray uppercase tracking-[0.2em] shadow-2xl">
                                                        Discussion Started
                                                    </span>
                                                </div>

                                                {/* Messages Timeline */}
                                                <div className="space-y-8">
                                                    {messages.map((msg) => {
                                                        const isMe = msg.sender_id === profile?.id;
                                                        return (
                                                            <div key={msg.id} className={`flex gap-4 group ${isMe ? 'flex-row-reverse' : ''}`}>
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-white/5 shadow-lg relative overflow-hidden ${isMe ? 'bg-shark text-[#279da6]' : 'bg-shark text-[#279da6]'
                                                                    }`}>
                                                                    {isMe ? (
                                                                        profile?.avatar_url ? (
                                                                            <Image
                                                                                src={profile.avatar_url}
                                                                                alt={profile.full_name || 'User'}
                                                                                fill
                                                                                unoptimized
                                                                                className="object-cover"
                                                                            />
                                                                        ) : (
                                                                            <span className="font-black text-xs">{profile?.full_name?.split(' ').map(n => n[0]).join('')}</span>
                                                                        )
                                                                    ) : (
                                                                        msg.sender?.avatar_url ? (
                                                                            <Image
                                                                                src={msg.sender.avatar_url}
                                                                                alt={msg.sender.full_name || 'User'}
                                                                                fill
                                                                                unoptimized
                                                                                className="object-cover"
                                                                            />
                                                                        ) : (
                                                                            <span className="font-black text-xs">{msg.sender?.full_name?.split(' ').map(n => n[0]).join('')}</span>
                                                                        )
                                                                    )}
                                                                </div>
                                                                <div className="max-w-[80%]">
                                                                    <div className={`flex items-center gap-2 mb-1.5 px-1 ${isMe ? 'justify-end' : ''}`}>
                                                                        {!isMe && (
                                                                            <span className="text-[12px] font-bold text-iron uppercase tracking-widest">
                                                                                {msg.sender?.full_name}
                                                                            </span>
                                                                        )}
                                                                        <span className="text-[12px] text-storm-gray font-bold">
                                                                            {new Date(msg.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                                                            {msg.is_edited && <span className="ml-1 opacity-50 lowercase">(edited)</span>}
                                                                        </span>
                                                                        {isMe && !editingMessageId && (
                                                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setEditingMessageId(msg.id);
                                                                                        setEditedMessageContent(msg.message.replace(/<[^>]*>?/gm, ''));
                                                                                    }}
                                                                                    className="text-storm-gray hover:text-[#279da6] transition-colors"
                                                                                    title="Edit Message"
                                                                                >
                                                                                    <Pencil size={10} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteMessage(msg.id)}
                                                                                    className="text-storm-gray hover:text-rose-500 transition-colors"
                                                                                    title="Delete Message"
                                                                                >
                                                                                    <Trash2 size={10} />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className={`px-5 py-3 rounded-2xl text-[12px] font-bold leading-relaxed shadow-lg ${isMe
                                                                        ? 'bg-shark text-white rounded-tr-none border border-[#279da6]/30'
                                                                        : 'bg-shark text-iron rounded-tl-none border border-white/5'
                                                                        }`}>
                                                                        {editingMessageId === msg.id ? (
                                                                            <div className="space-y-3">
                                                                                <textarea
                                                                                    value={editedMessageContent}
                                                                                    onChange={(e) => setEditedMessageContent(e.target.value)}
                                                                                    className="w-full bg-black/40 border border-[#279da6]/30 rounded-xl p-3 text-[12px] font-bold text-iron focus:outline-none focus:border-[#279da6] min-h-[80px] transition-all resize-none font-bold"
                                                                                    autoFocus
                                                                                />
                                                                                <div className="flex items-center gap-2 justify-end">
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setEditingMessageId(null);
                                                                                            setEditedMessageContent('');
                                                                                        }}
                                                                                        className="text-[10px] font-black uppercase tracking-widest text-storm-gray hover:text-white transition-all"
                                                                                    >
                                                                                        Cancel
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleEditMessage(msg.id, editedMessageContent)}
                                                                                        className="px-3 py-1 rounded-lg bg-[#279da6] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#20838b] transition-all shadow-lg shadow-[#279da6]/20"
                                                                                    >
                                                                                        Save Changes
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            isHtmlContent(msg.message) ? (
                                                                                <div
                                                                                    className="prose prose-invert max-w-none text-[12px] font-bold [&_p]:text-[12px] [&_p]:font-bold [&_ul]:text-[12px] [&_ul]:font-bold [&_li]:text-[12px] [&_li]:font-bold [&_a]:text-[#279da6] [&_a]:underline [&_a]:font-bold"
                                                                                    dangerouslySetInnerHTML={{ __html: msg.message }}
                                                                                />
                                                                            ) : (
                                                                                <div className="text-[12px] font-bold leading-relaxed">
                                                                                    {msg.message.split('\n').map((line, i) => (
                                                                                        <div key={i}>
                                                                                            {line.split(/(\*\*.*?\*\*|__.*?__|\*.*?\*|_.*?_|https?:\/\/[^\s]+)/).map((part, j) => {
                                                                                                if (part.startsWith('**') && part.endsWith('**')) {
                                                                                                    return <strong key={j}>{part.slice(2, -2)}</strong>;
                                                                                                }
                                                                                                if (part.startsWith('__') && part.endsWith('__')) {
                                                                                                    return <u key={j}>{part.slice(2, -2)}</u>;
                                                                                                }
                                                                                                if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                                                                                                    return <em key={j}>{part.slice(1, -1)}</em>;
                                                                                                }
                                                                                                if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
                                                                                                    return <em key={j}>{part.slice(1, -1)}</em>;
                                                                                                }
                                                                                                if (/^https?:\/\/[^\s]+$/.test(part)) {
                                                                                                    return <a key={j} href={part} target="_blank" rel="noopener noreferrer" className="underline font-bold text-[#279da6]">{part}</a>;
                                                                                                }
                                                                                                return part;
                                                                                            })}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    <div ref={messagesEndRef} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Message Composer - Floating style */}
                                        <div className="mt-auto px-6 pb-4 pt-2">
                                            <div className="max-w-4xl mx-auto">
                                                <div className="bg-shark/30 border border-shark/60 rounded-[2rem] overflow-hidden shadow-inner focus-within:border-[#279da6]/50 transition-all">
                                                    {/* Formatting Bar */}
                                                    <div className="flex items-center gap-1 p-3 bg-shark/10 border-b border-shark/40">
                                                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat('bold')} title="Bold" className="p-1.5 hover:bg-shark rounded text-storm-gray hover:text-white transition-all"><Bold size={14} /></button>
                                                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat('italic')} title="Italic" className="p-1.5 hover:bg-shark rounded text-storm-gray hover:text-white transition-all"><Italic size={14} /></button>
                                                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat('underline')} title="Underline" className="p-1.5 hover:bg-shark rounded text-storm-gray hover:text-white transition-all"><Underline size={14} /></button>
                                                        <div className="w-px h-4 bg-shark/40 mx-2"></div>
                                                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => execFormat('insertUnorderedList')} title="List" className="p-1.5 hover:bg-shark rounded text-storm-gray hover:text-white transition-all"><List size={14} /></button>
                                                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleInsertLink} title="Insert Link" className="p-1.5 hover:bg-shark rounded text-storm-gray hover:text-white transition-all"><LinkIcon size={14} /></button>
                                                    </div>
                                                    <div
                                                        ref={editorRef}
                                                        contentEditable
                                                        suppressContentEditableWarning
                                                        onInput={handleEditorInput}
                                                        onKeyDown={(e) => {
                                                            // Enter and Shift+Enter both perform default newline behavior
                                                        }}
                                                        data-placeholder="Message team members about this task..."
                                                        className="w-full bg-transparent text-iron p-6 text-[12px] font-bold focus:outline-none min-h-[100px] empty:before:content-[attr(data-placeholder)] empty:before:text-storm-gray/50 empty:before:pointer-events-none [&_a]:text-[#279da6] [&_a]:underline border-b border-shark/40"
                                                    />
                                                    <div className="flex items-center justify-between p-4 bg-shark/10">
                                                        <input
                                                            type="file"
                                                            ref={fileInputRef}
                                                            className="hidden"
                                                            onChange={handleFileUpload}
                                                        />
                                                        <button
                                                            onClick={() => fileInputRef.current?.click()}
                                                            disabled={isUploading}
                                                            className="flex items-center gap-3 px-3 py-1.5 text-[12px] font-bold uppercase tracking-widest text-storm-gray hover:text-white transition-all group"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-shark/40 border border-shark/60 flex items-center justify-center text-storm-gray group-hover:text-[#279da6] group-hover:bg-shark/60 transition-all">
                                                                {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={14} />}
                                                            </div>
                                                            <span>{isUploading ? 'Uploading...' : 'ATTACH FILE'}</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleSendMessage()}
                                                            disabled={isSending || (!newMessage.trim() && !isUploading)}
                                                            className="bg-[#279da6] hover:bg-[#20838b] text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold text-[12px] uppercase tracking-widest disabled:opacity-40 shadow-[0_10px_20px_rgba(39,157,166,0.15)] active:scale-95"
                                                        >
                                                            {isSending ? <Loader2 size={16} className="animate-spin" /> : (
                                                                <>
                                                                    <Send size={14} />
                                                                    <span>SEND MESSAGE</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'files' && (
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                        <div className="max-w-4xl mx-auto">
                                            {/* Refresh button */}
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-sm font-black text-iron uppercase tracking-widest">Request Files</h3>
                                                <button
                                                    onClick={fetchRequestFiles}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-shark/30 border border-shark text-storm-gray text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-[#279da6]/30 transition-all"
                                                >
                                                    <RefreshCw size={12} className={isLoadingFiles ? 'animate-spin' : ''} />
                                                    Refresh
                                                </button>
                                            </div>

                                            {isLoadingFiles ? (
                                                <div className="flex items-center justify-center py-20">
                                                    <Loader2 size={24} className="animate-spin text-[#279da6]" />
                                                </div>
                                            ) : requestFiles.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                                    <div className="w-20 h-20 rounded-3xl bg-shark/30 border border-shark flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/5">
                                                        <FolderOpen size={32} className="text-storm-gray/50" />
                                                    </div>
                                                    <h3 className="text-xl font-bold text-iron mb-2 uppercase tracking-tight">No Folder Linked</h3>
                                                    <p className="text-sm text-storm-gray mb-10 max-w-xs mx-auto">
                                                        Connect a Google Drive folder to manage this request&apos;s project files directly from this dashboard.
                                                    </p>

                                                    <div className="flex flex-col gap-3 w-full max-w-[280px]">
                                                        <button
                                                            onClick={handleCreateFolder}
                                                            disabled={isCreatingRequestedFolder || isLoadingFiles}
                                                            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#279da6] text-white text-xs font-black uppercase tracking-widest hover:bg-[#279da6]/90 transition-all shadow-[0_10px_20px_rgba(39,157,166,0.2)] disabled:opacity-50"
                                                        >
                                                            {isCreatingRequestedFolder ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                                            Create New Folder
                                                        </button>
                                                        <button
                                                            onClick={() => alert('Folder linking coming soon - currently you can create the standard folder structure.')}
                                                            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-shark/30 border border-shark text-storm-gray text-xs font-black uppercase tracking-widest hover:text-white hover:border-shark/80 transition-all"
                                                        >
                                                            <LinkIcon size={14} />
                                                            Link Existing Folder
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {requestFiles.map(file => (
                                                        <div
                                                            key={file.id}
                                                            onClick={() => {
                                                                setPreviewFile({
                                                                    name: file.name,
                                                                    url: file.webViewLink,
                                                                    previewUrl: file.previewUrl,
                                                                    type: file.mimeType
                                                                });
                                                                setIsPreviewOpen(true);
                                                            }}
                                                            className="flex items-center gap-3 p-4 rounded-xl bg-shark/15 border border-shark/40 hover:border-[#279da6]/30 hover:bg-shark/25 cursor-pointer transition-all group"
                                                        >
                                                            <div className="w-10 h-10 rounded-lg bg-shark/40 border border-shark flex items-center justify-center shrink-0">
                                                                {getFileIcon(file.mimeType)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-iron truncate group-hover:text-white transition-colors">{file.name}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-storm-gray/60">{file.folder}</span>
                                                                    {file.size && (
                                                                        <>
                                                                            <span className="text-storm-gray/30">·</span>
                                                                            <span className="text-[9px] text-storm-gray/60">{formatFileSize(file.size)}</span>
                                                                        </>
                                                                    )}
                                                                    {file.createdTime && (
                                                                        <>
                                                                            <span className="text-storm-gray/30">·</span>
                                                                            <span className="text-[9px] text-storm-gray/60">
                                                                                {formatDate(file.createdTime)}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <a
                                                                href={file.webViewLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="p-2 rounded-lg hover:bg-shark text-storm-gray/40 hover:text-[#279da6] transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                <ExternalLink size={14} />
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Sidebar - Summary */}
                            <div className="hidden lg:flex w-[340px] border-l border-shark bg-[#121214] flex-col p-6 overflow-y-auto custom-scrollbar">
                                <div className="space-y-8">
                                    {/* Base Info */}
                                    <div>
                                        <h4 className="text-[18px] font-bold text-white mb-1 uppercase tracking-tight leading-tight">{task.title}</h4>
                                        <div className="text-[12px] text-[#ff2056] font-bold uppercase tracking-wider">
                                            Created: {formatDate(task.created_at)}
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        {/* Linked Request - Read Only styling like Task Title */}
                                        <div className="pb-4 border-b border-shark/40">
                                            {task.request_links?.[0] ? (
                                                <div
                                                    onClick={() => router.push(`/requests/${task.request_links?.[0]?.request?.slug || task.request_links?.[0]?.request?.id}?tab=tasks`)}
                                                    className="cursor-pointer group select-none"
                                                >
                                                    <div className="text-[12px] text-[#279da6] mb-1 uppercase tracking-wider font-bold">
                                                        Linked Request
                                                    </div>
                                                    <h4 className="text-[18px] font-bold text-white uppercase tracking-tight leading-tight group-hover:text-[#279da6] transition-colors">
                                                        {task.request_links?.[0]?.request?.title || 'Unknown Request'}
                                                    </h4>
                                                </div>
                                            ) : (
                                                <div className="text-[11px] text-storm-gray/40 italic">
                                                    No linked request
                                                </div>
                                            )}
                                        </div>
                                        {/* Creator - Styled like "Client" in Request Page */}
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="w-20 text-[12px] font-bold text-storm-gray shrink-0 uppercase">Created By:</span>
                                            <div className="flex-1 flex items-center gap-2.5 bg-transparent border-none px-3.5 py-2.5 transition-all">
                                                <div className="w-[46px] h-[46px] rounded-full bg-shark flex items-center justify-center text-sm text-[#279da6] font-black shrink-0 border border-white/5 shadow-inner overflow-hidden">
                                                    {task.creator?.avatar_url ? (
                                                        <img src={task.creator.avatar_url} alt={task.creator.full_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        task.creator?.full_name?.split(' ').map(n => n[0]).join('')
                                                    )}
                                                </div>
                                                <div className="min-w-0 pr-1 flex flex-col">
                                                    <p className="text-[12px] font-black text-[#279da6] uppercase tracking-wider truncate mb-0.5">Contributor</p>
                                                    <p className="text-[12px] font-bold text-iron leading-tight truncate uppercase tracking-wider">{task.creator?.full_name || 'System'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[12px] font-bold text-storm-gray w-20 uppercase">Status</span>
                                            <CustomDropdown
                                                value={task.status}
                                                onChange={(val) => handleUpdateField('status', val)}
                                                options={[
                                                    { label: 'Todo', value: 'Todo', icon: <Circle size={14} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                    { label: 'In Progress', value: 'In Progress', icon: <Loader2 size={14} className="text-amber-500" />, color: 'text-amber-500' },
                                                    { label: 'Review', value: 'Review', icon: <Eye size={14} className="text-blue-400" />, color: 'text-blue-400' },
                                                    { label: 'Done', value: 'Done', icon: <CheckCircle2 size={14} className="text-emerald-500" />, color: 'text-emerald-500' },
                                                ]}
                                                className="flex-1"
                                            />
                                        </div>

                                        {/* Priority */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[12px] font-bold text-storm-gray w-20 uppercase">Priority</span>
                                            <CustomDropdown
                                                value={task.priority}
                                                onChange={(val) => handleUpdateField('priority', val)}
                                                options={[
                                                    { label: 'Low', value: 'Low', icon: <Flag size={14} className="text-storm-gray" />, color: 'text-storm-gray' },
                                                    { label: 'Medium', value: 'Medium', icon: <Flag size={14} className="text-blue-400" />, color: 'text-blue-400' },
                                                    { label: 'High', value: 'High', icon: <Flag size={14} className="text-amber-500" />, color: 'text-amber-500' },
                                                    { label: 'Critical', value: 'Critical', icon: <Flag size={14} className="text-rose-500" />, color: 'text-rose-500' },
                                                ]}
                                                className="flex-1"
                                            />
                                        </div>

                                        {/* Assigned To */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[12px] font-bold text-storm-gray w-20 uppercase">Assigned To</span>
                                            <CustomDropdown
                                                value={task.assigned_to || ''}
                                                onChange={(val) => handleUpdateField('assigned_to', val)}
                                                options={[
                                                    { label: 'Unassigned', value: '' },
                                                    ...teamMembers.filter((tm: any) => tm.profile_id).map((tm: any) => ({
                                                        label: tm.name || 'Unknown',
                                                        value: tm.profile_id,
                                                        icon: tm.avatar_url ? (
                                                            <div className="w-[46px] h-[46px] rounded-full overflow-hidden border border-white/10">
                                                                <img src={tm.avatar_url} alt={tm.name} className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-[46px] h-[46px] rounded-full bg-shark flex items-center justify-center text-sm text-[#279da6] font-black shrink-0 border border-white/5 shadow-inner">
                                                                {tm.name?.split(' ').map((n: string) => n[0]).join('')}
                                                            </div>
                                                        )
                                                    }))
                                                ]}
                                                className="flex-1"
                                            />
                                        </div>


                                        {/* Due Date */}
                                        <div className="flex items-center justify-between gap-4 h-11">
                                            <span className="w-20 text-[12px] font-bold text-storm-gray shrink-0 uppercase">Due Date:</span>
                                            <div className="flex-1 flex justify-start">
                                                <CustomDatePicker
                                                    value={task.due_date}
                                                    onChange={(dateString) => handleUpdateField('due_date', dateString || null)}
                                                    placeholder="NOT SET"
                                                    variant="minimal"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Delete Button */}
                                    {isSuperAdmin && (
                                        <div className="pt-6 border-t border-shark mt-auto">
                                            <button
                                                onClick={() => setIsDeleteModalOpen(true)}
                                                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/10 transition-all font-black text-[10px] uppercase tracking-widest group"
                                            >
                                                <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                                                Delete Task
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {
                isDeleteModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                        <div className="bg-[#18181B] border border-rose-500/20 rounded-[32px] p-8 max-w-md w-full shadow-[0_0_50px_rgba(244,63,94,0.15)] animate-slide-up relative overflow-hidden">
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-[80px]" />

                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-6 mx-auto">
                                    <Trash2 size={32} />
                                </div>

                                <h2 className="text-xl font-black text-white text-center uppercase tracking-tight mb-3">Delete Task?</h2>
                                <p className="text-storm-gray text-center text-sm leading-relaxed mb-8">
                                    You are about to permanently delete <span className="text-white font-bold">"{task.title}"</span>. This action will remove all messages and attachments associated with this task. This cannot be undone.
                                </p>

                                {deleteError && (
                                    <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 text-xs font-bold animate-shake">
                                        <AlertCircle size={16} />
                                        {deleteError}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => {
                                            setIsDeleteModalOpen(false);
                                            setDeleteError(null);
                                        }}
                                        disabled={isDeleting}
                                        className="py-4 rounded-2xl bg-shark/40 border border-shark hover:bg-shark/60 text-iron font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeleteTask}
                                        disabled={isDeleting}
                                        className="py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <Loader2 size={14} className="animate-spin" />
                                                Deleting...
                                            </>
                                        ) : (
                                            'Confirm Delete'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            <FilePreviewModal
                isOpen={isPreviewOpen}
                onClose={() => { setIsPreviewOpen(false); setPreviewFile(null); }}
                file={previewFile}
            />
        </>
    );
}
