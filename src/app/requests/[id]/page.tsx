'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
    ChevronLeft,
    ChevronDown,
    MoreHorizontal,
    Send,
    Paperclip,
    Calendar,
    User,
    Tag,
    Trash2,
    AlertCircle,
    CheckCircle2,
    Clock,
    MessageSquare,
    Loader2,
    ListFilter,
    Bold,
    Italic,
    Underline,
    List,
    Link as LinkIcon,
    Smile,
    Plus,
    X,
    Check,
    UserPlus,
    FileText,
    Image as ImageIcon,
    Film,
    FolderOpen,
    CheckSquare,
    ExternalLink,
    RefreshCw,
    Pencil,
    UserCog,
    Flag,
    Circle,
    Eye,
    User as UserIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import ImpersonationWarning from '@/components/ImpersonationWarning';
import CustomDropdown from '@/components/CustomDropdown';
import FilePreviewModal from '@/components/FilePreviewModal';
import TasksTable from '@/components/TasksTable';
import CustomDatePicker from '@/components/CustomDatePicker';
import { TaskItem } from '@/lib/data/tasks';
import { formatDate } from '@/lib/dateUtils';

interface Message {
    id: string;
    request_id: string;
    sender_id: string;
    message: string;
    attachments: any[];
    is_read: boolean;
    created_at: string;
    sender: {
        full_name: string;
        role: string;
        avatar_url?: string | null;
    };
    is_edited?: boolean;
}

interface RequestDetails {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    created_at: string;
    due_date: string | null;
    client: {
        id: string;
        full_name: string;
        email: string;
        organization?: string;
        avatar_url?: string | null;
    } | null;
    assignee: {
        id: string;
        full_name: string;
        avatar_url?: string | null;
    } | null;
    service: string | null;
    start_date: string | null;
    time_estimate: string | null;
    tags: string[];
    assigned_to: string | null;
    request_number?: number;
}

interface Profile {
    id: string;
    full_name: string;
    avatar_url: string | null;
    email?: string;
    role?: string;
}

interface TeamMember {
    id: string;
    name: string;
    email: string;
    department: string | null;
    position: string | null;
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

interface LinkedTask {
    id: string;
    title: string;
    status: string;
    priority: string;
    assigned_to: string | null;
    assignee?: { id: string; full_name: string } | null;
    due_date: string | null;
    created_at: string;
}

export default function RequestDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { profile, viewAsProfile, isImpersonating } = useAuth();
    const displayProfile = viewAsProfile || profile;
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);
    const [request, setRequest] = useState<RequestDetails | null>(null);
    const initialTab = (searchParams.get('tab') as 'request' | 'tasks' | 'files') || 'tasks';
    const [activeTab, setActiveTabInternal] = useState<'request' | 'tasks' | 'files'>(initialTab);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isOnline, setIsOnline] = useState(true); // Mock status
    const [isUploading, setIsUploading] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editedMessageContent, setEditedMessageContent] = useState('');






    // Preview state
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState<any | null>(null);

    // Delete state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        const tab = searchParams.get('tab') as 'request' | 'tasks' | 'files';
        if (tab && tab !== activeTab) {
            setActiveTabInternal(tab);
        }
    }, [searchParams]);

    const setActiveTab = (tab: 'request' | 'tasks' | 'files') => {
        setActiveTabInternal(tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.replace(`/requests/${id}?${params.toString()}`);
    };
    const [linkedTasks, setLinkedTasks] = useState<TaskItem[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [requestFiles, setRequestFiles] = useState<DriveFile[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [isSubmittingTask, setIsSubmittingTask] = useState(false);
    const [taskFormData, setTaskFormData] = useState({
        title: '',
        priority: 'Medium',
        description: '',
        assigned_to: '',
        due_date: '',
        request_ids: [] as string[]
    });
    const [allRequests, setAllRequests] = useState<any[]>([]);
    const [isCreatingRequestedFolder, setIsCreatingRequestedFolder] = useState(false);
    const [isLinkFolderModalOpen, setIsLinkFolderModalOpen] = useState(false);
    const [linkedFolderId, setLinkedFolderId] = useState('');
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState('');

    // WYSIWYG formatting helpers
    const execFormat = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        // Sync state for send button disabled check
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
        setNewMessage(text); // Keep in sync for disabled state checks
    };

    // Check if a message is HTML (new format) vs plain text (old format)
    const isHtmlContent = (text: string) => /<[a-z][\s\S]*>/i.test(text);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (id) {
            const initPage = async () => {
                setIsLoading(true);
                try {
                    await Promise.all([
                        fetchRequestDetails(),
                        fetchMessages(),
                        fetchLinkedTasks(),
                        fetchTeamMembers(),
                        fetchProfiles()
                    ]);
                } finally {
                    setIsLoading(false);
                }
            };

            initPage();
        }
    }, [id]);

    useEffect(() => {
        if (request?.id) {
            // Subscribe to real-time messages using the actual UUID
            const channel = supabase
                .channel(`request_messages:${request.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'request_messages',
                        filter: `request_id=eq.${request.id}`,
                    },
                    (payload) => {
                        const newMsg = payload.new as Message;
                        setMessages(prev => {
                            // Check if message already exists (e.g., from optimistic update)
                            if (prev.some(m => m.id === newMsg.id)) return prev;

                            // If it's from another user, we need to fetch details or wait for re-fetch
                            if (newMsg.sender_id !== profile?.id) {
                                fetchMessages();
                            }
                            return prev;
                        });
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [request?.id, profile?.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchRequestDetails = async () => {
        try {
            const response = await fetch(`/api/requests?id=${id}`);
            const data = await response.json();
            if (response.ok) {
                const found = Array.isArray(data) ? data.find((r: any) => r.id === id || r.slug === id) : data;

                // ACCESS CONTROL for Team Members
                const isTeamMember = displayProfile?.role === 'team_member';
                const isTeamAdmin = displayProfile?.team_role === 'admin';
                if (found && isTeamMember && !isTeamAdmin && found.assigned_to !== displayProfile?.id) {
                    router.push('/requests');
                    return;
                }

                setRequest(found);
                // Pre-set new task assignee to request assignee
                if (found.assigned_to && !taskFormData.assigned_to) {
                    setTaskFormData(prev => ({ ...prev, assigned_to: found.assigned_to, request_ids: [found.id] }));
                } else {
                    setTaskFormData(prev => ({ ...prev, request_ids: [found.id] }));
                }
            }

            // Fetch team members for assignment dropdown
            const teamRes = await fetch('/api/team');
            if (teamRes.ok) {
                const teamData = await teamRes.json();
                setTeamMembers(teamData);
            }
        } catch (error) {
            console.error('Error fetching request details:', error);
        }
    };

    const fetchMessages = async () => {
        try {
            const response = await fetch(`/api/requests/${id}/messages`);
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

    const fetchProfiles = async () => {
        try {
            const { data, error } = await supabase.from('profiles').select('id, full_name, avatar_url, email, role');
            if (error) throw error;
            setProfiles(data || []);
        } catch (error) {
            console.error('Error fetching profiles:', error);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent, attachments: any[] = []) => {
        if (e) e.preventDefault();
        const editorHtml = editorRef.current?.innerHTML || '';
        const textContent = editorRef.current?.textContent?.trim() || '';

        if ((!textContent && attachments.length === 0) || !displayProfile || isSending) return;

        // Use HTML content for the message (preserves formatting)
        const messageContent = textContent ? editorHtml : '';
        setIsSending(true);
        setNewMessage('');
        if (editorRef.current) editorRef.current.innerHTML = '';

        // Optimistic message
        const optimisticId = `temp-${Date.now()}`;
        const tempMessage: Message = {
            id: optimisticId,
            request_id: id as string,
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

        // Add to local state immediately
        setMessages(prev => [...prev, tempMessage]);

        try {
            const response = await fetch(`/api/requests/${id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageContent,
                    sender_id: displayProfile.id,
                    attachments
                })
            });

            if (!response.ok) {
                // Remove optimistic message on error
                setMessages(prev => prev.filter(m => m.id !== optimisticId));
                if (editorRef.current) editorRef.current.innerHTML = messageContent;
                setNewMessage(textContent);
            } else {
                const finalMsg = await response.json();
                // Replace temp message with server message
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


    const handleEditMessage = async (messageId: string, content: string) => {
        if (!content.trim()) return;

        try {
            const response = await fetch(`/api/requests/${id}/messages`, {
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
                const err = await response.json();
                alert(`Update failed: ${err.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Update error:', error);
            alert("Error updating message");
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (!confirm('Are you sure you want to delete this message?')) return;

        try {
            const response = await fetch(`/api/requests/${id}/messages?messageId=${messageId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setMessages(prev => prev.filter(m => m.id !== messageId));
            } else {
                const err = await response.json();
                alert(`Delete failed: ${err.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert("Error deleting message");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !displayProfile) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('requestId', id as string);
        formData.append('senderId', displayProfile.id);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                // Send a special message with the attachment
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

    const handleUpdateField = async (field: string, value: any) => {
        if (!request) return;

        // Optimistic update
        const originalRequest = { ...request };
        const newRequest = { ...request, [field]: value };

        // Handle nested assignee update logic for UI
        if (field === 'assigned_to') {
            const newAssignee = profiles.find(p => p.id === value);
            newRequest.assignee = newAssignee || null;
        }

        setRequest(newRequest);

        try {
            const response = await fetch(`/api/requests?id=${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            });

            if (!response.ok) {
                setRequest(originalRequest);
                alert(`Failed to update ${field}`);
            }
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
            setRequest(originalRequest);
        }
    };

    const handleUpdateDueDate = (date: string | null) => {
        handleUpdateField('due_date', date);
    };

    const handleAddTag = async () => {
        if (!request || !newTag.trim()) return;
        const updatedTags = [...(request.tags || []), newTag.trim()];
        setNewTag('');
        setIsAddingTag(false);
        handleUpdateField('tags', updatedTags);
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        if (!request) return;
        const updatedTags = request.tags.filter(t => t !== tagToRemove);
        handleUpdateField('tags', updatedTags);
    };


    const handleDeleteRequest = async () => {
        if (!request) return;
        setIsDeleting(true);
        setDeleteError(null);

        try {
            const response = await fetch(`/api/requests?id=${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                router.push('/requests');
            } else {
                const err = await response.json();
                setDeleteError(err.error || 'Failed to delete request');
            }
        } catch (error) {
            console.error('Delete request failed:', error);
            setDeleteError('An unexpected error occurred while deleting the request');
        } finally {
            setIsDeleting(false);
        }
    };

    const involvedMembers = teamMembers.filter(tm =>
        tm.profile_id && linkedTasks.some(task => task.assigned_to === tm.profile_id)
    );

    // Fetch linked tasks for this request
    const fetchLinkedTasks = async () => {
        setIsLoadingTasks(true);
        try {
            const response = await fetch(`/api/tasks?request_id=${id}`);
            if (response.ok) {
                const data = await response.json();
                setLinkedTasks(data);
            }
        } catch (error) {
            console.error('Error fetching linked tasks:', error);
        } finally {
            setIsLoadingTasks(false);
        }
    };

    const handleTaskUpdate = async (taskId: string, field: string, value: any) => {
        try {
            const response = await fetch(`/api/tasks`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: taskId,
                    [field]: value
                })
            });

            if (response.ok) {
                // Refresh linked tasks to update sidebar in real-time
                await fetchLinkedTasks();
                // Also trigger a router refresh for other layout components that might use this data
                router.refresh();
            } else {
                alert(`Failed to update ${field}`);
            }
        } catch (error) {
            console.error(`Error updating task field ${field}:`, error);
        }
    };

    // Fetch request files from Google Drive
    const fetchRequestFiles = async () => {
        setIsLoadingFiles(true);
        try {
            const response = await fetch(`/api/requests/${id}/files`);
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

    // Fetch all requests for "Link to Requests" dropdown
    const fetchAllRequests = async () => {
        try {
            const res = await fetch('/api/requests');
            if (res.ok) {
                const data = await res.json();
                setAllRequests(data);
            }
        } catch (e) {
            console.error('Error fetching requests:', e);
        }
    };

    useEffect(() => {
        fetchAllRequests();
    }, []);

    // Create a task linked to this request
    const handleCreateLinkedTask = async () => {
        if (!taskFormData.title.trim() || !displayProfile) return;
        setIsSubmittingTask(true);
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: taskFormData.title.trim(),
                    description: taskFormData.description,
                    request_ids: taskFormData.request_ids.length > 0 ? taskFormData.request_ids : [id],
                    assigned_to: taskFormData.assigned_to || null,
                    created_by: displayProfile.id,
                    status: 'Todo',
                    priority: taskFormData.priority,
                    due_date: taskFormData.due_date || null
                })
            });
            if (response.ok) {
                setTaskFormData({ title: '', priority: 'Medium', description: '', assigned_to: request?.assigned_to || '', due_date: '', request_ids: [id as string] });
                setIsCreatingTask(false);
                fetchLinkedTasks();
            }
        } catch (error) {
            console.error('Error creating linked task:', error);
        } finally {
            setIsSubmittingTask(false);
        }
    };

    // Load tab data when tab changes
    useEffect(() => {
        if (activeTab === 'tasks' && linkedTasks.length === 0) {
            fetchLinkedTasks();
        } else if (activeTab === 'files' && requestFiles.length === 0) {
            fetchRequestFiles();
        }
    }, [activeTab]);

    const handleCreateFolder = async () => {
        setIsCreatingRequestedFolder(true);
        try {
            const response = await fetch(`/api/requests/${id}/files`, {
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

    if (isLoading && !request) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#09090B]">
                <Loader2 size={32} className="animate-spin text-[#279da6]" />
            </div>
        );
    }

    if (!request) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#09090B] text-iron">
                <div className="text-center">
                    <AlertCircle size={48} className="mx-auto mb-4 text-rose-500 opacity-50" />
                    <p className="font-bold">Request not found</p>
                    <button onClick={() => router.push('/requests')} className="mt-4 text-[#279da6] hover:underline">Return to list</button>
                </div>
            </div>
        );
    }

    // Check user roles
    const isSuperAdmin = displayProfile?.role === 'super_admin';
    const isTeamMember = displayProfile?.role === 'team_member';
    const isTeamAdmin = displayProfile?.team_role === 'admin';
    const isAdmin = isSuperAdmin || isTeamAdmin || displayProfile?.role === 'admin';
    const isInternal = isSuperAdmin || isTeamMember;
    const showTabs = isInternal; // Only show tabs for internal users

    const statusColor = (s: string) => {
        switch (s) {
            case 'Todo': return 'bg-storm-gray/20 text-storm-gray';
            case 'In Progress': return 'bg-blue-500/20 text-blue-400';
            case 'Review': return 'bg-amber-500/20 text-amber-400';
            case 'Done': return 'bg-emerald-500/20 text-emerald-400';
            default: return 'bg-shark text-iron';
        }
    };

    const priorityColor = (p: string) => {
        switch (p) {
            case 'Critical': return 'bg-rose-500';
            case 'High': return 'bg-amber-500';
            case 'Medium': return 'bg-blue-400';
            default: return 'bg-storm-gray';
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
                                label=""
                                labelIcon={<MessageSquare size={16} className="text-[#279da6]" />}
                                tabs={[
                                    { label: 'request', icon: <MessageSquare size={12} /> },
                                    { label: 'tasks', icon: <CheckSquare size={12} /> },
                                    ...(isSuperAdmin || isTeamAdmin ? [{ label: 'files', icon: <FolderOpen size={12} /> }] : [])
                                ]}
                                activeTab={activeTab}
                                setActiveTab={(tab) => setActiveTab(tab as any)}
                                tabCounts={{
                                    tasks: linkedTasks.length,
                                    files: requestFiles.length
                                }}
                                onCreate={(isAdmin && activeTab === 'tasks') ? () => setIsCreatingTask(true) : undefined}
                                isCreating={activeTab === 'tasks' ? isCreatingTask : false}
                                onConfirm={handleCreateLinkedTask}
                                onCancel={() => {
                                    setIsCreatingTask(false);
                                    setTaskFormData({ title: '', priority: 'Medium', description: '', assigned_to: request?.assigned_to || '', due_date: '', request_ids: [id as string] });
                                }}
                                label={
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500'}`} />
                                        <span className="text-[12px] text-storm-gray font-black uppercase tracking-[0.2em] opacity-70">
                                            {isOnline ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                }
                            >
                                <div className="hidden lg:flex items-center ml-4 flex-1 min-w-0">
                                    <h2 className="text-[22px] font-bold text-white uppercase tracking-tight truncate">
                                        #{request.request_number} {request.title}
                                    </h2>
                                </div>
                            </Header>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* Main Content Area */}
                            <div className="flex-1 flex flex-col overflow-hidden bg-[#09090B]/30">



                                {/* Tab Content */}
                                {activeTab === 'request' && (
                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                                            {/* Request Body */}
                                            <div className="pt-6 pb-8 px-8 max-w-4xl mx-auto w-full">
                                                <div className="mb-4">
                                                    {/* Title moved to header */}

                                                    <div className="relative mb-6 pt-1">
                                                        <div className="absolute -left-14 top-0 w-10 h-10 rounded-full bg-shark flex items-center justify-center text-[#279da6] border border-white/5 shadow-inner z-10">
                                                            <MessageSquare size={18} />
                                                        </div>
                                                        <div className="w-full">
                                                            <div className="bg-shark/20 border border-shark/50 rounded-2xl p-6 shadow-sm">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <span className="text-[12px] font-bold text-[#279da6] uppercase tracking-widest">Request Submitted</span>
                                                                    <span className="text-[12px] text-rose-500 font-bold uppercase tracking-widest">
                                                                        {new Date(request.created_at).toLocaleString('en-US', {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })}
                                                                    </span>
                                                                </div>
                                                                {isEditingDescription ? (
                                                                    <div className="space-y-3">
                                                                        <textarea
                                                                            value={editedDescription}
                                                                            onChange={(e) => setEditedDescription(e.target.value)}
                                                                            className="w-full bg-black/40 border border-[#279da6]/30 rounded-xl p-4 text-[12px] text-iron focus:outline-none focus:border-[#279da6] min-h-[120px] transition-all resize-none font-bold"
                                                                            placeholder="Enter request description..."
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
                                                                            {request.description}
                                                                        </p>
                                                                        {isAdmin && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditedDescription(request.description || '');
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
                                                            const isMe = msg.sender_id === displayProfile?.id;
                                                            return (
                                                                <div key={msg.id} className={`flex gap-4 group ${isMe ? 'flex-row-reverse' : ''}`}>
                                                                    <div className={`w-[46px] h-[46px] rounded-full flex items-center justify-center shrink-0 border border-white/5 shadow-lg relative overflow-hidden ${isMe ? 'bg-shark text-[#279da6]' : 'bg-shark text-[#279da6]'
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
                                                                                <span className="font-black text-sm">{profile?.full_name?.split(' ').map(n => n[0]).join('')}</span>
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
                                                                                <span className="font-black text-sm">{msg.sender?.full_name?.split(' ').map(n => n[0]).join('')}</span>
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
                                                                                {msg.is_edited && <span className="ml-1 opacity-60">(edited)</span>}
                                                                            </span>
                                                                            {isMe && (
                                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setEditingMessageId(msg.id);
                                                                                            setEditedMessageContent(msg.message);
                                                                                        }}
                                                                                        className="p-1 hover:bg-white/10 rounded transition-colors text-storm-gray hover:text-[#279da6]"
                                                                                    >
                                                                                        <Pencil size={10} />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                                                        className="p-1 hover:bg-white/10 rounded transition-colors text-storm-gray hover:text-rose-400"
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
                                                                            {/* Rich text message renderer — supports HTML (new) and plain text with markdown (old) */}
                                                                            {editingMessageId === msg.id ? (
                                                                                <div className="space-y-3">
                                                                                    <textarea
                                                                                        value={editedMessageContent}
                                                                                        onChange={(e) => setEditedMessageContent(e.target.value)}
                                                                                        className="w-full bg-black/40 border border-[#279da6]/30 rounded-xl p-3 text-[12px] font-bold text-iron focus:outline-none focus:border-[#279da6]/60 min-h-[100px] resize-none"
                                                                                        autoFocus
                                                                                    />
                                                                                    <div className="flex justify-end gap-2">
                                                                                        <button
                                                                                            onClick={() => setEditingMessageId(null)}
                                                                                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-storm-gray hover:text-white transition-all"
                                                                                        >
                                                                                            Cancel
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => handleEditMessage(msg.id, editedMessageContent)}
                                                                                            className="px-4 py-1.5 rounded-lg bg-[#279da6] text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#20838b] transition-all"
                                                                                        >
                                                                                            Save Changes
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    {isHtmlContent(msg.message) ? (
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
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                            {msg.attachments && msg.attachments.length > 0 && (
                                                                                <div className="mt-3 space-y-2">
                                                                                    {msg.attachments.map((at, idx) => {
                                                                                        const driveProxyUrl = at.drive_file_id ? `/api/drive/view?fileId=${at.drive_file_id}` : null;
                                                                                        const displayUrl = driveProxyUrl || at.url;

                                                                                        return (
                                                                                            <div
                                                                                                key={idx}
                                                                                                onClick={(e) => {
                                                                                                    e.preventDefault();
                                                                                                    e.stopPropagation();
                                                                                                    setPreviewFile({
                                                                                                        name: at.name,
                                                                                                        url: at.url,
                                                                                                        previewUrl: driveProxyUrl,
                                                                                                        type: at.type
                                                                                                    });
                                                                                                    setIsPreviewOpen(true);
                                                                                                }}
                                                                                                className="block group/at cursor-pointer"
                                                                                            >
                                                                                                {at.type?.startsWith('image/') ? (
                                                                                                    <div className="relative rounded-lg overflow-hidden border border-white/10 shadow-lg max-w-[240px]">
                                                                                                        <img src={displayUrl} alt={at.name} className="w-full h-auto" />
                                                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/at:opacity-100 transition-opacity flex items-center justify-center">
                                                                                                            <span className="text-[10px] font-black uppercase text-white">View Full Image</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 transition-all max-w-[280px]">
                                                                                                        <Paperclip size={18} className="text-[#279da6]" />
                                                                                                        <div className="min-w-0">
                                                                                                            <p className="text-xs font-bold truncate text-white">{at.name}</p>
                                                                                                            <p className="text-[10px] text-storm-gray font-bold uppercase tracking-widest">View File</p>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
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
                                                            disabled={isSending || !newMessage.trim()}
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

                                {/* Tasks Tab */}
                                {activeTab === 'tasks' && (
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                        <div className="w-full">
                                            {/* Inline Task Creation Form — appears when + NEW is clicked */}
                                            <div
                                                className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCreatingTask
                                                    ? 'max-h-[600px] opacity-100 mb-8 translate-y-0 scale-100 blur-0'
                                                    : 'max-h-0 opacity-0 mb-0 -translate-y-4 scale-95 blur-md pointer-events-none'
                                                    }`}
                                            >
                                                <div className="p-1 bg-[#121214]/90 backdrop-blur-2xl border border-[#279da6]/30 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(39,157,166,0.08)] ring-1 ring-white/5 relative overflow-hidden">
                                                    <div className="p-6 space-y-6">
                                                        <div className="flex items-start gap-6">
                                                            <div className="flex flex-col items-center gap-3 shrink-0">
                                                                <div className="w-14 h-14 rounded-2xl bg-amber-400/10 flex items-center justify-center text-amber-400 shadow-inner ring-1 ring-amber-400/20">
                                                                    <CheckSquare size={28} />
                                                                </div>
                                                                <p className="text-[10px] font-black text-storm-gray uppercase tracking-widest">Task</p>
                                                            </div>

                                                            <div className="flex-1 space-y-6">
                                                                {/* Top Row: Title & Priority & Assignee */}
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

                                                                {/* Bottom Row: Description & Due Date & Link to Requests */}
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
                                                                                {taskFormData.request_ids.map(rid => {
                                                                                    const req = allRequests.find((r: any) => r.id === rid);
                                                                                    return (
                                                                                        <div key={rid} className="flex items-center gap-1 px-2 py-0.5 bg-[#279da6]/10 border border-[#279da6]/20 rounded-md text-[9px] font-bold text-[#279da6]">
                                                                                            <span className="truncate max-w-[80px]">{req?.title || 'Unknown'}</span>
                                                                                            <button onClick={() => setTaskFormData({ ...taskFormData, request_ids: taskFormData.request_ids.filter(r => r !== rid) })}>
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
                                )}

                                {/* Files Tab */}
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
                            {activeTab !== 'tasks' && (
                                <div className="hidden lg:flex w-[340px] border-l border-shark bg-[#101011] flex-col p-6 overflow-y-auto custom-scrollbar">
                                    <div className="space-y-8 mt-2">
                                        {/* Base Info */}
                                        <div>
                                            <h4 className="text-[18px] font-bold text-white mb-1 uppercase tracking-tight leading-tight">{request.title}</h4>
                                            <div className="text-[12px] text-[#ff2056] font-bold uppercase tracking-wider">
                                                <span>Created: {formatDate(request.created_at)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-shark">
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="w-20 text-[12px] font-bold text-storm-gray shrink-0 uppercase tracking-wider">Client:</span>
                                                <div className="flex-1 flex items-center gap-2.5 bg-transparent border-none px-3.5 py-2.5 cursor-pointer transition-all">
                                                    <div className="w-[46px] h-[46px] rounded-full bg-shark flex items-center justify-center text-sm text-[#279da6] font-black shrink-0 border border-white/5 shadow-inner overflow-hidden">
                                                        {request.client?.avatar_url ? (
                                                            <img src={request.client.avatar_url} alt={request.client.full_name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            request.client?.full_name?.split(' ').map(n => n[0]).join('')
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 pr-1 flex flex-col">
                                                        {request.client?.organization && (
                                                            <p className="text-[12px] font-black text-[#279da6] uppercase tracking-wider truncate mb-0.5">{request.client.organization}</p>
                                                        )}
                                                        <p className="text-[12px] font-bold text-iron leading-tight truncate uppercase tracking-wider">{request.client?.full_name}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-[12px] font-bold text-storm-gray w-20 uppercase tracking-wider">Status</span>
                                                <CustomDropdown
                                                    value={request.status}
                                                    onChange={(val) => handleUpdateField('status', val)}
                                                    options={[
                                                        { label: 'Todo', value: 'Todo', icon: <Circle size={14} className="text-[#279da6]" />, color: 'text-[#279da6]' },
                                                        { label: 'In Progress', value: 'In Progress', icon: <Loader2 size={14} className="text-amber-500" />, color: 'text-amber-500' },
                                                        { label: 'Review', value: 'Review', icon: <Eye size={14} className="text-blue-400" />, color: 'text-blue-400' },
                                                        { label: 'Done', value: 'Done', icon: <Check size={14} className="text-emerald-500" />, color: 'text-emerald-500' },
                                                    ]}
                                                    className="flex-1"
                                                />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-[12px] font-bold text-storm-gray w-20 uppercase tracking-wider">Priority</span>
                                                <CustomDropdown
                                                    value={request.priority}
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

                                            <div className="flex items-center gap-2">
                                                <span className="text-[12px] font-bold text-storm-gray w-20 uppercase tracking-wider">Assigned To</span>
                                                <CustomDropdown
                                                    value={request.assigned_to || ''}
                                                    onChange={(val) => handleUpdateField('assigned_to', val)}
                                                    options={[
                                                        { label: 'Unassigned', value: '' },
                                                        ...teamMembers.filter((tm: any) => tm.profile_id).map((tm: any) => ({
                                                            label: tm.name || tm.profile?.full_name || tm.profile?.email || 'Unknown',
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

                                            <div className="flex items-center justify-between gap-4 h-11">
                                                <span className="w-20 text-[12px] font-bold text-storm-gray shrink-0 uppercase tracking-wider">Due Date:</span>
                                                <div className="flex-1 flex justify-start">
                                                    <CustomDatePicker
                                                        value={request.due_date}
                                                        onChange={(dateString) => handleUpdateDueDate(dateString || null)}
                                                        placeholder="NOT SET"
                                                        variant="minimal"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Team Members - Derived from Tasks */}
                                        <div className="pt-6 border-t border-shark">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-[12px] font-black uppercase tracking-widest text-storm-gray">Team Members</h4>
                                            </div>
                                            {involvedMembers.length === 0 ? (
                                                <p className="text-[11px] text-storm-gray/50 italic">No team members assigned to tasks.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {involvedMembers.map(tm => (
                                                        <div key={tm.id} className="flex items-center gap-3 p-2 rounded-lg bg-shark/20 border border-shark/40 transition-all">
                                                            <div className="w-[46px] h-[46px] rounded-full bg-shark flex items-center justify-center text-sm font-black text-[#279da6] shrink-0 overflow-hidden border border-white/5 shadow-inner">
                                                                {tm.avatar_url ? (
                                                                    <img src={tm.avatar_url} alt={tm.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    tm.name.split(' ').map(n => n[0]).join('')
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[12px] font-bold text-iron truncate uppercase tracking-wider">{tm.name}</p>
                                                                <p className="text-[12px] font-black uppercase tracking-widest text-[#279da6]">Assignee</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {isSuperAdmin && (
                                            <div className="pt-6 border-t border-shark mt-auto">
                                                <button
                                                    onClick={() => setIsDeleteModalOpen(true)}
                                                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/10 transition-all font-black text-[12px] uppercase tracking-widest group"
                                                >
                                                    <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                                                    Delete Request
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div >


            {/* Delete Modal */}
            {
                isDeleteModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                        <div className="bg-[#18181B] border border-rose-500/20 rounded-[32px] p-8 max-w-md w-full shadow-[0_0_50px_rgba(244,63,94,0.15)] animate-slide-up relative overflow-hidden">
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-[80px]" />
                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-6 mx-auto">
                                    <Trash2 size={32} />
                                </div>
                                <h2 className="text-xl font-black text-white text-center uppercase tracking-tight mb-3">Delete Request?</h2>
                                <p className="text-storm-gray text-center text-sm leading-relaxed mb-8">
                                    You are about to permanently delete <span className="text-white font-bold">"{request?.title}"</span>. This action will remove all messages and attachments associated with this request. This cannot be undone.
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
                                        onClick={handleDeleteRequest}
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
