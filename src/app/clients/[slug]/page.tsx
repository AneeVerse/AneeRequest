'use client';
// UI Refined

import React, { useState, useEffect } from 'react';
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

import { useAuth } from '@/context/AuthContext';
import ImpersonationWarning from '@/components/ImpersonationWarning';
import FilePreviewModal from '@/components/FilePreviewModal';
import RequestsTable from '@/components/RequestsTable';
import TasksTable from '@/components/TasksTable';
import { RequestItem } from '@/lib/data/requests';
import { TaskItem } from '@/lib/data/tasks';
import CreateRequestModal from '@/components/CreateRequestModal';
import CreateTaskModal from '@/components/CreateTaskModal';
import CustomDropdown from '@/components/CustomDropdown';
import { formatDate } from '@/lib/dateUtils';

interface Client {
  id: string;
  profile_id?: string | null;
  name: string;
  email: string;
  organization: string;
  status: string;
  created_at: string;
  drive_folder_id?: string | null;
  avatar_url?: string | null;
}

export default function ClientDetailPage() {
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
  const [client, setClient] = useState<Client | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await fetch('/api/clients');
        const allClients = await response.json();

        console.log('Client Detail Match Debug:', {
          slugFromUrl: slug,
          clientsAvailable: allClients.length,
          clientSlugs: allClients.map((c: any) => c.slug)
        });

        // Helper to match slug or ID
        const foundClient = allClients.find((c: any) => {
          return (c.slug && c.slug === slug) || c.id === slug;
        });

        if (foundClient) {
          console.log('Match found:', foundClient.organization || foundClient.name);
          setClient(foundClient);
        } else {
          console.warn('No client match found for slug:', slug);
        }
      } catch (error) {
        console.error('Failed to fetch client details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) fetchClient();
  }, [slug]);

  useEffect(() => {
    const fetchData = async () => {
      if (!client?.profile_id) return;
      setIsLoadingData(true);
      try {
        const [reqRes, profRes, teamRes, tasksRes] = await Promise.all([
          fetch(`/api/requests`).then(res => res.json()),
          fetch(`/api/profiles`).then(res => res.json()),
          fetch(`/api/team`).then(res => res.json()),
          fetch(`/api/tasks`).then(res => res.json())
        ]);

        // Filter requests by clients.id (using logic from new schema)
        const clientRequests = Array.isArray(reqRes)
          ? reqRes.filter((r: RequestItem) => r.client?.id === client.id)
          : [];
        setRequests(clientRequests);

        // Filter tasks by client_id (tasks linked to client's requests)
        const requestIds = new Set(clientRequests.map(r => r.id));
        const clientTasks = Array.isArray(tasksRes)
          ? tasksRes.filter((t: TaskItem) =>
            t.request_links?.some(link => requestIds.has(link.request?.id))
          )
          : [];
        setTasks(clientTasks);

        setProfiles(Array.isArray(profRes) ? profRes : []);
        setTeamMembers(Array.isArray(teamRes) ? teamRes : []);
      } catch (error) {
        console.error('Error fetching client data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (client) {
      fetchData();
    }
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
        handleDataRefresh();
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
        handleDataRefresh();
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

  const handleDataRefresh = async () => {
    setIsLoadingData(true);
    try {
      const [reqRes, tasksRes] = await Promise.all([
        fetch(`/api/requests`).then(res => res.json()),
        fetch(`/api/tasks`).then(res => res.json())
      ]);

      const clientRequests = Array.isArray(reqRes)
        ? reqRes.filter((r: RequestItem) => r.client?.id === client?.id)
        : [];
      setRequests(clientRequests);

      const requestIds = new Set(clientRequests.map(r => r.id));
      const clientTasks = Array.isArray(tasksRes)
        ? tasksRes.filter((t: TaskItem) =>
          t.request_links?.some(link => requestIds.has(link.request?.id))
        )
        : [];
      setTasks(clientTasks);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoadingData(false);
    }
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
        setClient({ ...client, drive_folder_id: folderId });
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
        setClient({ ...client, drive_folder_id: data.folderId });
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
        setClient({ ...client, drive_folder_id: valData.folderId });
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
        setClient({ ...client, drive_folder_id: null });
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
      const isRequest = requests.some(r => r.title === itemName);
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
        const updatedClient = { ...client, email: settingsEmail };
        setClient(updatedClient);
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
    <div className={`flex h-screen bg-[#09090B] text-iron font-sans overflow-hidden transition-all duration-500 ${isImpersonating ? 'p-1.5' : ''}`} style={isImpersonating ? { backgroundColor: '#0f2b1a' } : undefined}>
      <Sidebar isCollapsed={isSidebarCollapsed} isMobileOpen={isMobileOpen} onMobileClose={() => setIsMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 bg-[#09090B] relative">
        <div className={`flex-1 flex flex-col min-w-0 bg-[#101011] rounded-t-2xl overflow-hidden border-t border-l border-r mt-2 responsive-content-wrapper transition-all duration-500 ${isImpersonating ? 'border-[#22c55e]/60 shadow-[0_0_15px_rgba(34,197,94,0.15),0_0_40px_rgba(34,197,94,0.08),inset_0_0_20px_rgba(34,197,94,0.03)]' : 'border-shark'}`}>
          {/* Custom Breadcrumb Header (Replacing standard Header for detail view) */}
          <div className="border-b border-shark">
            <Header

              onMobileMenuToggle={() => setIsMobileOpen(true)}
              label={client?.organization || client?.name || 'Loading...'}
              labelIcon={
                <div className="w-7 h-7 rounded-full bg-shark/80 border border-white/5 overflow-hidden flex items-center justify-center text-[10px] text-white font-black bg-gradient-to-br from-[#279da6]/20 to-transparent shrink-0">
                  {client?.avatar_url ? (
                    <img src={client.avatar_url} alt={client.organization} className="w-full h-full object-cover" />
                  ) : (
                    (client?.organization || client?.name || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  )}
                </div>
              }
              tabs={tabs}
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                const params = new URLSearchParams(searchParams.toString());
                params.set('tab', tab);
                const currentSlug = client ? slugify(client.organization || client.name) : slug;
                router.replace(`/clients/${currentSlug}?${params.toString()}`);
              }}
              onCreate={
                activeTab === 'Drive'
                  ? () => setIsNewMenuOpen(!isNewMenuOpen)
                  : (activeTab === 'Requests' || activeTab === 'Tasks')
                    ? handleCreateNew
                    : undefined
              }
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
              rightToolbar={activeTab === 'Drive' ? driveActions : undefined}
              tabCounts={{
                Requests: requests.length,
                Tasks: tasks.length
              }}
            >
              {activeTab === 'Drive' && (
                <div className="flex items-center gap-2 text-sm overflow-hidden min-w-0">
                  {driveBreadcrumbs.length > 1 && (
                    <button
                      onClick={() => navigateToDriveBreadcrumb(driveBreadcrumbs.length - 2)}
                      className="p-0.5 text-santas-gray hover:text-white transition-colors group active:scale-95 shrink-0"
                      title="Go to parent folder"
                    >
                      <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                  )}
                  <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                    {driveBreadcrumbs.slice(1).map((crumb, i) => (
                      <React.Fragment key={crumb.id}>
                        <ChevronRight size={20} className="text-storm-gray shrink-0" />
                        <button
                          onClick={() => navigateToDriveBreadcrumb(i + 1)}
                          className={`font-black uppercase tracking-widest text-[12px] transition-all truncate ${i === driveBreadcrumbs.length - 2 ? 'text-[#279da6]' : 'text-storm-gray hover:text-iron'} ${i < driveBreadcrumbs.length - 3 ? 'hidden md:block' : ''}`}
                        >
                          {i < driveBreadcrumbs.length - 3 && (i + 1) !== 0 ? '...' : crumb.name}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </Header>
          </div>

          <main className="flex-1 overflow-y-auto custom-scrollbar relative">
            <div className="p-3 sm:p-4 lg:p-6">
              {/* Inline Request Creation */}
              <div
                className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCreatingRequest && activeTab === 'Requests'
                  ? 'max-h-[600px] opacity-100 mb-8 translate-y-0 scale-100 blur-0'
                  : 'max-h-0 opacity-0 mb-0 -translate-y-4 scale-95 blur-md pointer-events-none'
                  }`}
              >
                <div className="p-1 bg-[#101011]/90 backdrop-blur-2xl border border-[#279da6]/30 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(39,157,166,0.08)] ring-1 ring-white/5 relative overflow-hidden">
                  <div className="p-6 space-y-6">
                    <div className="flex items-start gap-6">
                      <div className="flex flex-col items-center gap-3 shrink-0">
                        <div className="w-14 h-14 rounded-2xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6] shadow-inner ring-1 ring-[#279da6]/20">
                          <FileText size={28} />
                        </div>
                        <p className="text-[10px] font-black text-storm-gray uppercase tracking-widest">Request</p>
                      </div>

                      <div className="flex-1 space-y-6">
                        {/* Top Row: Title & Priority */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Request Title</label>
                            <div className="relative group">
                              <Pencil size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                              <input
                                ref={inlineRequestInputRef}
                                type="text"
                                value={requestFormData.title}
                                onChange={(e) => setRequestFormData({ ...requestFormData, title: e.target.value })}
                                placeholder="What do you need?"
                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Priority</label>
                            <CustomDropdown
                              value={requestFormData.priority}
                              onChange={(val: any) => setRequestFormData({ ...requestFormData, priority: val })}
                              options={[
                                { label: 'Low', value: 'Low', icon: <CheckCircle2 size={14} className="text-storm-gray" /> },
                                { label: 'Medium', value: 'Medium', icon: <CheckCircle2 size={14} className="text-malibu" /> },
                                { label: 'High', value: 'High', icon: <CheckCircle2 size={14} className="text-[#279da6]" /> },
                                { label: 'Critical', value: 'Critical', icon: <CheckCircle2 size={14} className="text-rose-500" /> }
                              ]}
                            />
                          </div>
                        </div>

                        {/* Middle Row: Description & Due Date */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Description</label>
                            <textarea
                              value={requestFormData.description}
                              onChange={(e) => setRequestFormData({ ...requestFormData, description: e.target.value })}
                              placeholder="Add more details about this request..."
                              className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 px-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold min-h-[80px] resize-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Due Date</label>
                            <div className="relative group">
                              <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                              <input
                                type="date"
                                value={requestFormData.due_date}
                                onChange={(e) => setRequestFormData({ ...requestFormData, due_date: e.target.value })}
                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron focus:outline-none focus:border-[#279da6]/40 transition-all font-bold [color-scheme:dark]"
                              />
                            </div>

                            {/* Create Folder Toggle */}
                            <div className="pt-4">
                              <button
                                type="button"
                                onClick={() => setRequestFormData({ ...requestFormData, create_folder: !requestFormData.create_folder })}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${requestFormData.create_folder
                                  ? 'bg-[#279da6]/10 border-[#279da6]/40 text-[#279da6]'
                                  : 'bg-black/40 border-shark/50 text-storm-gray hover:border-shark/80'}`}
                              >
                                <div className="flex items-center gap-2">
                                  <FolderPlus size={14} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Create Drive Folder</span>
                                </div>
                                <div className={`w-8 h-4 rounded-full relative transition-colors ${requestFormData.create_folder ? 'bg-[#279da6]' : 'bg-shark'}`}>
                                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${requestFormData.create_folder ? 'left-4.5' : 'left-0.5'}`} />
                                </div>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>


              {/* Inline Task Creation */}
              <div
                className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCreatingTask && activeTab === 'Tasks'
                  ? 'max-h-[600px] opacity-100 mb-8 translate-y-0 scale-100 blur-0'
                  : 'max-h-0 opacity-0 mb-0 -translate-y-4 scale-95 blur-md pointer-events-none'
                  }`}
              >
                <div className="p-1 bg-[#101011]/90 backdrop-blur-2xl border border-[#279da6]/30 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(39,157,166,0.08)] ring-1 ring-white/5 relative overflow-hidden">
                  <div className="p-6 space-y-6">
                    <div className="flex items-start gap-6">
                      <div className="flex flex-col items-center gap-3 shrink-0">
                        <div className="w-14 h-14 rounded-2xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6] shadow-inner ring-1 ring-[#279da6]/20">
                          <LayoutGrid size={28} />
                        </div>
                        <p className="text-[10px] font-black text-storm-gray uppercase tracking-widest">Task</p>
                      </div>

                      <div className="flex-1 space-y-6">
                        {/* Top Row: Title & Assignee & Priority */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                          <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Task Title</label>
                            <div className="relative group">
                              <Pencil size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                              <input
                                ref={inlineTaskInputRef}
                                type="text"
                                value={taskFormData.title}
                                onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                                placeholder="What needs to be done?"
                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Assign To</label>
                            <CustomDropdown
                              value={taskFormData.assigned_to}
                              onChange={(val: any) => setTaskFormData({ ...taskFormData, assigned_to: val })}
                              placeholder="Unassigned"
                              options={[
                                { label: 'Unassigned', value: '' },
                                ...teamMembers.map(tm => ({
                                  label: tm.name || tm.full_name || 'Member',
                                  value: tm.profile_id || '',
                                  icon: <Users size={14} className="text-[#279da6]" />
                                }))
                              ]}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Priority</label>
                            <CustomDropdown
                              value={taskFormData.priority}
                              onChange={(val: any) => setTaskFormData({ ...taskFormData, priority: val })}
                              options={[
                                { label: 'Low', value: 'Low', icon: <CheckCircle2 size={14} className="text-storm-gray" /> },
                                { label: 'Medium', value: 'Medium', icon: <CheckCircle2 size={14} className="text-malibu" /> },
                                { label: 'High', value: 'High', icon: <CheckCircle2 size={14} className="text-[#279da6]" /> },
                                { label: 'Critical', value: 'Critical', icon: <CheckCircle2 size={14} className="text-rose-500" /> }
                              ]}
                            />
                          </div>
                        </div>

                        {/* Bottom Row: Description & Due Date */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                          <div className="space-y-1.5 md:col-span-3">
                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Description</label>
                            <textarea
                              value={taskFormData.description}
                              onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                              placeholder="Add task details..."
                              className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 px-4 text-xs text-iron placeholder:text-storm-gray focus:outline-none focus:border-[#279da6]/40 transition-all font-bold min-h-[80px] resize-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-widest ml-1">Due Date</label>
                            <div className="relative group">
                              <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-storm-gray group-focus-within:text-[#279da6] transition-colors" />
                              <input
                                type="date"
                                value={taskFormData.due_date}
                                onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
                                className="w-full bg-black/40 border border-shark/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-iron focus:outline-none focus:border-[#279da6]/40 transition-all font-bold [color-scheme:dark]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>

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
            <div className="px-3 sm:px-4 lg:px-6 pt-1.5 sm:pt-2 lg:pt-3 pb-8">
              {activeTab === 'Requests' && (
                <div className="space-y-6 animate-fade-in">
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
              )}

              {activeTab === 'Tasks' && (
                <div className="space-y-6 animate-fade-in">
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
              )}

              {activeTab === 'Drive' && (
                <div className="animate-fade-in space-y-6 flex flex-col h-full min-h-[500px]">
                  {/* No Drive Linked - Empty State */}
                  {!isDriveBrowsing && !isDriveLoading && (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#18181B] border border-shark rounded-3xl shadow-2xl relative overflow-hidden group">
                      {/* Decorative Background */}
                      <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#279da6]/5 rounded-full blur-[100px] group-hover:bg-[#279da6]/10 transition-all duration-700" />
                      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#279da6]/5 rounded-full blur-[100px] group-hover:bg-[#279da6]/10 transition-all duration-700 delay-150" />

                      <div className="relative flex flex-col items-center text-center max-w-sm">
                        <div className="w-24 h-24 rounded-[32px] bg-[#279da6]/10 border border-[#279da6]/20 flex items-center justify-center text-[#279da6] mb-8 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-[0_0_30px_rgba(39,157,166,0.1)]">
                          <HardDrive size={40} />
                        </div>

                        <h2 className="text-2xl font-black text-white tracking-tight uppercase mb-4">No Drive Linked</h2>

                        {discoveredFolder ? (
                          <div className="mb-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <p className="text-storm-gray text-[10px] font-black leading-relaxed mb-4 uppercase tracking-[0.2em] opacity-80">
                              Found a matching folder in Drive:
                            </p>
                            <div className="p-4 bg-[#279da6]/5 border border-[#279da6]/20 rounded-2xl flex items-center justify-between group/suggest hover:bg-[#279da6]/10 transition-all">
                              <div className="flex items-center gap-3">
                                <FolderOpen size={20} className="text-[#279da6]" />
                                <div className="text-left">
                                  <p className="text-xs font-black text-white uppercase tracking-tight">{discoveredFolder.name}</p>
                                  <p className="text-[10px] text-storm-gray font-bold">Matching Organization Name</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleAutoLinkFolder(discoveredFolder.id)}
                                disabled={isSavingFolder}
                                className="px-4 py-2 bg-[#279da6] text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                              >
                                {isSavingFolder ? <Loader2 size={12} className="animate-spin" /> : 'Link Now'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-storm-gray text-sm font-bold leading-relaxed mb-10 uppercase tracking-widest opacity-60">
                            {isDiscovering ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> Checking Google Drive...
                              </span>
                            ) : (
                              `Connect a Google Drive folder to manage ${client?.name || 'this client'}'s project files directly from this dashboard.`
                            )}
                          </p>
                        )}

                        <div className="flex flex-col gap-4 w-full">
                          <button
                            onClick={handleCreateClientFolder}
                            disabled={isSavingFolder}
                            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-[#279da6] text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-[#279da6]/20 hover:bg-[#279da6]/90 hover:-translate-y-0.5 transition-all"
                          >
                            {isSavingFolder ? <Loader2 size={16} className="animate-spin" /> : <FolderPlus size={16} />}
                            {isSavingFolder ? 'Creating Folder...' : 'Create New Folder'}
                          </button>

                          <button
                            onClick={() => setActiveTab('Settings')}
                            className="w-full py-4 rounded-2xl bg-shark/40 border border-shark hover:bg-shark text-iron font-black text-[10px] uppercase tracking-[0.2em] transition-all"
                          >
                            Link Existing Folder
                          </button>
                        </div>

                        {folderStatus?.type === 'error' && (
                          <div className="mt-8 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-tight flex items-center gap-2">
                            <AlertCircle size={14} />
                            {folderStatus.message}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Drive Browser */}
                  {isDriveBrowsing && (
                    <div className="space-y-6 animate-fade-in">
                      <input
                        type="file"
                        ref={driveFileInputRef}
                        className="hidden"
                        onChange={handleDriveUpload}
                      />

                      {/* New Folder Input (Now triggered from Header) */}
                      {isCreatingFolder && (
                        <div className="flex items-center gap-3 p-3 bg-shark/20 border border-shark/40 rounded-xl">
                          <FolderPlus size={16} className="text-[#279da6] shrink-0" />
                          <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleDriveCreateFolder()}
                            className="flex-1 bg-transparent border-none text-sm text-iron focus:outline-none font-bold"
                            placeholder="New folder name..."
                            autoFocus
                          />
                          <button onClick={handleDriveCreateFolder} className="text-[#279da6] hover:text-white transition-all">
                            <CheckCircle2 size={16} />
                          </button>
                          <button onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }} className="text-storm-gray hover:text-white transition-all">
                            <X size={16} />
                          </button>
                        </div>
                      )}

                      {/* Items Grid */}
                      {isDriveLoading ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4">
                          <Loader2 size={32} className="animate-spin text-[#279da6]" />
                          <p className="text-[12px] font-black text-storm-gray uppercase tracking-[0.3em]">Synching with Drive...</p>
                        </div>
                      ) : filteredDriveItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center opacity-40">
                          <FolderOpen size={48} className="text-storm-gray mb-4" />
                          <p className="text-xs font-black text-iron uppercase mb-1 tracking-widest">THIS FOLDER IS EMPTY</p>
                          <p className="text-[12px] text-storm-gray uppercase tracking-widest">Upload your first file or create a subfolder.</p>
                        </div>
                      ) : (
                        <div>
                          {/* Inline Search Heading */}
                          <div className="flex items-center justify-between gap-4 mb-4 px-1">
                            <div className="relative flex items-center gap-3">
                              <div className="relative group flex items-center">
                                <input
                                  type="text"
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  placeholder="FOLDERS"
                                  className="bg-transparent border-none p-0 text-[14px] font-black text-white placeholder:text-storm-gray uppercase tracking-[0.2em] focus:outline-none min-w-[120px] transition-all"
                                  style={{ width: searchQuery ? `${Math.max(searchQuery.length + 2, 8)}ch` : '120px' }}
                                />
                                {searchQuery && (
                                  <button
                                    onClick={() => setSearchQuery('')}
                                    className="ml-2 p-1 text-storm-gray hover:text-white transition-colors"
                                    title="Clear search"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                              {searchQuery && (
                                <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-[#279da6]/10 border border-[#279da6]/20">
                                  <span className="text-[10px] font-bold text-[#279da6] uppercase tracking-tight">Searching</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {viewMode === 'grid' ? (
                            <div className="space-y-8">
                              {/* Folders Section */}
                              {filteredDriveItems.some(item => item.isFolder) && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                                    {filteredDriveItems.filter(item => item.isFolder).map((item) => (
                                      <div
                                        key={item.id}
                                        className="group relative flex items-center gap-3 p-3 rounded-2xl border border-shark/30 bg-[#09090B]/30 hover:bg-[#279da6]/5 hover:border-[#279da6]/40 transition-all cursor-pointer overflow-hidden"
                                        onClick={() => navigateToDriveSubfolder(item)}
                                        onContextMenu={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setDriveContextItem(item);
                                          setDriveContextPos({ x: e.clientX, y: e.clientY });
                                        }}
                                      >
                                        <div className="shrink-0">
                                          {getDriveFileIcon(item.mimeType, item.name, 20)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[12px] font-bold text-iron truncate uppercase tracking-tight group-hover:text-[#279da6] transition-colors">{item.name}</p>
                                        </div>

                                        {/* Mini Actions */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDriveContextItem(item);
                                              setDriveRenameValue(item.name);
                                              setIsDriveRenaming(true);
                                            }}
                                            className="p-1.5 hover:text-[#279da6] transition-colors text-storm-gray"
                                          >
                                            <Pencil size={14} />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDriveDeleteTarget(item);
                                              setIsDriveDeleting(true);
                                            }}
                                            className="p-1.5 hover:text-rose-400 transition-colors text-storm-gray"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Files Section */}
                              {filteredDriveItems.some(item => !item.isFolder) && (
                                <div className="space-y-4">
                                  <h3 className="text-[12px] font-black text-storm-gray uppercase tracking-[0.2em] ml-1 opacity-60">Files</h3>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
                                    {filteredDriveItems.filter(item => !item.isFolder).map((item) => (
                                      <div
                                        key={item.id}
                                        className="group relative flex flex-col rounded-3xl border border-shark/40 bg-[#09090B]/40 hover:bg-[#279da6]/5 hover:border-[#279da6]/30 transition-all cursor-pointer overflow-hidden aspect-[4/5]"
                                        onClick={() => (setPreviewFile(item), setIsPreviewOpen(true))}
                                        onContextMenu={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setDriveContextItem(item);
                                          setDriveContextPos({ x: e.clientX, y: e.clientY });
                                        }}
                                      >
                                        {/* Preview Area */}
                                        <div className="flex-1 bg-shark/20 flex items-center justify-center relative overflow-hidden">
                                          <div className="transition-transform duration-500 group-hover:scale-110 opacity-40 group-hover:opacity-80">
                                            {getDriveFileIcon(item.mimeType, item.name, 48)}
                                          </div>
                                          {/* File Type Badge Overlay */}
                                          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#09090B]/60 backdrop-blur-md border border-shark/40">
                                            <div className="scale-75 origin-left">
                                              {getDriveFileIcon(item.mimeType, item.name, 12)}
                                            </div>
                                            <span className="text-[12px] font-black text-storm-gray uppercase tracking-[0.1em]">{getDriveFileTypeLabel(item.mimeType)}</span>
                                          </div>
                                        </div>

                                        {/* Footer Info */}
                                        <div className="p-4 bg-[#111114]/80 backdrop-blur-sm border-t border-shark/40">
                                          <p className="text-[12px] font-bold text-iron truncate uppercase tracking-tight group-hover:text-[#279da6] transition-colors mb-1">{item.name}</p>
                                          <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-black text-storm-gray uppercase tracking-widest">{item.size ? formatFileSize(item.size) : '--'}</span>
                                          </div>
                                        </div>

                                        {/* Hover Actions */}
                                        <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDriveContextItem(item);
                                              setDriveRenameValue(item.name);
                                              setIsDriveRenaming(true);
                                            }}
                                            className="p-2 rounded-xl bg-[#09090B]/80 backdrop-blur-md border border-shark hover:bg-[#279da6]/20 text-storm-gray hover:text-[#279da6] transition-all"
                                            title="Rename"
                                          >
                                            <Pencil size={14} />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDriveDeleteTarget(item);
                                              setIsDriveDeleting(true);
                                            }}
                                            className="p-2 rounded-xl bg-[#09090B]/80 backdrop-blur-md border border-shark hover:bg-rose-500/20 text-storm-gray hover:text-rose-400 transition-all"
                                            title="Delete"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* List View */
                            <div className="space-y-1">
                              <div className="hidden sm:flex items-center px-4 py-2.5 bg-white/5 border border-shark/40 rounded-xl text-[12px] font-black text-storm-gray uppercase tracking-widest mb-1">
                                <div className="flex-1">NAME</div>
                                <div className="w-32 hidden md:block">TYPE</div>
                                <div className="w-24 hidden sm:block">SIZE</div>
                                <div className="w-32 text-right">ACTIONS</div>
                              </div>
                              {filteredDriveItems.map(item => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-shark/30 transition-all group cursor-pointer border border-transparent hover:border-shark/40"
                                  onClick={() => item.isFolder ? navigateToDriveSubfolder(item) : (setPreviewFile(item), setIsPreviewOpen(true))}
                                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setDriveContextItem(item); setDriveContextPos({ x: e.clientX, y: e.clientY }); }}
                                >
                                  <div className="shrink-0 flex items-center justify-center">
                                    {getDriveFileIcon(item.mimeType, item.name, 18)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-iron truncate group-hover:text-[#279da6] transition-colors">{item.name}</p>
                                    <p className="sm:hidden text-[10px] text-storm-gray uppercase tracking-widest mt-0.5">
                                      {getDriveFileTypeLabel(item.mimeType)} · {item.isFolder ? 'Folder' : formatFileSize(item.size)}
                                    </p>
                                  </div>
                                  <div className="w-32 hidden md:block text-[10px] font-black text-storm-gray uppercase tracking-widest">
                                    {getDriveFileTypeLabel(item.mimeType)}
                                  </div>
                                  <div className="w-24 hidden sm:block text-[10px] font-black text-storm-gray uppercase tracking-widest">
                                    {item.isFolder ? '--' : formatFileSize(item.size)}
                                  </div>
                                  <div className="opacity-0 group-hover:opacity-100 flex items-center justify-end gap-1 transition-opacity w-32">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDriveContextItem(item);
                                        setDriveRenameValue(item.name);
                                        setIsDriveRenaming(true);
                                      }}
                                      className="p-1.5 hover:bg-shark rounded-lg text-storm-gray hover:text-white transition-all"
                                      title="Rename"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDriveDeleteTarget(item);
                                        setIsDriveDeleting(true);
                                      }}
                                      className="p-1.5 hover:bg-rose-500/10 rounded-lg text-storm-gray hover:text-rose-400 transition-all"
                                      title="Delete"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rename Modal */}
                  {isDriveRenaming && driveContextItem && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setIsDriveRenaming(false)}>
                      <div className="bg-[#18181B] border border-shark rounded-2xl p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-sm font-black text-iron uppercase tracking-widest mb-4">Rename {driveContextItem.isFolder ? 'Folder' : 'File'}</h3>
                        <input
                          type="text"
                          value={driveRenameValue}
                          onChange={(e) => setDriveRenameValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleDriveRename()}
                          className="w-full bg-[#09090B] border border-shark/60 rounded-xl py-3 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60 transition-all font-bold mb-4"
                          autoFocus
                        />
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setIsDriveRenaming(false)} className="px-4 py-2 text-xs font-bold text-storm-gray hover:text-white transition-all">Cancel</button>
                          <button onClick={handleDriveRename} className="px-6 py-2 bg-[#279da6] text-white rounded-xl text-xs font-black uppercase tracking-widest">Save</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delete Confirmation */}
                  {isDriveDeleting && driveDeleteTarget && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setIsDriveDeleting(false)}>
                      <div className="bg-[#18181B] border border-shark rounded-2xl p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-sm font-black text-iron uppercase tracking-widest mb-2">Delete {driveDeleteTarget.isFolder ? 'Folder' : 'File'}</h3>
                        <p className="text-xs text-storm-gray mb-6">
                          Are you sure you want to delete <span className="text-white font-bold">"{driveDeleteTarget.name}"</span>?
                          {driveDeleteTarget.isFolder && ' All contents inside will also be deleted.'}
                        </p>
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setIsDriveDeleting(false)} className="px-4 py-2 text-xs font-bold text-storm-gray hover:text-white transition-all">Cancel</button>
                          <button onClick={handleDriveDelete} className="px-6 py-2 bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-widest">Delete</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Context Menu */}
                  {driveContextItem && !isDriveRenaming && !isDriveDeleting && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setDriveContextItem(null)} />
                      <div
                        className="fixed z-50 bg-[#18181B] border border-shark rounded-xl shadow-2xl py-1 w-44"
                        style={{ left: driveContextPos.x, top: driveContextPos.y }}
                      >
                        <button
                          onClick={() => { setDriveRenameValue(driveContextItem.name); setIsDriveRenaming(true); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-iron hover:bg-shark/40 transition-all"
                        >
                          <Pencil size={14} /> Rename
                        </button>
                        {!driveContextItem.isFolder && (
                          <button
                            onClick={() => { window.open(driveContextItem.webContentLink || driveContextItem.webViewLink, '_blank'); setDriveContextItem(null); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-iron hover:bg-shark/40 transition-all"
                          >
                            <Download size={14} /> Download
                          </button>
                        )}
                        <button
                          onClick={() => { setDriveDeleteTarget(driveContextItem); setIsDriveDeleting(true); setDriveContextItem(null); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-all"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'Settings' && (
                <div className="max-w-5xl animate-fade-in space-y-8">
                  <div className="bg-[#18181B] border border-shark rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                      <Building size={120} />
                    </div>
                    <h3 className="text-xs font-black text-storm-gray uppercase tracking-[0.3em] mb-8">Professional Profile</h3>

                    <div className="grid grid-cols-2 gap-y-10">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-storm-gray uppercase tracking-widest flex items-center gap-2">
                          <Mail size={12} className="text-[#279da6]" /> Email Address
                        </p>
                        <p className="text-iron font-bold text-sm tracking-tight">{client.email}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-storm-gray uppercase tracking-widest flex items-center gap-2">
                          <Building size={12} className="text-[#279da6]" /> Organization
                        </p>
                        <p className="text-iron font-bold text-sm tracking-tight uppercase">{client.organization}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-storm-gray uppercase tracking-widest flex items-center gap-2">
                          <Calendar size={12} className="text-[#279da6]" /> Joined Date
                        </p>
                        <p className="text-iron font-bold text-sm tracking-tight">
                          {formatDate(client.created_at)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-storm-gray uppercase tracking-widest flex items-center gap-2">
                          <Shield size={12} className="text-[#279da6]" /> Account Level
                        </p>
                        <p className="text-iron font-bold text-sm tracking-tight">Premium Enterprise</p>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                    <div className="bg-[#18181B] border border-shark rounded-3xl p-6 flex items-center justify-between group hover:border-[#279da6]/20 transition-all">
                      <div>
                        <p className="text-[9px] font-black text-storm-gray uppercase tracking-[0.3em] mb-1">Total Requests</p>
                        <p className="text-2xl font-black text-white">{requests.length}</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6] group-hover:scale-110 transition-transform">
                        <MessageSquare size={20} />
                      </div>
                    </div>
                    <div className="bg-[#18181B] border border-shark rounded-3xl p-6 flex items-center justify-between group hover:border-[#279da6]/20 transition-all">
                      <div>
                        <p className="text-[9px] font-black text-storm-gray uppercase tracking-[0.3em] mb-1">Total Tasks</p>
                        <p className="text-2xl font-black text-white">{tasks.length}</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6] group-hover:scale-110 transition-transform">
                        <CreditCard size={20} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-4">
                    <div className="bg-[#18181B] border border-shark rounded-3xl p-8 shadow-2xl flex flex-col h-full">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6]">
                          <Shield size={24} />
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-iron tracking-tight uppercase">Account Security</h2>
                          <p className="text-xs font-bold text-santas-gray uppercase tracking-widest">Update credentials for {client?.name || 'this account'}</p>
                        </div>
                      </div>

                      <form onSubmit={handleSettingsSubmit} className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-storm-gray uppercase tracking-[0.2em]">Email Address</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#279da6]" size={16} />
                            <input
                              type="email"
                              value={settingsEmail}
                              onChange={(e) => setSettingsEmail(e.target.value)}
                              className="w-full bg-[#09090B] border border-shark/60 rounded-2xl py-3 pl-12 pr-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60 transition-all font-bold"
                              placeholder="client@example.com"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-[0.2em]">New Password</label>
                            <div className="relative">
                              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#279da6]" size={16} />
                              <input
                                type={showSettingsPassword ? "text" : "password"}
                                value={settingsPassword}
                                onChange={(e) => setSettingsPassword(e.target.value)}
                                className="w-full bg-[#09090B] border border-shark/60 rounded-2xl py-3 pl-12 pr-12 text-sm text-iron focus:outline-none focus:border-[#279da6]/60 transition-all font-bold"
                                placeholder="••••••••"
                              />
                              <button
                                type="button"
                                onClick={() => setShowSettingsPassword(!showSettingsPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-storm-gray hover:text-iron transition-colors"
                              >
                                {showSettingsPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-[0.2em]">Confirm Password</label>
                            <div className="relative">
                              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-[#279da6]" size={16} />
                              <input
                                type={showSettingsPassword ? "text" : "password"}
                                value={settingsConfirmPassword}
                                onChange={(e) => setSettingsConfirmPassword(e.target.value)}
                                className="w-full bg-[#09090B] border border-shark/60 rounded-2xl py-3 pl-12 pr-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60 transition-all font-bold"
                                placeholder="••••••••"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 flex items-center justify-between">
                          <p className="text-[10px] text-storm-gray font-bold max-w-[280px] leading-relaxed uppercase tracking-tighter">
                            Changing these settings will update the client's login credentials immediately.
                          </p>
                          <button
                            type="submit"
                            disabled={isUpdating}
                            className="px-8 py-3 bg-[#279da6] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#279da6]/90 transition-all shadow-lg shadow-[#279da6]/20 disabled:opacity-50 flex items-center gap-2"
                          >
                            {isUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                            {isUpdating ? 'Updating...' : 'Save Changes'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Google Drive Management Section */}
                    <div className="bg-[#18181B] border border-shark rounded-3xl p-8 shadow-2xl relative overflow-hidden group flex flex-col h-full">
                      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#279da6]/5 rounded-full blur-[80px] group-hover:bg-[#279da6]/10 transition-all duration-700" />

                      <div className="flex items-center gap-4 mb-8 relative">
                        <div className="w-12 h-12 rounded-2xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6]">
                          <HardDrive size={24} />
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-white tracking-tight uppercase">Drive Storage</h2>
                          <p className="text-xs font-bold text-santas-gray uppercase tracking-widest">Linked Google Drive Infrastructure</p>
                        </div>
                      </div>

                      <div className="space-y-8 relative">
                        {linkedFolderName && (
                          <div className="flex items-center gap-4 p-5 bg-[#279da6]/5 border border-[#279da6]/20 rounded-2xl">
                            <div className="w-10 h-10 rounded-xl bg-[#279da6]/10 flex items-center justify-center">
                              <FolderOpen size={18} className="text-[#279da6]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-white truncate">{linkedFolderName}</p>
                              <p className="text-[10px] font-bold text-storm-gray tracking-tight truncate">{client.drive_folder_id}</p>
                            </div>
                            <button
                              onClick={() => { setActiveTab('Drive'); browseDriveFolder(client.drive_folder_id!, linkedFolderName); }}
                              className="px-4 py-2 bg-[#279da6]/10 text-[#279da6] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#279da6]/20 transition-all"
                            >
                              Browse
                            </button>
                            <button
                              onClick={handleRemoveClientFolder}
                              disabled={isSavingFolder}
                              className="p-2 hover:bg-rose-500/10 rounded-xl text-storm-gray hover:text-rose-400 transition-all"
                              title="Remove folder link"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-storm-gray uppercase tracking-[0.2em] ml-2">Folder ID or URL</label>
                            <div className="relative">
                              <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-[#279da6]" size={16} />
                              <input
                                type="text"
                                value={folderInput}
                                onChange={(e) => setFolderInput(e.target.value)}
                                className="w-full bg-[#09090B] border border-shark/60 rounded-2xl py-3 pl-12 pr-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60 transition-all font-bold"
                                placeholder="Paste folder ID or Drive URL"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <p className="text-[10px] text-storm-gray font-bold max-w-[340px] leading-relaxed uppercase tracking-tighter italic">
                              Manually override the linked folder. This will change where all project files are stored.
                            </p>
                            <button
                              type="button"
                              onClick={handleSaveClientFolder}
                              disabled={isValidatingFolder || isSavingFolder || !folderInput.trim()}
                              className="px-6 py-3 bg-shark/20 border border-shark hover:bg-shark hover:text-[#279da6] text-storm-gray rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                            >
                              {(isValidatingFolder || isSavingFolder) ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                              {isValidatingFolder ? 'Validating...' : 'Validate & Link'}
                            </button>
                          </div>

                          {folderStatus && activeTab === 'Settings' && (
                            <div className={`mt-4 p-4 rounded-xl border text-[10px] font-black uppercase tracking-tight flex items-center gap-2 ${folderStatus.type === 'success'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              }`}>
                              {folderStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                              {folderStatus.message}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
        </div>

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
      </div>
    </div>
  );
}

// Helper to generate preview URL
function previewUrl(item: any) {
  if (item.isFolder) return null;
  return `/api/drive/view?fileId=${item.id}`;
}
