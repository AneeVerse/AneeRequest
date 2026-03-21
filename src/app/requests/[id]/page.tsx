'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
    MessageSquare,
    Loader2,
    ImageIcon,
    Film,
    FileText,
    AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import ImpersonationWarning from '@/components/ImpersonationWarning';
import FilePreviewModal from '@/components/FilePreviewModal';
import { TaskItem } from '@/lib/data/tasks';
import { formatDate } from '@/lib/dateUtils';

// Modular Components
import RequestHeader from '@/components/requests/RequestHeader';
import RequestMessages from '@/components/requests/RequestMessages';
import RequestSidebar from '@/components/requests/RequestSidebar';
import TasksTab from '@/components/requests/TasksTab';
import FilesTab from '@/components/requests/FilesTab';
import LinkFolderModal from '@/components/requests/LinkFolderModal';
import DeleteModal from '@/components/requests/DeleteModal';

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

export default function RequestDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = params?.id as string;
    const { profile, viewAsProfile, isImpersonating } = useAuth();
    const displayProfile = viewAsProfile || profile;

    const [request, setRequest] = useState<RequestDetails | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'request' | 'tasks' | 'files'>((searchParams?.get('tab') as any) || 'request');
    const [isOnline, setIsOnline] = useState(true);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Request editing states
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState('');

    // Task linking states
    const [linkedTasks, setLinkedTasks] = useState<TaskItem[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [allRequests, setAllRequests] = useState<any[]>([]);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [taskFormData, setTaskFormData] = useState({
        title: '',
        priority: 'Medium',
        description: '',
        assigned_to: '',
        due_date: '',
        request_ids: [id]
    });

    // File states
    const [requestFiles, setRequestFiles] = useState<any[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [isCreatingRequestedFolder, setIsCreatingRequestedFolder] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState<any>(null);

    // Link Folder logic states
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [linkFolderInput, setLinkFolderInput] = useState('');
    const [isValidatingLink, setIsValidatingLink] = useState(false);
    const [linkFolderError, setLinkFolderError] = useState<string | null>(null);

    // Delete logic states
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Message edit states
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editedMessageContent, setEditedMessageContent] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null!);
    const fileInputRef = useRef<HTMLInputElement>(null!);
    const editorRef = useRef<HTMLDivElement>(null!);

    const isAdmin = displayProfile?.role === 'super_admin' || displayProfile?.team_role === 'admin';
    const isSuperAdmin = displayProfile?.role === 'super_admin';
    const isTeamAdmin = displayProfile?.team_role === 'admin';

    useEffect(() => {
        if (id) {
            fetchRequestDetails();
            fetchMessages();
            fetchLinkedTasks();
            fetchAllRequests();
            fetchTeamMembers();
            fetchRequestFiles();
        }
    }, [id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (request) {
            setEditedDescription(request.description || '');
        }
    }, [request]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchRequestDetails = async () => {
        if (!id) return;
        try {
            const { data, error } = await supabase
                .from('requests')
                .select(`
                    *,
                    client:client_id (*),
                    assignee:assigned_to (id, full_name, avatar_url)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            setRequest(data);
        } catch (error) {
            console.error('Error fetching request details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMessages = async () => {
        if (!id) return;
        try {
            const { data, error } = await supabase
                .from('request_messages')
                .select(`
                    *,
                    sender:sender_id (full_name, avatar_url, role)
                `)
                .eq('request_id', id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const fetchLinkedTasks = async () => {
        if (!id) return;
        setIsLoadingTasks(true);
        try {
            const { data, error } = await supabase
                .from('task_requests')
                .select(`
                    task:task_id (
                        *,
                        assignee:assigned_to (id, full_name, avatar_url)
                    )
                `)
                .eq('request_id', id);

            if (error) throw error;
            setLinkedTasks(data?.map(d => (d.task as unknown) as TaskItem) || []);
        } catch (error) {
            console.error('Error fetching linked tasks:', error);
        } finally {
            setIsLoadingTasks(false);
        }
    };

    const fetchAllRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('requests')
                .select('id, title')
                .order('title');
            if (error) throw error;
            setAllRequests(data || []);
        } catch (error) {
            console.error('Error fetching all requests:', error);
        }
    };

    const fetchTeamMembers = async () => {
        try {
            const { data, error } = await supabase
                .from('team_members')
                .select('*');
            if (error) throw error;
            setTeamMembers(data || []);
        } catch (error) {
            console.error('Error fetching team members:', error);
        }
    };

    const fetchRequestFiles = async () => {
        if (!id) return;
        setIsLoadingFiles(true);
        try {
            const res = await fetch(`/api/requests/${id}/files`);
            const data = await res.json();
            setRequestFiles(data.files || []);
        } catch (error) {
            console.error('Error fetching request files:', error);
        } finally {
            setIsLoadingFiles(false);
        }
    };

    const handleSendMessage = async (contentOverride?: string, attachments?: any[]) => {
        const messageToSend = contentOverride || editorRef.current?.innerHTML || '';
        if (!messageToSend.trim() && !contentOverride && (!attachments || attachments.length === 0)) return;

        setIsSending(true);
        try {
            const { error } = await supabase
                .from('request_messages')
                .insert({
                    request_id: id,
                    sender_id: displayProfile?.id,
                    message: messageToSend,
                    attachments: attachments || []
                });

            if (error) throw error;
            if (editorRef.current) editorRef.current.innerHTML = '';
            setNewMessage('');
            fetchMessages();
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('request-attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('request-attachments')
                .getPublicUrl(filePath);

            const attachment = {
                name: file.name,
                url: publicUrl,
                type: file.type,
                size: file.size
            };

            await handleSendMessage(`Shared a file: ${file.name}`, [attachment]);
        } catch (error) {
            console.error('Error uploading file:', error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleUpdateField = async (field: string, value: any) => {
        if (!id) return;
        try {
            const { error } = await supabase
                .from('requests')
                .update({ [field]: value })
                .eq('id', id);

            if (error) throw error;
            fetchRequestDetails();
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
        }
    };

    const handleUpdateDueDate = async (date: string | null) => {
        await handleUpdateField('due_date', date);
    };

    const handleCreateLinkedTask = async () => {
        if (!taskFormData.title.trim()) return;

        try {
            const { data: taskData, error: taskError } = await supabase
                .from('tasks')
                .insert({
                    title: taskFormData.title,
                    priority: taskFormData.priority,
                    description: taskFormData.description,
                    assigned_to: taskFormData.assigned_to || null,
                    due_date: taskFormData.due_date || null,
                    status: 'Todo'
                })
                .select()
                .single();

            if (taskError) throw taskError;

            if (taskFormData.request_ids.length > 0) {
                const links = taskFormData.request_ids.map(rid => ({
                    task_id: taskData.id,
                    request_id: rid
                }));
                const { error: linkError } = await supabase
                    .from('task_requests')
                    .insert(links);
                if (linkError) throw linkError;
            }

            setIsCreatingTask(false);
            setTaskFormData({
                title: '',
                priority: 'Medium',
                description: '',
                assigned_to: '',
                due_date: '',
                request_ids: [id]
            });
            fetchLinkedTasks();
        } catch (error) {
            console.error('Error creating task:', error);
        }
    };

    const handleTaskUpdate = async (taskId: string, field: string, value: any) => {
        try {
            const { error } = await supabase
                .from('tasks')
                .update({ [field]: value })
                .eq('id', taskId);
            if (error) throw error;
            fetchLinkedTasks();
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const handleCreateFolder = async () => {
        if (!id) return;
        setIsCreatingRequestedFolder(true);
        try {
            const res = await fetch(`/api/requests/${id}/files`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to create folder');
            fetchRequestFiles();
        } catch (error) {
            console.error('Error creating folder:', error);
        } finally {
            setIsCreatingRequestedFolder(false);
        }
    };

    const handleLinkFolder = async () => {
        if (!linkFolderInput.trim() || !id) return;
        setIsValidatingLink(true);
        setLinkFolderError(null);

        try {
            const res = await fetch('/api/drive/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: linkFolderInput })
            });

            const data = await res.json();
            if (!data.valid) {
                setLinkFolderError(data.error || 'Invalid folder or no access');
                return;
            }

            const { error: updateError } = await supabase
                .from('requests')
                .update({ drive_folder_id: data.folderId })
                .eq('id', id);

            if (updateError) throw updateError;

            setIsLinkModalOpen(false);
            setLinkFolderInput('');
            fetchRequestFiles();
        } catch (error: any) {
            setLinkFolderError(error.message || 'Failed to link folder');
        } finally {
            setIsValidatingLink(false);
        }
    };

    const handleDeleteRequest = async () => {
        if (!id) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('requests')
                .delete()
                .eq('id', id);
            if (error) throw error;
            router.push('/requests');
        } catch (error: any) {
            setDeleteError(error.message || 'Failed to delete request');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditMessage = async (msgId: string, content: string) => {
        try {
            const { error } = await supabase
                .from('request_messages')
                .update({ message: content, is_edited: true })
                .eq('id', msgId);
            if (error) throw error;
            setEditingMessageId(null);
            fetchMessages();
        } catch (error) {
            console.error('Error editing message:', error);
        }
    };

    const handleDeleteMessage = async (msgId: string) => {
        if (!confirm('Are you sure you want to delete this message?')) return;
        try {
            const { error } = await supabase
                .from('request_messages')
                .delete()
                .eq('id', msgId);
            if (error) throw error;
            fetchMessages();
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const handleEditorInput = () => {
        if (editorRef.current) {
            setNewMessage(editorRef.current.innerText);
        }
    };

    const execFormat = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        if (editorRef.current) editorRef.current.focus();
    };

    const handleInsertLink = () => {
        const url = prompt('Enter URL:');
        if (url) execFormat('createLink', url);
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return <ImageIcon size={20} className="text-blue-400" />;
        if (mimeType.startsWith('video/')) return <Film size={20} className="text-purple-400" />;
        if (mimeType === 'application/pdf') return <FileText size={20} className="text-rose-400" />;
        return <FileText size={20} className="text-storm-gray" />;
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const involvedMembers = Array.from(new Set(linkedTasks.map(t => t.assigned_to).filter(Boolean)))
        .map(mid => teamMembers.find(tm => tm.profile_id === mid))
        .filter(Boolean);

    if (isLoading || !request) {
        return (
            <div className="h-screen bg-[#09090B] flex items-center justify-center">
                <Loader2 size={40} className="animate-spin text-[#279da6]" />
            </div>
        );
    }

    return (
        <>
            <div className={`flex h-screen bg-[#09090B] text-iron font-sans overflow-hidden transition-all duration-500 ${isImpersonating ? 'p-1.5' : ''}`} style={isImpersonating ? { backgroundColor: '#0f2b1a' } : undefined}>
                <Sidebar isCollapsed={isSidebarCollapsed} isMobileOpen={isMobileOpen} onMobileClose={() => setIsMobileOpen(false)} />

                <div className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative">
                    <div className={`flex-1 flex flex-col min-w-0 bg-[#101011] rounded-t-2xl overflow-hidden border-t border-l border-r mt-6 responsive-content-wrapper transition-all duration-500 ${isImpersonating ? 'border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15),0_0_40px_rgba(34,197,94,0.08),inset_0_0_20px_rgba(34,197,94,0.03)]' : 'border-shark'}`}>

                        <RequestHeader
                            isMobileOpen={isMobileOpen}
                            setIsMobileOpen={setIsMobileOpen}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            linkedTasksCount={linkedTasks.length}
                            requestFilesCount={requestFiles.length}
                            isSuperAdmin={isSuperAdmin}
                            isTeamAdmin={isTeamAdmin}
                            isAdmin={isAdmin}
                            isCreatingTask={isCreatingTask}
                            setIsCreatingTask={setIsCreatingTask}
                            handleCreateLinkedTask={handleCreateLinkedTask}
                            onCancelCreateTask={() => {
                                setIsCreatingTask(false);
                                setTaskFormData({ title: '', priority: 'Medium', description: '', assigned_to: '', due_date: '', request_ids: [id] });
                            }}
                            request={request}
                            isOnline={isOnline}
                        />

                        <div className="flex-1 flex overflow-hidden">
                            <div className="flex-1 flex flex-col overflow-hidden bg-[#09090B]/30">
                                {activeTab === 'request' && (
                                    <div className="flex-1 flex flex-col overflow-hidden">
                                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                                            <div className="pt-6 pb-8 px-8 max-w-4xl mx-auto w-full">
                                                <div className="relative mb-8 pt-1">
                                                    <div className="absolute -left-14 top-0 w-10 h-10 rounded-full bg-shark flex items-center justify-center text-[#279da6] border border-white/5 shadow-inner z-10">
                                                        <MessageSquare size={18} />
                                                    </div>
                                                    <div className="bg-shark/20 border border-shark/50 rounded-2xl p-6 shadow-sm">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <span className="text-[12px] font-bold text-[#279da6] uppercase tracking-widest">Request Submitted</span>
                                                            <span className="text-[12px] text-rose-500 font-bold uppercase tracking-widest">
                                                                {formatDate(request.created_at)}
                                                            </span>
                                                        </div>
                                                        {isEditingDescription ? (
                                                            <div className="space-y-3">
                                                                <textarea
                                                                    value={editedDescription}
                                                                    onChange={(e) => setEditedDescription(e.target.value)}
                                                                    className="w-full bg-black/40 border border-[#279da6]/30 rounded-xl p-4 text-[12px] text-iron focus:outline-none focus:border-[#279da6] min-h-[120px] transition-all resize-none font-bold"
                                                                />
                                                                <div className="flex items-center gap-2 justify-end">
                                                                    <button onClick={() => setIsEditingDescription(false)} className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-storm-gray hover:text-white transition-all">Cancel</button>
                                                                    <button onClick={async () => { await handleUpdateField('description', editedDescription); setIsEditingDescription(false); }} className="px-4 py-1.5 rounded-lg bg-[#279da6] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#20838b] transition-all shadow-lg shadow-[#279da6]/20">Save</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div onClick={() => isAdmin && setIsEditingDescription(true)} className={`text-[12px] font-bold leading-relaxed whitespace-pre-wrap ${isAdmin ? 'cursor-pointer hover:text-white transition-colors' : ''}`}>
                                                                {request.description || 'No description provided.'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="relative flex items-center justify-center my-12">
                                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-shark/40"></div></div>
                                                    <span className="relative px-4 py-1.5 bg-[#101011] border border-shark rounded-full text-[12px] font-bold text-storm-gray uppercase tracking-[0.2em]">Discussion Started</span>
                                                </div>

                                                <RequestMessages
                                                    messages={messages}
                                                    displayProfileId={displayProfile?.id}
                                                    profile={profile}
                                                    editingMessageId={editingMessageId}
                                                    setEditingMessageId={setEditingMessageId}
                                                    editedMessageContent={editedMessageContent}
                                                    setEditedMessageContent={setEditedMessageContent}
                                                    handleEditMessage={handleEditMessage}
                                                    handleDeleteMessage={handleDeleteMessage}
                                                    setPreviewFile={setPreviewFile}
                                                    setIsPreviewOpen={setIsPreviewOpen}
                                                    editorRef={editorRef}
                                                    handleEditorInput={handleEditorInput}
                                                    execFormat={execFormat}
                                                    handleInsertLink={handleInsertLink}
                                                    fileInputRef={fileInputRef}
                                                    handleFileUpload={handleFileUpload}
                                                    isUploading={isUploading}
                                                    handleSendMessage={handleSendMessage}
                                                    isSending={isSending}
                                                    newMessage={newMessage}
                                                    messagesEndRef={messagesEndRef}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'tasks' && (
                                    <TasksTab
                                        isCreatingTask={isCreatingTask}
                                        setIsCreatingTask={setIsCreatingTask}
                                        taskFormData={taskFormData}
                                        setTaskFormData={setTaskFormData}
                                        handleCreateLinkedTask={handleCreateLinkedTask}
                                        allRequests={allRequests}
                                        teamMembers={teamMembers}
                                        isLoadingTasks={isLoadingTasks}
                                        linkedTasks={linkedTasks}
                                        profiles={[]}
                                        handleTaskUpdate={handleTaskUpdate}
                                    />
                                )}

                                {activeTab === 'files' && (
                                    <FilesTab
                                        requestFiles={requestFiles}
                                        isSuperAdmin={isSuperAdmin}
                                        isTeamAdmin={isTeamAdmin}
                                        setIsLinkModalOpen={setIsLinkModalOpen}
                                        fetchRequestFiles={fetchRequestFiles}
                                        isLoadingFiles={isLoadingFiles}
                                        handleCreateFolder={handleCreateFolder}
                                        isCreatingRequestedFolder={isCreatingRequestedFolder}
                                        setPreviewFile={setPreviewFile}
                                        setIsPreviewOpen={setIsPreviewOpen}
                                        getFileIcon={getFileIcon}
                                        formatFileSize={formatFileSize}
                                    />
                                )}
                            </div>

                            <RequestSidebar
                                activeTab={activeTab}
                                request={request}
                                formatDate={formatDate}
                                handleUpdateField={handleUpdateField}
                                handleUpdateDueDate={handleUpdateDueDate}
                                teamMembers={teamMembers}
                                involvedMembers={involvedMembers}
                                isSuperAdmin={isSuperAdmin}
                                setIsDeleteModalOpen={setIsDeleteModalOpen}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <LinkFolderModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                linkFolderInput={linkFolderInput}
                setLinkFolderInput={setLinkFolderInput}
                handleLinkFolder={handleLinkFolder}
                isValidatingLink={isValidatingLink}
                linkFolderError={linkFolderError}
                setLinkFolderError={setLinkFolderError}
            />

            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                requestTitle={request?.title}
                handleDeleteRequest={handleDeleteRequest}
                isDeleting={isDeleting}
                deleteError={deleteError}
                setDeleteError={setDeleteError}
            />

            <FilePreviewModal
                isOpen={isPreviewOpen}
                onClose={() => { setIsPreviewOpen(false); setPreviewFile(null); }}
                file={previewFile}
            />

            <ImpersonationWarning />
        </>
    );
}
