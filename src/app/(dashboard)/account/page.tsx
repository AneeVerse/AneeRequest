'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useDashboard } from '@/context/DashboardContext';
import { useAuth } from '@/context/AuthContext';
import {
    User,
    Mail,
    Lock,
    Shield,
    Eye,
    EyeOff,
    Loader2,
    CheckCircle2,
    AlertCircle,
    X as CloseIcon,
    ArrowLeft,
    Camera,
    HardDrive,
    FolderOpen,
    Link2,
    Check,
    RefreshCw,
    Building,
    Receipt
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import ImpersonationWarning from '@/components/ImpersonationWarning';

export default function AccountPage() {
    const { profile, viewAsProfile, isImpersonating, refreshProfile, isLoading } = useAuth();
    const displayProfile = viewAsProfile || profile;
    const router = useRouter();
    const { openMobileMenu } = useDashboard();
    const [isUpdating, setIsUpdating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Form State
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [organization, setOrganization] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Google Drive Root Folder State (super_admin only)
    const [rootFolderInput, setRootFolderInput] = useState('');
    const [currentRootFolderId, setCurrentRootFolderId] = useState('');
    const [currentRootFolderName, setCurrentRootFolderName] = useState('');
    const [isValidatingFolder, setIsValidatingFolder] = useState(false);
    const [isSavingFolder, setIsSavingFolder] = useState(false);
    const [folderStatus, setFolderStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Invoice seller settings (super_admin / admin)
    const [invoiceCompany, setInvoiceCompany] = useState('Aneeverse');
    const [invoiceAddress, setInvoiceAddress] = useState('');
    const [invoicePhone, setInvoicePhone] = useState('');
    const [invoiceWebsite, setInvoiceWebsite] = useState('https://www.aneeverse.com/');
    const [invoiceGstin, setInvoiceGstin] = useState('');
    const [invoiceGstRate, setInvoiceGstRate] = useState('18');
    const [invoiceSac, setInvoiceSac] = useState('998361');
    const [isSavingInvoice, setIsSavingInvoice] = useState(false);
    const [invoiceStatus, setInvoiceStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (displayProfile) {
            setFullName(displayProfile.full_name || '');
            setEmail(displayProfile.email || '');
            setAvatarUrl(displayProfile.avatar_url || '');
            setOrganization(displayProfile.organization || '');
        }
    }, [displayProfile]);

    // Fetch current root folder + invoice settings on mount (staff admins)
    useEffect(() => {
        if (displayProfile?.role === 'super_admin' || displayProfile?.role === 'admin') {
            fetchAppSettings();
        }
    }, [displayProfile?.role]);

    const fetchAppSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const settings = await res.json();
                const folderId = settings.drive_root_folder_id;
                if (folderId && displayProfile?.role === 'super_admin') {
                    setCurrentRootFolderId(folderId);
                    setRootFolderInput(folderId);
                    const valRes = await fetch('/api/drive/validate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ folderId })
                    });
                    if (valRes.ok) {
                        const valData = await valRes.json();
                        if (valData.valid) setCurrentRootFolderName(valData.folderName);
                    }
                }
                if (settings.invoice_company_name) setInvoiceCompany(settings.invoice_company_name);
                if (settings.invoice_address) setInvoiceAddress(settings.invoice_address);
                if (settings.invoice_phone) setInvoicePhone(settings.invoice_phone);
                if (settings.invoice_website) setInvoiceWebsite(settings.invoice_website);
                if (settings.invoice_gstin) setInvoiceGstin(settings.invoice_gstin);
                if (settings.invoice_gst_rate) setInvoiceGstRate(settings.invoice_gst_rate);
                if (settings.invoice_sac_code) setInvoiceSac(settings.invoice_sac_code);
            }
        } catch (e) {
            console.error('Failed to fetch settings:', e);
        }
    };

    const fetchCurrentRootFolder = fetchAppSettings;

    const handleSaveInvoiceSettings = async () => {
        setIsSavingInvoice(true);
        setInvoiceStatus(null);
        try {
            const pairs: [string, string][] = [
                ['invoice_company_name', invoiceCompany.trim()],
                ['invoice_address', invoiceAddress.trim()],
                ['invoice_phone', invoicePhone.trim()],
                ['invoice_website', invoiceWebsite.trim()],
                ['invoice_gstin', invoiceGstin.trim().toUpperCase()],
                ['invoice_gst_rate', invoiceGstRate.trim() || '18'],
                ['invoice_sac_code', invoiceSac.trim() || '998361'],
                ['invoice_state', 'Maharashtra'],
                ['invoice_state_code', '27'],
            ];
            for (const [key, value] of pairs) {
                if (!value) continue;
                const res = await fetch('/api/settings', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key, value }),
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || `Failed to save ${key}`);
                }
            }
            setInvoiceStatus({ type: 'success', message: 'Invoice seller details saved' });
        } catch (e: any) {
            setInvoiceStatus({ type: 'error', message: e.message || 'Failed to save' });
        } finally {
            setIsSavingInvoice(false);
        }
    };

    const handleSaveRootFolder = async () => {
        if (!rootFolderInput.trim()) return;

        setIsValidatingFolder(true);
        setFolderStatus(null);

        try {
            // First validate
            const valRes = await fetch('/api/drive/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folderId: rootFolderInput.trim() })
            });
            const valData = await valRes.json();

            if (!valData.valid) {
                const errorMsg = valData.error === 'invalid_grant'
                    ? 'Folder Loading Error: Access token expired or revoked.'
                    : `Folder Loading Error: ${valData.error || 'Check folder ID and permissions'}`;
                setFolderStatus({ type: 'error', message: errorMsg });
                setIsValidatingFolder(false);
                return;
            }

            setIsValidatingFolder(false);
            setIsSavingFolder(true);

            // Save to settings
            const saveRes = await fetch('/api/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'drive_root_folder_id', value: rootFolderInput.trim() })
            });

            if (saveRes.ok) {
                const saveData = await saveRes.json();
                setCurrentRootFolderId(saveData.folderId);
                setCurrentRootFolderName(saveData.folderName);
                setRootFolderInput(saveData.folderId);
                setFolderStatus({ type: 'success', message: `Root folder set to "${saveData.folderName}"` });
            } else {
                const err = await saveRes.json();
                setFolderStatus({ type: 'error', message: err.error || 'Failed to save settings' });
            }
        } catch (e: any) {
            setFolderStatus({ type: 'error', message: `System Error: ${e.message || 'Operation failed'}` });
        } finally {
            setIsValidatingFolder(false);
            setIsSavingFolder(false);
        }
    };

    // Auto-hide status after 5 seconds
    useEffect(() => {
        if (status) {
            const timer = setTimeout(() => setStatus(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    const handleUpdateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!displayProfile) return;

        if (password && password !== confirmPassword) {
            setStatus({ type: 'error', message: "Passwords do not match!" });
            return;
        }

        setIsUpdating(true);
        try {
            const response = await fetch('/api/account', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: displayProfile.id,
                    fullName: fullName !== displayProfile.full_name ? fullName : undefined,
                    email: email !== displayProfile.email ? email : undefined,
                    password: password || undefined,
                    avatarUrl: avatarUrl !== displayProfile.avatar_url ? avatarUrl : undefined,
                    organization: organization !== displayProfile.organization ? organization : undefined,
                    oldEmail: displayProfile.email
                })
            });

            if (response.ok) {
                setStatus({ type: 'success', message: "Account updated successfully!" });
                setPassword('');
                setConfirmPassword('');
                await refreshProfile();
            } else {
                const err = await response.json();
                setStatus({ type: 'error', message: err.error });
            }
        } catch (error) {
            console.error('Update failed:', error);
            setStatus({ type: 'error', message: "Failed to update account." });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !displayProfile) return;

        // Check if file is an image
        if (!file.type.startsWith('image/')) {
            setStatus({ type: 'error', message: "Please select an image file." });
            return;
        }

        setIsUploading(true);
        setStatus({ type: 'success', message: "Uploading image..." });

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            const data = await res.json();
            const newAvatarUrl = data.url;
            setAvatarUrl(newAvatarUrl);

            // Persist immediately!
            const persistRes = await fetch('/api/account', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: displayProfile.id,
                    avatarUrl: newAvatarUrl
                })
            });

            if (persistRes.ok) {
                setStatus({ type: 'success', message: "Profile image updated instantly!" });
                await refreshProfile();
            } else {
                throw new Error("Persistence failed");
            }
        } catch (error) {
            console.error('Upload/Sync error:', error);
            setStatus({ type: 'error', message: "Failed to update profile image." });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <>

                    {/* Header */}
                    <div className="h-14 lg:h-16 flex items-center justify-between px-3 sm:px-6 lg:px-8 bg-black/20 shrink-0 border-b border-shark/40">
                        <div className="flex items-center gap-2 lg:gap-4">
                            {/* Mobile hamburger */}
                            <button
                                onClick={openMobileMenu}
                                className="p-2 hover:bg-white/5 rounded-xl text-storm-gray hover:text-white transition-all lg:hidden"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
                            </button>
                            <button
                                onClick={() => router.back()}
                                className="p-2 hover:bg-white/5 rounded-xl text-storm-gray hover:text-white transition-all flex items-center gap-2 font-bold text-xs hidden lg:flex"
                            >
                                <ArrowLeft size={16} />
                                <span>Back</span>
                            </button>
                            <div className="h-4 w-px bg-shark hidden lg:block" />
                            <h1 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 sm:gap-3">
                                <Shield size={16} className="text-[#279da6]" />
                                <span className="hidden sm:inline">Account Settings</span>
                                <span className="sm:hidden">Account</span>
                            </h1>
                        </div>
                        <div className="hidden sm:block">
                            <ImpersonationWarning />
                        </div>
                    </div>

                    <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 lg:p-12">
                        {/* Status Notification */}
                        {status && (
                            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
                                <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border shadow-2xl backdrop-blur-md ${status.type === 'success'
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                    }`}>
                                    {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                    <span className="text-xs font-black uppercase tracking-tight">{status.message}</span>
                                    <button onClick={() => setStatus(null)} className="ml-2 hover:opacity-70">
                                        <CloseIcon size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="max-w-4xl mx-auto space-y-12">
                            {/* Profile Header Card */}
                            <div className="bg-[#18181B] border border-shark/60 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform text-[#279da6]">
                                    <User size={160} />
                                </div>
                                <div className="flex items-center gap-8 relative z-10">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-24 h-24 rounded-full bg-shark flex items-center justify-center text-4xl font-black text-white bg-gradient-to-br from-[#279da6]/40 via-[#279da6]/10 to-transparent ring-4 ring-shark/50 shadow-2xl relative group/avatar cursor-pointer overflow-hidden"
                                    >
                                        {isLoading ? (
                                            <Loader2 size={24} className="text-[#279da6] animate-spin" />
                                        ) : avatarUrl ? (
                                            <Image
                                                src={avatarUrl}
                                                alt="Profile"
                                                fill
                                                unoptimized
                                                className="object-cover"
                                            />
                                        ) : (
                                            (displayProfile?.organization || displayProfile?.full_name || displayProfile?.email || 'U').split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                                        )}

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 z-20">
                                            {isUploading ? (
                                                <Loader2 size={18} className="text-[#279da6] animate-spin" />
                                            ) : (
                                                <>
                                                    <Camera size={18} className="text-white" />
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-white">Change</span>
                                                </>
                                            )}
                                        </div>

                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden"
                                            accept="image/*"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        {isLoading ? (
                                            <div className="space-y-2">
                                                <div className="h-8 w-48 bg-shark/50 animate-pulse rounded-lg" />
                                                <div className="h-3 w-32 bg-shark/30 animate-pulse rounded-md" />
                                            </div>
                                        ) : (
                                            <>
                                                <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
                                                    {displayProfile?.organization || displayProfile?.full_name || (displayProfile?.role === 'super_admin' ? 'Super Admin' : 'User Account')}
                                                </h2>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-[10px] font-black text-storm-gray uppercase tracking-[0.2em]">{displayProfile?.role?.replace('_', ' ') || 'Guest Account'}</p>
                                                    <div className="w-1 h-1 rounded-full bg-[#279da6]" />
                                                    <p className="text-[10px] font-black text-[#279da6] uppercase tracking-[0.2em]">{displayProfile?.email}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Settings Form Grid */}
                            <form onSubmit={handleUpdateAccount} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Identity Section */}
                                <div className="bg-[#18181B] border border-shark/60 rounded-[2.5rem] p-10 space-y-8 animate-fade-in shadow-xl">
                                    <h3 className="text-[11px] font-black text-storm-gray uppercase tracking-[0.3em] flex items-center gap-3">
                                        <User size={14} className="text-[#279da6]" /> Identity & Contact
                                    </h3>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-storm-gray uppercase tracking-[0.25em] ml-2">
                                                {displayProfile?.role === 'client' ? 'Contact Person' : 'Full Name'}
                                            </label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-storm-gray" size={16} />
                                                <input
                                                    type="text"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-4 pl-12 pr-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 transition-all font-bold"
                                                    placeholder={profile?.role === 'super_admin' ? "Super Admin" : "Enter name"}
                                                />
                                            </div>
                                        </div>

                                        {displayProfile?.role === 'client' && (
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-storm-gray uppercase tracking-[0.25em] ml-2">Company/Organization Name</label>
                                                <div className="relative">
                                                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-storm-gray" size={16} />
                                                    <input
                                                        type="text"
                                                        value={organization}
                                                        onChange={(e) => setOrganization(e.target.value)}
                                                        className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-4 pl-12 pr-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 transition-all font-bold"
                                                        placeholder="Enter company name"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-storm-gray uppercase tracking-[0.25em] ml-2">Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-storm-gray" size={16} />
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-4 pl-12 pr-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 transition-all font-bold"
                                                    placeholder="email@example.com"
                                                />
                                            </div>
                                            <p className="text-[9px] text-storm-gray/60 ml-2 font-bold italic lowercase italic opacity-80">changing email requires logging in again.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Security Section */}
                                <div className="bg-[#18181B] border border-shark/60 rounded-[2.5rem] p-10 space-y-8 animate-fade-in shadow-xl">
                                    <h3 className="text-[11px] font-black text-storm-gray uppercase tracking-[0.3em] flex items-center gap-3">
                                        <Lock size={14} className="text-[#279da6]" /> Security & Access
                                    </h3>

                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-storm-gray uppercase tracking-[0.25em] ml-2">New Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-storm-gray" size={16} />
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-4 pl-12 pr-12 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 transition-all font-bold"
                                                    placeholder={password ? "" : "Dontchangeme@01"}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-storm-gray hover:text-white transition-colors"
                                                >
                                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-storm-gray uppercase tracking-[0.25em] ml-2">Confirm Password</label>
                                            <div className="relative">
                                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-storm-gray" size={16} />
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-4 pl-12 pr-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 transition-all font-bold"
                                                    placeholder="Confirm new password"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Footer / Action */}
                                <div className="lg:col-span-2 flex items-center justify-between bg-shark/10 border border-shark/30 p-8 rounded-[2rem]">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-iron uppercase tracking-widest leading-none">Finalize Profile Update</p>
                                        <p className="text-[9px] text-storm-gray font-bold lowercase opacity-80">last synced: {new Date().toLocaleTimeString()}</p>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isUpdating}
                                        className="h-14 truncate px-10 bg-[#279da6] hover:bg-[#279da6]/90 text-white rounded-[1.25rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-[#279da6]/30 active:scale-95 disabled:opacity-50 flex items-center gap-3"
                                    >
                                        {isUpdating ? <Loader2 size={16} className="animate-spin" /> : null}
                                        {isUpdating ? 'Synchronizing...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>

                            {/* Invoice Seller Details — Admin / Super Admin */}
                            {(displayProfile?.role === 'super_admin' || displayProfile?.role === 'admin') && (
                                <div className="bg-[#18181B] border border-shark/60 rounded-[2.5rem] p-10 space-y-8 animate-fade-in shadow-xl">
                                    <h3 className="text-[11px] font-black text-storm-gray uppercase tracking-[0.3em] flex items-center gap-3">
                                        <Receipt size={14} className="text-[#279da6]" /> Invoice — Seller Details
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-storm-gray uppercase tracking-[0.25em] ml-2">Company Name</label>
                                            <input
                                                type="text"
                                                value={invoiceCompany}
                                                onChange={(e) => setInvoiceCompany(e.target.value)}
                                                className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-3.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-storm-gray uppercase tracking-[0.25em] ml-2">Phone</label>
                                            <input
                                                type="text"
                                                value={invoicePhone}
                                                onChange={(e) => setInvoicePhone(e.target.value)}
                                                className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-3.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[9px] font-black text-storm-gray uppercase tracking-[0.25em] ml-2">Address</label>
                                            <textarea
                                                value={invoiceAddress}
                                                onChange={(e) => setInvoiceAddress(e.target.value)}
                                                rows={3}
                                                className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-3.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 font-bold resize-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-storm-gray uppercase tracking-[0.25em] ml-2">Website</label>
                                            <input
                                                type="text"
                                                value={invoiceWebsite}
                                                onChange={(e) => setInvoiceWebsite(e.target.value)}
                                                className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-3.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-storm-gray uppercase tracking-[0.25em] ml-2">GSTIN (update when ready)</label>
                                            <input
                                                type="text"
                                                value={invoiceGstin}
                                                onChange={(e) => setInvoiceGstin(e.target.value.toUpperCase())}
                                                className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-3.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 font-bold tracking-wider"
                                                placeholder="27AAAAA0000A1Z5"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-storm-gray uppercase tracking-[0.25em] ml-2">GST Rate %</label>
                                            <input
                                                type="text"
                                                value={invoiceGstRate}
                                                onChange={(e) => setInvoiceGstRate(e.target.value)}
                                                className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-3.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-storm-gray uppercase tracking-[0.25em] ml-2">Default SAC</label>
                                            <input
                                                type="text"
                                                value={invoiceSac}
                                                onChange={(e) => setInvoiceSac(e.target.value)}
                                                className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-3.5 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 font-bold"
                                            />
                                        </div>
                                    </div>

                                    {invoiceStatus && (
                                        <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border text-xs font-bold uppercase tracking-tight ${invoiceStatus.type === 'success'
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                            }`}>
                                            {invoiceStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                            {invoiceStatus.message}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleSaveInvoiceSettings}
                                        disabled={isSavingInvoice}
                                        className="px-8 py-3 bg-[#279da6] hover:bg-[#279da6]/90 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-[#279da6]/30 active:scale-95 disabled:opacity-50 flex items-center gap-3"
                                    >
                                        {isSavingInvoice ? <Loader2 size={14} className="animate-spin" /> : <Receipt size={14} />}
                                        {isSavingInvoice ? 'Saving...' : 'Save Invoice Details'}
                                    </button>
                                </div>
                            )}

                            {/* Google Drive Root Folder — Super Admin Only */}
                            {displayProfile?.role === 'super_admin' && (
                                <div className="bg-[#18181B] border border-shark/60 rounded-[2.5rem] p-10 space-y-8 animate-fade-in shadow-xl">
                                    <h3 className="text-[11px] font-black text-storm-gray uppercase tracking-[0.3em] flex items-center gap-3">
                                        <HardDrive size={14} className="text-[#279da6]" /> Google Drive — Root Folder
                                    </h3>

                                    {/* Current Folder Display */}
                                    {currentRootFolderName && (
                                        <div className="flex items-center gap-4 p-5 bg-[#279da6]/5 border border-[#279da6]/20 rounded-2xl">
                                            <div className="w-10 h-10 rounded-xl bg-[#279da6]/10 flex items-center justify-center">
                                                <FolderOpen size={18} className="text-[#279da6]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{currentRootFolderName}</p>
                                                <p className="text-[10px] font-bold text-storm-gray tracking-tight truncate">{currentRootFolderId}</p>
                                            </div>
                                            <Check size={16} className="text-emerald-400 shrink-0" />
                                        </div>
                                    )}

                                    {/* Folder Input */}
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-storm-gray uppercase tracking-[0.25em] ml-2">Folder ID or Google Drive URL</label>
                                        <div className="relative">
                                            <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-storm-gray" size={16} />
                                            <input
                                                type="text"
                                                value={rootFolderInput}
                                                onChange={(e) => setRootFolderInput(e.target.value)}
                                                className="w-full bg-[#09090B] border border-shark/50 rounded-2xl py-4 pl-12 pr-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/50 transition-all font-bold"
                                                placeholder="Paste folder ID or https://drive.google.com/drive/folders/..."
                                            />
                                        </div>
                                    </div>

                                    {/* Folder Status */}
                                    {folderStatus && (
                                        <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border text-xs font-bold uppercase tracking-tight ${folderStatus.type === 'success'
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                            }`}>
                                            {folderStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                            {folderStatus.message}
                                        </div>
                                    )}

                                    {/* Save Button */}
                                    <div className="flex items-center gap-4">
                                        <button
                                            type="button"
                                            onClick={handleSaveRootFolder}
                                            disabled={isValidatingFolder || isSavingFolder || !rootFolderInput.trim()}
                                            className="px-8 py-3 bg-[#279da6] hover:bg-[#279da6]/90 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-[#279da6]/30 active:scale-95 disabled:opacity-50 flex items-center gap-3"
                                        >
                                            {(isValidatingFolder || isSavingFolder) ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                            {isValidatingFolder ? 'Validating...' : isSavingFolder ? 'Saving...' : 'Validate & Save'}
                                        </button>
                                        <p className="text-[9px] text-storm-gray/60 font-bold lowercase italic opacity-80">
                                            paste any Google Drive folder you have access to
                                        </p>
                                    </div>

                                </div>
                            )}
                        </div>
                    </main>
        </>
    );
}
