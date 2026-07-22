'use client';

import React from 'react';
import { Building, Mail, Calendar, Shield, MessageSquare, CreditCard, Clock, Eye, EyeOff, Loader2, HardDrive, FolderOpen, Link2, RefreshCw, Trash2, CheckCircle2, AlertCircle, Receipt } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import { INDIAN_STATES } from '@/lib/invoiceUtils';

interface ClientSettingsTabProps {
    client: any;
    requestsCount: number;
    tasksCount: number;
    settingsEmail: string;
    setSettingsEmail: (val: string) => void;
    settingsPassword: string;
    setSettingsPassword: (val: string) => void;
    settingsConfirmPassword: string;
    setSettingsConfirmPassword: (val: string) => void;
    showSettingsPassword: boolean;
    setShowSettingsPassword: (val: boolean) => void;
    isUpdating: boolean;
    handleSettingsSubmit: (e: React.FormEvent) => void;
    folderInput: string;
    setFolderInput: (val: string) => void;
    linkedFolderName: string;
    isValidatingFolder: boolean;
    isSavingFolder: boolean;
    folderStatus: any;
    handleSaveClientFolder: () => void;
    handleRemoveClientFolder: () => void;
    setActiveTab: (tab: string) => void;
    browseDriveFolder: (id: string, name: string) => void;
    billingAddress: string;
    setBillingAddress: (val: string) => void;
    billingStateCode: string;
    setBillingStateCode: (val: string) => void;
    clientGstin: string;
    setClientGstin: (val: string) => void;
    isSavingBilling: boolean;
    handleSaveBilling: () => void;
}

export default function ClientSettingsTab({
    client,
    requestsCount,
    tasksCount,
    settingsEmail,
    setSettingsEmail,
    settingsPassword,
    setSettingsPassword,
    settingsConfirmPassword,
    setSettingsConfirmPassword,
    showSettingsPassword,
    setShowSettingsPassword,
    isUpdating,
    handleSettingsSubmit,
    folderInput,
    setFolderInput,
    linkedFolderName,
    isValidatingFolder,
    isSavingFolder,
    folderStatus,
    handleSaveClientFolder,
    handleRemoveClientFolder,
    setActiveTab,
    browseDriveFolder,
    billingAddress,
    setBillingAddress,
    billingStateCode,
    setBillingStateCode,
    clientGstin,
    setClientGstin,
    isSavingBilling,
    handleSaveBilling,
}: ClientSettingsTabProps) {
    return (
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
                        <p className="text-2xl font-black text-white">{requestsCount}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6] group-hover:scale-110 transition-transform">
                        <MessageSquare size={20} />
                    </div>
                </div>
                <div className="bg-[#18181B] border border-shark rounded-3xl p-6 flex items-center justify-between group hover:border-[#279da6]/20 transition-all">
                    <div>
                        <p className="text-[9px] font-black text-storm-gray uppercase tracking-[0.3em] mb-1">Total Tasks</p>
                        <p className="text-2xl font-black text-white">{tasksCount}</p>
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

                            {folderStatus && (
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

            {/* Billing / Invoice details */}
            <div className="bg-[#18181B] border border-shark rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-[#279da6]/10 flex items-center justify-center text-[#279da6]">
                        <Receipt size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-iron tracking-tight uppercase">Billing Details</h2>
                        <p className="text-xs font-bold text-santas-gray uppercase tracking-widest">
                            Used on GST / Non-GST invoices
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-[0.2em]">
                            Billing Address
                        </label>
                        <textarea
                            value={billingAddress}
                            onChange={(e) => setBillingAddress(e.target.value)}
                            rows={3}
                            className="w-full bg-[#09090B] border border-shark/60 rounded-2xl py-3 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60 transition-all font-bold resize-none"
                            placeholder="Street, city, PIN…"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-[0.2em]">
                            State
                        </label>
                        <select
                            value={billingStateCode}
                            onChange={(e) => setBillingStateCode(e.target.value)}
                            className="w-full bg-[#09090B] border border-shark/60 rounded-2xl py-3 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60 transition-all font-bold"
                        >
                            {INDIAN_STATES.map((s) => (
                                <option key={s.code} value={s.code}>
                                    {s.name} ({s.code})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-storm-gray uppercase tracking-[0.2em]">
                            Client GSTIN
                        </label>
                        <input
                            type="text"
                            value={clientGstin}
                            onChange={(e) => setClientGstin(e.target.value.toUpperCase())}
                            className="w-full bg-[#09090B] border border-shark/60 rounded-2xl py-3 px-4 text-sm text-iron focus:outline-none focus:border-[#279da6]/60 transition-all font-bold tracking-wider"
                            placeholder="Optional — for GST invoices"
                        />
                    </div>
                </div>

                <div className="pt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={handleSaveBilling}
                        disabled={isSavingBilling}
                        className="px-8 py-3 bg-[#279da6] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-[#279da6]/90 transition-all shadow-lg shadow-[#279da6]/20 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSavingBilling ? <Loader2 size={14} className="animate-spin" /> : null}
                        {isSavingBilling ? 'Saving...' : 'Save Billing'}
                    </button>
                </div>
            </div>
        </div>
    );
}
