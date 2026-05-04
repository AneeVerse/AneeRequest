'use client';
// UI Refined

import React, { useState, useEffect, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { slugify } from '@/lib/utils';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import {
  ArrowLeft,
  Mail,
  Building,
  Calendar,
  Clock,
  Shield,
  MessageSquare,
  CreditCard,
  Settings as SettingsIcon,
  LayoutGrid,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Search,
  Filter,
  Download,
  PanelLeft,
  Users,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  FolderOpen,
  HardDrive,
  Link2,
  Trash2,
  RefreshCw,
  Upload,
  Pencil,
  FileText,
  Image as ImageIcon,
  Film,
  Plus,
  MoreHorizontal,
  File as FileIcon,
  FolderPlus,
  Moon,
  Sun,
  Bell,
  List,
  FileUp,
  FolderUp,
  Table,
  Presentation,
  ClipboardList,
  Settings2
} from 'lucide-react';
import Image from 'next/image';

import { useAuth } from '@/context/AuthContext';
import ImpersonationWarning from '@/components/ImpersonationWarning';
import dynamic from 'next/dynamic';
const FilePreviewModal = dynamic(() => import('@/components/FilePreviewModal'), { ssr: false });
const CreateRequestModal = dynamic(() => import('@/components/CreateRequestModal'), { ssr: false });
const CreateTaskModal = dynamic(() => import('@/components/CreateTaskModal'), { ssr: false });
import { formatDate } from '@/lib/dateUtils';
import { RequestItem, Client } from '@/lib/data/requests';
import { TaskItem } from '@/lib/data/tasks';

// New Modular Components
import ClientHeader from '@/components/clients/ClientHeader';
import ClientRequestsTab from '@/components/clients/ClientRequestsTab';
import ClientTasksTab from '@/components/clients/ClientTasksTab';
import ClientDriveTab from '@/components/clients/ClientDriveTab';
import ClientSettingsTab from '@/components/clients/ClientSettingsTab';

interface ClientPageClientProps {
  initialClient: Client | null;
  initialRequests: RequestItem[];
  initialTasks: TaskItem[];
  initialProfiles: any[];
  initialTeamMembers: any[];
}

export default function ClientPageClient({
  initialClient,
  initialRequests,
  initialTasks,
  initialProfiles,
  initialTeamMembers
}: ClientPageClientProps) {
  const { profile, viewAsProfile, isImpersonating } = useAuth();
  const displayProfile = viewAsProfile || profile;
  const isSuperAdmin = displayProfile?.role === 'super_admin';

  const tabs = ['Requests', 'Tasks', 'Drive', 'Settings'].filter(tab => {
    if (tab === 'Drive' && !isSuperAdmin) return false;
    return true;
  });

  const { slug } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'Requests');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Sync activeTab with URL params for persistence and back navigation
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab && tabs.includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams, tabs, activeTab]);
  const { mutate } = useSWRConfig();
  const fetcher = (url: string) => fetch(url).then(res => res.json());

  // Use SWR for data fetching with fallback data from SSR
  const { data: clientsRes } = useSWR('/api/clients', fetcher, { fallbackData: [initialClient].filter(Boolean) });
  const { data: profiles = initialProfiles } = useSWR('/api/profiles', fetcher, { fallbackData: initialProfiles });
  const { data: teamMembers = initialTeamMembers } = useSWR('/api/team', fetcher, { fallbackData: initialTeamMembers });
  const { data: allRequests = initialRequests } = useSWR('/api/requests', fetcher, { fallbackData: initialRequests });
  const { data: allTasks = initialTasks } = useSWR('/api/tasks', fetcher, { fallbackData: initialTasks });

  const client = useMemo(() => {
    if (!clientsRes) return initialClient;
    return clientsRes.find((c: any) => c.slug === slug || c.id === slug) || initialClient;
  }, [clientsRes, slug, initialClient]);

  const requests = useMemo(() => {
    if (!client || !allRequests) return initialRequests;
    return allRequests.filter((r: RequestItem) => r.client?.id === client.id);
  }, [allRequests, client, initialRequests]);

  const tasks = useMemo(() => {
    if (!client || !allTasks) return initialTasks;
    const requestIds = new Set(requests.map((r: any) => r.id));
    return allTasks.filter((t: TaskItem) =>
      t.request_links?.some((link: any) => requestIds.has(link.request?.id))
    );
  }, [allTasks, client, requests, initialTasks]);

  const [isLoading, setIsLoading] = useState(!initialClient);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Sync loading state
  useEffect(() => {
    if (client) setIsLoading(false);
  }, [client]);

  // Settings Form State
  const [settingsEmail, setSettingsEmail] = useState('');
  const [settingsPassword, setSettingsPassword] = useState('');
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSettingsPassword, setShowSettingsPassword] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Modal States
  const [isCreateRequestModalOpen, setIsCreateRequestModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

  // Inline Creation State
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const inlineRequestInputRef = React.useRef<HTMLInputElement>(null);
  const inlineTaskInputRef = React.useRef<HTMLInputElement>(null);

  const [requestFormData, setRequestFormData] = useState({
    title: '',
    priority: 'Medium',
    description: '',
    due_date: '',
    create_folder: false
  });

  const [taskFormData, setTaskFormData] = useState({
    title: '',
    priority: 'Medium',
    description: '',
    assigned_to: '',
    due_date: '',
    request_ids: [] as string[]
  });

  const [isSubmittingInline, setIsSubmittingInline] = useState(false);

  useEffect(() => {
    if (isCreatingRequest) {
      setTimeout(() => inlineRequestInputRef.current?.focus(), 100);
    }
  }, [isCreatingRequest]);

  useEffect(() => {
    if (isCreatingTask) {
      setTimeout(() => inlineTaskInputRef.current?.focus(), 100);
    }
  }, [isCreatingTask]);

  const handleCreateNew = () => {
    if (activeTab === 'Requests') {
      setIsCreatingRequest(!isCreatingRequest);
      setIsCreatingTask(false);
    } else if (activeTab === 'Tasks') {
      setIsCreatingTask(!isCreatingTask);
      setIsCreatingRequest(false);
    }
  };

  const handleInlineCreateRequest = async () => {
    if (!requestFormData.title.trim() || !client?.id) return;

    setIsSubmittingInline(true);
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: requestFormData.title,
          description: requestFormData.description || `New request for ${client?.name}`,
          client_id: client?.id,
          priority: requestFormData.priority,
          due_date: requestFormData.due_date,
          status: 'Todo',
          create_folder: requestFormData.create_folder
        })
      });

      if (response.ok) {
        setIsCreatingRequest(false);
        setRequestFormData({ title: '', priority: 'Medium', description: '', due_date: '', create_folder: false });
        mutate('/api/requests');
      } else {
        const err = await response.json();
        alert(`Error: ${err.error}`);
      }
    } catch (error) {
      console.error('Failed to create request:', error);
    } finally {
      setIsSubmittingInline(false);
    }
  };

  const handleInlineCreateTask = async () => {
    if (!taskFormData.title.trim()) return;

    setIsSubmittingInline(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskFormData.title,
          description: taskFormData.description,
          priority: taskFormData.priority,
          assigned_to: taskFormData.assigned_to,
          due_date: taskFormData.due_date,
          request_ids: taskFormData.request_ids,
          status: 'Todo'
        })
      });

      if (response.ok) {
        setIsCreatingTask(false);
        setTaskFormData({ title: '', priority: 'Medium', description: '', assigned_to: '', due_date: '', request_ids: [] });
        mutate('/api/tasks');
      } else {
        const err = await response.json();
        alert(`Error: ${err.error}`);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmittingInline(false);
    }
  };

  const handleDataRefresh = () => {
    mutate('/api/requests');
    mutate('/api/tasks');
  };

  // Auto-hide status after 5 seconds
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    if (client) {
      setSettingsEmail(client.email);
      setFolderInput(client.drive_folder_id || '');
      if (client.drive_folder_id && !isDriveBrowsing) {
        // Validate to get name + auto-browse
        (async () => {
          setIsValidatingFolder(true);
          try {
            const res = await fetch('/api/drive/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ folderId: client.drive_folder_id })
            });
            if (res.ok) {
              const data = await res.json();
              if (data.valid) {
                setLinkedFolderName(data.folderName);
                // Auto-browse into the linked folder
                browseDriveFolder(data.folderId || client.drive_folder_id!, data.folderName);
              }
            }
          } catch (e) {
            console.error('Validate error:', e);
          } finally {
            setIsValidatingFolder(false);
          }
        })();
      } else if (!client.drive_folder_id && client.organization) {
        // Auto-discover if no folder is linked
        discoverFolder(client.organization);
      }
    }
  }, [client]);

  // Folder State
  const [folderInput, setFolderInput] = useState('');
  const [linkedFolderName, setLinkedFolderName] = useState('');
  const [isValidatingFolder, setIsValidatingFolder] = useState(false);
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [folderStatus, setFolderStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Discovery State
  const [discoveredFolder, setDiscoveredFolder] = useState<{ id: string; name: string } | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const discoverFolder = async (name: string) => {
    setIsDiscovering(true);
    try {
      const res = await fetch(`/api/drive/discover?name=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found) {
          setDiscoveredFolder({ id: data.folderId, name: data.folderName });
        }
      }
    } catch (e) {
      console.error('Discovery error:', e);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleAutoLinkFolder = async (folderId: string) => {
    if (!client) return;
    setIsSavingFolder(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: client.id,
          drive_folder_id: folderId
        })
      });

      if (res.ok) {
        setFolderStatus({ type: 'success', message: 'Folder linked successfully' });
        mutate('/api/clients');
        setDiscoveredFolder(null);
      } else {
        const data = await res.json();
        setFolderStatus({ type: 'error', message: data.error || 'Failed to link folder' });
      }
    } catch (e: any) {
      setFolderStatus({ type: 'error', message: e.message });
    } finally {
      setIsSavingFolder(false);
    }
  };

  // Drive Browser State
  interface DriveItem {
    id: string;
    name: string;
    mimeType: string;
    isFolder: boolean;
    size: number | null;
    createdTime: string;
    webViewLink: string;
    webContentLink: string | null;
    previewUrl?: string | null;
  }
  const [driveItems, setDriveItems] = useState<DriveItem[]>([]);
  const [driveBreadcrumbs, setDriveBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [currentDriveFolderId, setCurrentDriveFolderId] = useState<string | null>(null);
  const [isDriveBrowsing, setIsDriveBrowsing] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveContextItem, setDriveContextItem] = useState<DriveItem | null>(null);
  const [driveContextPos, setDriveContextPos] = useState({ x: 0, y: 0 });
  const [isDriveRenaming, setIsDriveRenaming] = useState(false);
  const [driveRenameValue, setDriveRenameValue] = useState('');
  const [namingModal, setNamingModal] = useState<{
    isOpen: boolean;
    type: string;
    title: string;
    initialValue: string;
    onConfirm: (name: string) => void;
  }>({ isOpen: false, type: '', title: '', initialValue: '', onConfirm: () => { } });
  const [isDriveDeleting, setIsDriveDeleting] = useState(false);
  const [driveDeleteTarget, setDriveDeleteTarget] = useState<DriveItem | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isDriveUploading, setIsDriveUploading] = useState(false);
  const driveFileInputRef = React.useRef<HTMLInputElement>(null);
  const driveFolderInputRef = React.useRef<HTMLInputElement>(null);

  // Drive Navigation & Filter State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<string>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const filterMenuRef = React.useRef<HTMLDivElement>(null);
  const newMenuRef = React.useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(event.target as Node)) {
        setIsNewMenuOpen(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDriveItems = driveItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' ||
      (filterType === 'folder' && item.isFolder) ||
      (filterType === 'doc' && item.mimeType === 'application/vnd.google-apps.document') ||
      (filterType === 'sheet' && item.mimeType === 'application/vnd.google-apps.spreadsheet') ||
      (filterType === 'slide' && item.mimeType === 'application/vnd.google-apps.presentation') ||
      (filterType === 'pdf' && item.mimeType.includes('pdf')) ||
      (filterType === 'image' && item.mimeType.startsWith('image/'));

    return matchesSearch && matchesType;
  });

  // Preview state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<DriveItem | null>(null);

  const browseDriveFolder = async (folderId: string, folderName?: string) => {
    setIsDriveLoading(true);
    try {
      const res = await fetch(`/api/drive/browse?folderId=${folderId}`);
      if (res.ok) {
        const items = await res.json();
        setDriveItems(items);
        setCurrentDriveFolderId(folderId);
        setIsDriveBrowsing(true);

        if (folderName && driveBreadcrumbs.length === 0) {
          setDriveBreadcrumbs([{ id: folderId, name: folderName }]);
        }
      }
    } catch (e) {
      console.error('Browse error:', e);
    } finally {
      setIsDriveLoading(false);
    }
  };

  const navigateToDriveSubfolder = (item: DriveItem) => {
    setDriveBreadcrumbs(prev => [...prev, { id: item.id, name: item.name }]);
    browseDriveFolder(item.id);
  };

  const navigateToDriveBreadcrumb = (index: number) => {
    const crumb = driveBreadcrumbs[index];
    setDriveBreadcrumbs(prev => prev.slice(0, index + 1));
    browseDriveFolder(crumb.id);
  };

  const refreshDriveFolder = () => {
    if (currentDriveFolderId) browseDriveFolder(currentDriveFolderId);
  };

  const handleDriveRename = async () => {
    if (!driveContextItem || !driveRenameValue.trim()) return;
    try {
      const res = await fetch('/api/drive/browse', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: driveContextItem.id,
          newName: driveRenameValue.trim(),
          isFolder: driveContextItem.isFolder
        })
      });
      if (res.ok) {
        setIsDriveRenaming(false);
        setDriveContextItem(null);
        refreshDriveFolder();
      } else {
        const err = await res.json();
        alert(`Rename failed: ${err.error}`);
      }
    } catch (e) {
      console.error('Rename error:', e);
    }
  };

  const handleDriveDelete = async () => {
    if (!driveDeleteTarget) return;
    try {
      const res = await fetch(
        `/api/drive/browse?id=${driveDeleteTarget.id}&isFolder=${driveDeleteTarget.isFolder}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setDriveDeleteTarget(null);
        setIsDriveDeleting(false);
        refreshDriveFolder();
      } else {
        const err = await res.json();
        alert(`Delete failed: ${err.error}`);
      }
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const handleDriveCreateFolder = async () => {
    if (!newFolderName.trim() || !currentDriveFolderId) return;
    try {
      const res = await fetch('/api/drive/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: currentDriveFolderId,
          folderName: newFolderName.trim()
        })
      });
      if (res.ok) {
        setIsCreatingFolder(false);
        setNewFolderName('');
        refreshDriveFolder();
      }
    } catch (e) {
      console.error('Create folder error:', e);
    }
  };

  const handleDriveUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentDriveFolderId) return;
    setIsDriveUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('parentId', currentDriveFolderId);
      const res = await fetch('/api/drive/browse', { method: 'POST', body: formData });
      if (res.ok) refreshDriveFolder();
    } catch (e) {
      console.error('Upload error:', e);
    } finally {
      setIsDriveUploading(false);
      if (driveFileInputRef.current) driveFileInputRef.current.value = '';
    }
  };

  const handleCreateGoogleFile = async (type: 'document' | 'spreadsheet' | 'presentation' | 'form') => {
    if (!currentDriveFolderId) return;

    setNamingModal({
      isOpen: true,
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      initialValue: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      onConfirm: async (name) => {
        setIsDriveLoading(true);
        try {
          const res = await fetch('/api/drive/browse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parentId: currentDriveFolderId,
              folderName: name.trim(),
              type
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.webViewLink) {
              window.open(data.webViewLink, '_blank');
            }
            refreshDriveFolder();
            router.refresh();
          }
        } catch (e) {
          console.error('Create Google file error:', e);
        } finally {
          setIsDriveLoading(false);
          setNamingModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleCreateClientFolder = async () => {
    if (!client) return;
    setIsSavingFolder(true);
    setFolderStatus(null);
    try {
      const res = await fetch('/api/clients/drive-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          clientName: client.name,
          organization: client.organization
        })
      });
      const data = await res.json();
      if (res.ok) {
        setLinkedFolderName(data.folderName);
        setFolderInput(data.folderId);
        mutate('/api/clients');
        setFolderStatus({ type: 'success', message: `Folder "${data.folderName}" created and linked!` });
        browseDriveFolder(data.folderId, data.folderName);
      } else {
        setFolderStatus({ type: 'error', message: data.error });
      }
    } catch (e: any) {
      setFolderStatus({ type: 'error', message: e.message });
    } finally {
      setIsSavingFolder(false);
    }
  };

  const handleSaveClientFolder = async () => {
    if (!folderInput.trim() || !client) return;

    setIsValidatingFolder(true);
    setFolderStatus(null);

    try {
      const valRes = await fetch('/api/drive/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: folderInput.trim() })
      });
      const valData = await valRes.json();

      if (!valData.valid) {
        setFolderStatus({ type: 'error', message: valData.error || 'Cannot access this folder' });
        setIsValidatingFolder(false);
        return;
      }

      setIsValidatingFolder(false);
      setIsSavingFolder(true);

      const saveRes = await fetch('/api/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: client.id, drive_folder_id: valData.folderId })
      });

      if (saveRes.ok) {
        setLinkedFolderName(valData.folderName);
        setFolderInput(valData.folderId);
        mutate('/api/clients');
        setFolderStatus({ type: 'success', message: `Linked to "${valData.folderName}"` });
        // Auto-browse into the folder
        browseDriveFolder(valData.folderId, valData.folderName);
      } else {
        const err = await saveRes.json();
        setFolderStatus({ type: 'error', message: err.error });
      }
    } catch (e: any) {
      setFolderStatus({ type: 'error', message: e.message });
    } finally {
      setIsValidatingFolder(false);
      setIsSavingFolder(false);
    }
  };

  const handleRemoveClientFolder = async () => {
    if (!client) return;
    setIsSavingFolder(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: client.id, drive_folder_id: '' })
      });
      if (res.ok) {
        setFolderInput('');
        setLinkedFolderName('');
        setIsDriveBrowsing(false);
        setDriveItems([]);
        setDriveBreadcrumbs([]);
        mutate('/api/clients');
        setFolderStatus({ type: 'success', message: 'Folder link removed. Using default root folder.' });
      }
    } catch (e: any) {
      setFolderStatus({ type: 'error', message: e.message });
    } finally {
      setIsSavingFolder(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };



  const getDriveFileIcon = (mimeType: string, itemName?: string, iconSize: number = 24) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      // Check if it's a request folder
      const isRequest = requests.some((r: any) => r.title === itemName);
      if (isRequest) return <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]"><FolderOpen size={iconSize} /></div>;

      // Check if it's the client's own folder
      const isClient = itemName === client?.organization || itemName === client?.name;
      if (isClient) return <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]"><FolderOpen size={iconSize} /></div>;

      return <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400"><FolderOpen size={iconSize} /></div>;
    }
    if (mimeType?.startsWith('image/')) return <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400"><ImageIcon size={iconSize} /></div>;
    if (mimeType?.includes('pdf')) return <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400"><FileText size={iconSize} /></div>;
    if (mimeType?.startsWith('video/')) return <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400"><Film size={iconSize} /></div>;

    // Google Workspace Apps
    if (mimeType === 'application/vnd.google-apps.document')
      return <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]"><FileText size={iconSize} /></div>;
    if (mimeType === 'application/vnd.google-apps.spreadsheet')
      return <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.15)]"><Table size={iconSize} /></div>;
    if (mimeType === 'application/vnd.google-apps.presentation')
      return <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]"><Presentation size={iconSize} /></div>;
    if (mimeType === 'application/vnd.google-apps.form')
      return <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]"><ClipboardList size={iconSize} /></div>;

    return <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400"><FileIcon size={iconSize} /></div>;
  };

  const getDriveFileTypeLabel = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') return 'FOLDER';
    if (mimeType === 'application/vnd.google-apps.document') return 'DOC';
    if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'SHEET';
    if (mimeType === 'application/vnd.google-apps.presentation') return 'SLIDE';
    if (mimeType === 'application/vnd.google-apps.form') return 'FORM';
    if (mimeType?.startsWith('image/')) return mimeType.replace('image/', '').toUpperCase();
    if (mimeType?.includes('pdf')) return 'PDF';
    const ext = mimeType?.split('/').pop()?.toUpperCase() || 'FILE';
    return ext;
  };

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Theme toggle effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    if (settingsPassword && settingsPassword !== settingsConfirmPassword) {
      setStatus({ type: 'error', message: "Passwords do not match!" });
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch('/api/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: client.id,
          email: settingsEmail !== client.email ? settingsEmail : undefined,
          password: settingsPassword || undefined,
          oldEmail: client.email
        })
      });

      if (response.ok) {
        setStatus({ type: 'success', message: "Settings updated successfully!" });
        setSettingsPassword('');
        setSettingsConfirmPassword('');
        mutate('/api/clients');
      } else {
        const err = await response.json();
        setStatus({ type: 'error', message: err.error });
      }
    } catch (error) {
      console.error('Update failed:', error);
      setStatus({ type: 'error', message: "Failed to update settings." });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-[#09090B] items-center justify-center">
        <Loader2 size={32} className="text-[#279da6] animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col h-screen bg-[#09090B] items-center justify-center text-iron">
        <p className="text-xl font-bold mb-4">Client not found</p>
        <button
          onClick={() => router.push('/clients')}
          className="flex items-center gap-2 text-[#279da6] font-bold hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Clients
        </button>
      </div>
    );
  }

  const filterActions = (
    <div className="flex items-center gap-2 shrink-0">
      {/* Filters Dropdown */}
      <div className="relative" ref={filterMenuRef}>
        <button
          onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-shark/60 hover:border-[#279da6]/40 hover:bg-white/5 transition-all group ${filterType !== 'all' ? 'bg-[#279da6]/10 border-[#279da6]/40 text-[#279da6]' : 'text-santas-gray'}`}
        >
          <Filter size={20} className={filterType !== 'all' ? 'text-[#279da6]' : 'group-hover:text-white'} />
          <span className="text-[12px] font-bold uppercase tracking-tight hidden md:inline">
            {filterType === 'all' ? 'Filters' : filterType}
          </span>
          <ChevronDown size={12} className={`hidden md:block transition-transform duration-300 ${isFilterMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {isFilterMenuOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-[#121214] border border-shark/60 rounded-xl shadow-2xl py-2 z-[60] animate-zoom-in backdrop-blur-xl bg-opacity-95 text-left">
            {[
              { id: 'all', label: 'All Files', icon: <FileIcon size={20} /> },
              { id: 'folder', label: 'Folders', icon: <FolderOpen size={20} /> },
              { id: 'doc', label: 'Google Docs', icon: <FileText size={20} className="text-blue-500" /> },
              { id: 'sheet', label: 'Google Sheets', icon: <Table size={20} className="text-green-500" /> },
              { id: 'slide', label: 'Google Slides', icon: <Presentation size={20} className="text-yellow-500" /> },
              { id: 'image', label: 'Images', icon: <ImageIcon size={20} className="text-emerald-500" /> },
              { id: 'pdf', label: 'PDFs', icon: <FileText size={20} className="text-rose-500" /> },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => { setFilterType(opt.id); setIsFilterMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 text-xs transition-colors ${filterType === opt.id ? 'text-[#279da6] bg-[#279da6]/5 font-bold' : 'text-iron'}`}
              >
                <span className="opacity-80 group-hover:opacity-100">{opt.icon}</span>
                <span className="uppercase tracking-widest text-[12px]">{opt.label}</span>
                {filterType === opt.id && <Check size={12} className="ml-auto" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* View Mode Switcher */}
      <div className="flex items-center bg-black/40 border border-shark/60 rounded-xl p-0.5 overflow-hidden">
        <button
          onClick={() => setViewMode('list')}
          className={`p-1.5 rounded-lg transition-all flex items-center justify-center gap-2 ${viewMode === 'list' ? 'bg-[#279da6] text-white shadow-lg shadow-[#279da6]/20' : 'text-santas-gray hover:text-white hover:bg-white/5'}`}
          title="List view"
        >
          <List size={20} />
          {viewMode === 'list' && <span className="text-[10px] font-black uppercase pr-1 hidden md:inline">List</span>}
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={`p-1.5 rounded-lg transition-all flex items-center justify-center gap-2 ${viewMode === 'grid' ? 'bg-[#279da6] text-white shadow-lg shadow-[#279da6]/20' : 'text-santas-gray hover:text-white hover:bg-white/5'}`}
          title="Grid view"
        >
          <LayoutGrid size={20} />
          {viewMode === 'grid' && <span className="text-[10px] font-black uppercase pr-1 hidden md:inline">Grid</span>}
        </button>
      </div>
    </div>
  );

  const driveActions = (
    <div className="flex items-center gap-1.5 shrink-0">
      {filterActions}
      <div className="hidden md:block h-4 w-[1px] bg-shark/40 mx-1" />
      <button
        onClick={refreshDriveFolder}
        className="p-1.5 text-santas-gray hover:text-white transition-all shrink-0"
        title="Refresh"
      >
        <RefreshCw size={20} className={isDriveLoading ? 'animate-spin' : ''} />
      </button>

      {isDriveUploading && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#279da6]/10 border border-[#279da6]/20 rounded-lg animate-pulse lg:flex hidden">
          <Loader2 size={20} className="text-[#279da6] animate-spin" />
          <span className="text-[12px] font-bold text-[#279da6] uppercase tracking-wider truncate max-w-[200px]">
            Uploading...
          </span>
        </div>
      )}
    </div>
  );

  return (
    <>
          <ClientHeader
            client={client}
            tabs={tabs}
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              const params = new URLSearchParams(searchParams.toString());
              params.set('tab', tab);
              const currentSlug = client ? slugify(client.organization || client.name) : (slug as string);
              router.replace(`/clients/${currentSlug}?${params.toString()}`);
            }}
            onMobileMenuToggle={() => setIsMobileOpen(true)}
            isNewMenuOpen={isNewMenuOpen}
            setIsNewMenuOpen={setIsNewMenuOpen}
            handleCreateNew={handleCreateNew}
            isCreating={isCreatingRequest || isCreatingTask || isCreatingFolder}
            onConfirm={
              isCreatingRequest ? handleInlineCreateRequest :
                isCreatingTask ? handleInlineCreateTask :
                  handleDriveCreateFolder
            }
            onCancel={() => {
              setIsCreatingRequest(false);
              setIsCreatingTask(false);
              setIsCreatingFolder(false);
              setRequestFormData({ title: '', priority: 'Medium', description: '', due_date: '', create_folder: false });
              setTaskFormData({ title: '', priority: 'Medium', description: '', assigned_to: '', due_date: '', request_ids: [] });
              setNewFolderName('');
            }}
            isSubmitting={isSubmittingInline || isDriveLoading}
            driveActions={driveActions}
            requestsCount={requests.length}
            tasksCount={tasks.length}
            driveBreadcrumbs={driveBreadcrumbs}
            navigateToDriveBreadcrumb={navigateToDriveBreadcrumb}
          />

          <main className="flex-1 overflow-y-auto custom-scrollbar relative">

            {/* Status Notification */}
            {status && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
                <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border shadow-2xl backdrop-blur-md ${status.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                  {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span className="text-xs font-bold uppercase tracking-tight">{status.message}</span>
                  <button onClick={() => setStatus(null)} className="ml-2 hover:opacity-70">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}
            {/* Tab Contents */}
            <div className="p-3 sm:p-4 lg:p-8">
              {activeTab === 'Requests' && (
                <ClientRequestsTab
                  isLoadingData={isLoadingData}
                  requests={requests}
                  profiles={profiles}
                  teamMembers={teamMembers}
                  isCreatingRequest={isCreatingRequest}
                  requestFormData={requestFormData}
                  setRequestFormData={setRequestFormData}
                  inlineRequestInputRef={inlineRequestInputRef}
                />
              )}

              {activeTab === 'Tasks' && (
                <ClientTasksTab
                  isLoadingData={isLoadingData}
                  tasks={tasks}
                  profiles={profiles}
                  teamMembers={teamMembers}
                  isCreatingTask={isCreatingTask}
                  taskFormData={taskFormData}
                  setTaskFormData={setTaskFormData}
                  inlineTaskInputRef={inlineTaskInputRef}
                  requests={requests}
                />
              )}

              {activeTab === 'Drive' && (
                <ClientDriveTab
                  isDriveBrowsing={isDriveBrowsing}
                  isDriveLoading={isDriveLoading}
                  driveItems={driveItems}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  filterType={filterType}
                  viewMode={viewMode}
                  discoveredFolder={discoveredFolder}
                  isDiscovering={isDiscovering}
                  isSavingFolder={isSavingFolder}
                  handleAutoLinkFolder={handleAutoLinkFolder}
                  handleCreateClientFolder={handleCreateClientFolder}
                  setActiveTab={setActiveTab}
                  browseDriveFolder={browseDriveFolder}
                  navigateToDriveSubfolder={navigateToDriveSubfolder}
                  getDriveFileIcon={getDriveFileIcon}
                  getDriveFileTypeLabel={getDriveFileTypeLabel}
                  formatFileSize={formatFileSize}
                  driveContextItem={driveContextItem}
                  setDriveContextItem={setDriveContextItem}
                  driveContextPos={driveContextPos}
                  setDriveContextPos={setDriveContextPos}
                  isDriveRenaming={isDriveRenaming}
                  setIsDriveRenaming={setIsDriveRenaming}
                  driveRenameValue={driveRenameValue}
                  setDriveRenameValue={setDriveRenameValue}
                  handleDriveRename={handleDriveRename}
                  isDriveDeleting={isDriveDeleting}
                  setIsDriveDeleting={setIsDriveDeleting}
                  driveDeleteTarget={driveDeleteTarget}
                  setDriveDeleteTarget={setDriveDeleteTarget}
                  handleDriveDelete={handleDriveDelete}
                  client={client}
                  setPreviewFile={setPreviewFile}
                  setIsPreviewOpen={setIsPreviewOpen}
                  folderStatus={folderStatus}
                  allClients={clientsRes}
                />
              )}

              {activeTab === 'Settings' && client && (
                <ClientSettingsTab
                  client={client}
                  requestsCount={requests.length}
                  tasksCount={tasks.length}
                  settingsEmail={settingsEmail}
                  setSettingsEmail={setSettingsEmail}
                  settingsPassword={settingsPassword}
                  setSettingsPassword={setSettingsPassword}
                  settingsConfirmPassword={settingsConfirmPassword}
                  setSettingsConfirmPassword={setSettingsConfirmPassword}
                  showSettingsPassword={showSettingsPassword}
                  setShowSettingsPassword={setShowSettingsPassword}
                  isUpdating={isUpdating}
                  handleSettingsSubmit={handleSettingsSubmit}
                  folderInput={folderInput}
                  setFolderInput={setFolderInput}
                  linkedFolderName={linkedFolderName}
                  isValidatingFolder={isValidatingFolder}
                  isSavingFolder={isSavingFolder}
                  folderStatus={folderStatus}
                  handleSaveClientFolder={handleSaveClientFolder}
                  handleRemoveClientFolder={handleRemoveClientFolder}
                  setActiveTab={setActiveTab}
                  browseDriveFolder={browseDriveFolder}
                />
              )}
            </div>
          </main>

          {/* Drive New Menu Dropdown */}
          {isNewMenuOpen && activeTab === 'Drive' && (
            <div className="absolute top-16 right-10 w-64 bg-[#18181B] border border-shark/60 rounded-xl shadow-2xl py-2 z-[100] animate-zoom-in backdrop-blur-xl bg-opacity-95 overflow-hidden" ref={newMenuRef}>
              <button
                onClick={() => { setIsCreatingFolder(true); setIsNewMenuOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 text-iron transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <FolderPlus size={16} className="text-storm-gray group-hover:text-[#279da6] transition-colors" />
                  <span className="text-sm font-medium">New folder</span>
                </div>
              </button>
              <div className="h-[1px] bg-shark/40 my-1" />
              <button
                onClick={() => { driveFileInputRef.current?.click(); setIsNewMenuOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 text-iron transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <FileUp size={16} className="text-storm-gray group-hover:text-[#279da6] transition-colors" />
                  <span className="text-sm font-medium">File upload</span>
                </div>
              </button>
              <div className="h-[1px] bg-shark/40 my-1" />
              <button
                onClick={() => { handleCreateGoogleFile('document'); setIsNewMenuOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 text-iron transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[12px] font-black text-blue-500 shadow-sm">
                    <FileText size={12} />
                  </div>
                  <span className="text-xs font-medium uppercase font-black">Google Docs</span>
                </div>
              </button>
              <button
                onClick={() => { handleCreateGoogleFile('spreadsheet'); setIsNewMenuOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/5 text-iron transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded bg-green-500/10 border border-green-500/20 flex items-center justify-center text-[12px] font-black text-green-500 shadow-sm">
                    <Table size={12} />
                  </div>
                  <span className="text-xs font-medium uppercase font-black">Google Sheets</span>
                </div>
              </button>
            </div>
          )}

          {/* Naming Modal */}
          {namingModal.isOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-[#18181B] border border-shark w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative animate-zoom-in">
                <div className="p-6 border-b border-shark flex items-center justify-between bg-gradient-to-r from-shark/20 to-transparent">
                  <h3 className="text-sm font-black text-iron uppercase tracking-widest flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6]">
                      {namingModal.type === 'folder' ? <FolderPlus size={16} /> : <FileText size={16} />}
                    </div>
                    {namingModal.title}
                  </h3>
                  <button
                    onClick={() => setNamingModal(prev => ({ ...prev, isOpen: false }))}
                    className="p-1 text-storm-gray hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6">
                  <label className="block text-[12px] font-black text-storm-gray uppercase tracking-widest mb-2 ml-1">
                    Enter Name
                  </label>
                  <input
                    autoFocus
                    type="text"
                    defaultValue={namingModal.initialValue}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        namingModal.onConfirm(e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        setNamingModal(prev => ({ ...prev, isOpen: false }));
                      }
                    }}
                    className="w-full bg-shark/40 border border-shark rounded-xl px-4 py-3 text-iron focus:outline-none focus:border-[#279da6] transition-all placeholder:text-storm-gray/40 font-bold"
                    placeholder="e.g. Project Proposal"
                  />
                </div>

                <div className="px-6 py-4 bg-shark/20 flex items-center justify-end gap-3 font-bold">
                  <button
                    onClick={() => setNamingModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-5 py-2 text-[10px] font-black text-storm-gray hover:text-white transition-colors uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => {
                      const input = (e.currentTarget.parentElement?.previousElementSibling?.querySelector('input') as HTMLInputElement);
                      if (input) namingModal.onConfirm(input.value);
                    }}
                    className="px-6 py-2 bg-[#279da6] text-white rounded-xl text-[10px] font-black hover:bg-[#279da6]/90 transition-all shadow-lg shadow-[#279da6]/20 uppercase tracking-widest active:scale-95"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

        <FilePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => { setIsPreviewOpen(false); setPreviewFile(null); }}
          file={previewFile ? {
            name: previewFile.name,
            url: previewFile.webViewLink,
            previewUrl: previewUrl(previewFile) || undefined,
            type: previewFile.mimeType
          } : null}
        />
        <CreateRequestModal
          isOpen={isCreateRequestModalOpen}
          onClose={() => setIsCreateRequestModalOpen(false)}
          onSuccess={handleDataRefresh}
          initialClientId={client?.profile_id || undefined}
        />
        <CreateTaskModal
          isOpen={isCreateTaskModalOpen}
          onClose={() => setIsCreateTaskModalOpen(false)}
          onSuccess={handleDataRefresh}
          profiles={profiles}
          teamMembers={teamMembers}
          requests={requests}
        />
    </>
  );
}

// Helper to generate preview URL
function previewUrl(item: any) {
  if (item.isFolder) return null;
  return `/api/drive/view?fileId=${item.id}`;
}
