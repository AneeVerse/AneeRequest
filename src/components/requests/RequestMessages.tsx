'use client';

import React from 'react';
import Image from 'next/image';
import {
    Pencil,
    Trash2,
    Paperclip,
    Bold,
    Italic,
    Underline,
    List,
    Link as LinkIcon,
    Send,
    Loader2
} from 'lucide-react';

interface Message {
    id: string;
    sender_id: string;
    message: string;
    attachments: any[];
    is_edited?: boolean;
    created_at: string;
    sender: {
        full_name: string;
        avatar_url?: string | null;
    };
}

interface RequestMessagesProps {
    messages: Message[];
    displayProfileId?: string;
    profile: any;
    editingMessageId: string | null;
    setEditingMessageId: (id: string | null) => void;
    editedMessageContent: string;
    setEditedMessageContent: (content: string) => void;
    handleEditMessage: (id: string, content: string) => void;
    handleDeleteMessage: (id: string) => void;
    setPreviewFile: (file: any) => void;
    setIsPreviewOpen: (open: boolean) => void;
    editorRef: React.RefObject<HTMLDivElement | null>;
    handleEditorInput: () => void;
    execFormat: (command: string, value?: string) => void;
    handleInsertLink: () => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isUploading: boolean;
    handleSendMessage: () => void;
    isSending: boolean;
    newMessage: string;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

const RequestMessages: React.FC<RequestMessagesProps> = ({
    messages,
    displayProfileId,
    profile,
    editingMessageId,
    setEditingMessageId,
    editedMessageContent,
    setEditedMessageContent,
    handleEditMessage,
    handleDeleteMessage,
    setPreviewFile,
    setIsPreviewOpen,
    editorRef,
    handleEditorInput,
    execFormat,
    handleInsertLink,
    fileInputRef,
    handleFileUpload,
    isUploading,
    handleSendMessage,
    isSending,
    newMessage,
    messagesEndRef
}) => {
    const isHtmlContent = (str: string) => /<[a-z][\s\S]*>/i.test(str);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="pt-6 pb-8 px-8 max-w-4xl mx-auto w-full">
                    <div className="space-y-8">
                        {messages.map((msg) => {
                            const isMe = msg.sender_id === displayProfileId;
                            return (
                                <div key={msg.id} className={`flex gap-4 group ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-[46px] h-[46px] rounded-full flex items-center justify-center shrink-0 border border-white/5 shadow-lg relative overflow-hidden ${isMe ? 'bg-shark text-[#279da6]' : 'bg-shark text-[#279da6]'}`}>
                                        {isMe ? (
                                            profile?.avatar_url ? (
                                                <Image src={profile.avatar_url} alt={profile.full_name || 'User'} fill unoptimized className="object-cover" />
                                            ) : (
                                                <span className="font-black text-sm">{profile?.full_name?.split(' ').map((n: string) => n[0]).join('')}</span>
                                            )
                                        ) : (
                                            msg.sender?.avatar_url ? (
                                                <Image src={msg.sender.avatar_url} alt={msg.sender.full_name || 'User'} fill unoptimized className="object-cover" />
                                            ) : (
                                                <span className="font-black text-sm">{msg.sender?.full_name?.split(' ').map((n: string) => n[0]).join('')}</span>
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
                                            {editingMessageId === msg.id ? (
                                                <div className="space-y-3">
                                                    <textarea
                                                        value={editedMessageContent}
                                                        onChange={(e) => setEditedMessageContent(e.target.value)}
                                                        className="w-full bg-black/40 border border-[#279da6]/30 rounded-xl p-3 text-[12px] font-bold text-iron focus:outline-none focus:border-[#279da6]/60 min-h-[100px] resize-none"
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => setEditingMessageId(null)} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-storm-gray hover:text-white transition-all">Cancel</button>
                                                        <button onClick={() => handleEditMessage(msg.id, editedMessageContent)} className="px-4 py-1.5 rounded-lg bg-[#279da6] text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#20838b] transition-all">Save Changes</button>
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
                                                                        if (part.startsWith('**') && part.endsWith('**')) return <strong key={j}>{part.slice(2, -2)}</strong>;
                                                                        if (part.startsWith('__') && part.endsWith('__')) return <u key={j}>{part.slice(2, -2)}</u>;
                                                                        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={j}>{part.slice(1, -1)}</em>;
                                                                        if (part.startsWith('_') && part.endsWith('_') && part.length > 2) return <em key={j}>{part.slice(1, -1)}</em>;
                                                                        if (/^https?:\/\/[^\s]+$/.test(part)) return <a key={j} href={part} target="_blank" rel="noopener noreferrer" className="underline font-bold text-[#279da6]">{part}</a>;
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
                                                                onClick={() => {
                                                                    setPreviewFile({ name: at.name, url: at.url, previewUrl: driveProxyUrl, type: at.type });
                                                                    setIsPreviewOpen(true);
                                                                }}
                                                                className="block group/at cursor-pointer"
                                                            >
                                                                {at.type?.startsWith('image/') ? (
                                                                    <div className="relative rounded-lg overflow-hidden border border-white/10 shadow-lg max-w-[240px] aspect-video">
                                                                        <Image src={displayUrl} alt={at.name} fill unoptimized className="object-contain" />
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

            <div className="mt-auto px-6 pb-4 pt-2">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-shark/30 border border-shark/60 rounded-[2rem] overflow-hidden shadow-inner focus-within:border-[#279da6]/50 transition-all">
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
                            data-placeholder="Message team members about this task..."
                            className="w-full bg-transparent text-iron p-6 text-[12px] font-bold focus:outline-none min-h-[100px] empty:before:content-[attr(data-placeholder)] empty:before:text-storm-gray/50 empty:before:pointer-events-none [&_a]:text-[#279da6] [&_a]:underline border-b border-shark/40"
                        />
                        <div className="flex items-center justify-between p-4 bg-shark/10">
                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
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
                                onClick={handleSendMessage}
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
    );
};

export default RequestMessages;
