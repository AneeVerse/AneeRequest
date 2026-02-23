'use client';

import React from 'react';
import {
    ChevronRight,
    Search,
    CheckCircle2,
    Clock,
    ChevronDown
} from 'lucide-react';

export interface RequestItem {
    id: string;
    title: string;
    status: 'In Progress' | 'Todo' | 'Done' | 'Bug';
    priority?: string;
    assignee: {
        name: string;
        avatar?: string;
    };
    dueDate: string;
    type: 'Feature' | 'Bug' | 'Improvement';
}

const defaultMockRequests: RequestItem[] = [
    {
        id: '1',
        title: 'Document API endpoints',
        status: 'Todo',
        type: 'Improvement',
        assignee: { name: 'Pat Casey' },
        dueDate: 'Mar 6, 2026'
    },
    {
        id: '2',
        title: 'Add dark mode support',
        status: 'Done',
        type: 'Feature',
        assignee: { name: 'Jamie Fox' },
        dueDate: 'Feb 13, 2026'
    },
    {
        id: '3',
        title: 'Fix memory leak in notifications',
        status: 'Bug',
        type: 'Bug',
        assignee: { name: 'Jordan White' },
        dueDate: 'Mar 1, 2026'
    },
];

interface RequestsTableProps {
    title?: string;
    description?: string;
    requests?: RequestItem[];
}

const statusStyles = {
    'In Progress': 'bg-[#EAB308]/10 text-[#EAB308] border-[#EAB308]/20',
    'Todo': 'bg-[#279da6]/10 text-[#279da6] border-[#279da6]/20',
    'Done': 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20',
    'Bug': 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20',
};

const RequestsTable: React.FC<RequestsTableProps> = ({
    title,
    description,
    requests = defaultMockRequests
}) => {
    return (
        <div className="flex flex-col overflow-hidden">
            {title && (
                <div className="p-6 border-b border-shark">
                    <h3 className="text-xl font-bold text-iron">{title}</h3>
                    {description && <p className="text-sm text-santas-gray mt-1">{description}</p>}
                </div>
            )}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-auto">
                    <thead>
                        <tr className="border-b border-shark text-storm-gray text-[10px] uppercase font-bold tracking-wider bg-shark/20">
                            <th className="px-5 py-4 w-12 border-r border-shark/60 text-center">#</th>
                            <th className="px-6 py-4 border-r border-shark/60">
                                <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                                    Title <ChevronDown size={12} />
                                </div>
                            </th>
                            <th className="px-6 py-4 border-r border-shark/60">
                                <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                                    Status <ChevronDown size={12} />
                                </div>
                            </th>
                            <th className="px-6 py-4 border-r border-shark/60">
                                <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                                    Type <ChevronDown size={12} />
                                </div>
                            </th>
                            <th className="px-6 py-4">
                                <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                                    Due Date <ChevronDown size={12} />
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-shark/60">
                        {requests.map((request, index) => (
                            <tr key={request.id} className="hover:bg-shark/10 transition-colors group cursor-pointer">
                                <td className="px-5 py-3.5 border-r border-shark/60 text-center text-[11px] font-black text-storm-gray">
                                    {(index + 1).toString().padStart(2, '0')}
                                </td>
                                <td className="px-6 py-3.5 text-[12px] font-medium text-storm-gray border-r border-shark/60">
                                    <span className="group-hover:text-iron transition-colors">{request.title}</span>
                                </td>
                                <td className="px-6 py-3.5 border-r border-shark/60">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-md text-[10px] font-bold border ${statusStyles[request.status] || statusStyles.Todo}`}>
                                        {request.status === 'Done' && <CheckCircle2 size={10} />}
                                        {request.status === 'In Progress' && <HourglassIcon size={10} />}
                                        {request.status === 'Todo' && <Clock size={10} />}
                                        {request.status === 'Bug' && <AlertCircleIcon size={10} />}
                                        {request.status}
                                    </div>
                                </td>
                                <td className="px-6 py-3.5 text-[11px] font-bold text-storm-gray border-r border-shark/60">
                                    {request.type}
                                </td>
                                <td className="px-6 py-3.5 text-[11px] text-storm-gray">
                                    {request.dueDate}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-6 py-4 border-t border-shark flex items-center justify-between text-[10px] font-bold text-storm-gray bg-shark/5">
                <span className="uppercase tracking-widest">Showing {requests.length} entries</span>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1 px-2 py-1 rounded border border-shark hover:bg-shark transition-all">
                        <ChevronRight size={14} className="rotate-180" />
                        <span>Prev</span>
                    </button>
                    <button className="flex items-center gap-1 px-2 py-1 rounded border border-shark hover:bg-shark transition-all">
                        <span>Next</span>
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const HourglassIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14" /><path d="M5 2h14" /><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" /><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" /></svg>
);

const AlertCircleIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
);

export default RequestsTable;
