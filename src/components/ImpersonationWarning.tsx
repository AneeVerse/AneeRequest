'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';

const ImpersonationWarning: React.FC = () => {
    const { isImpersonating, viewAsProfile, stopImpersonating } = useAuth();

    if (!isImpersonating) return null;

    return (
        <div className="flex items-center gap-2 animate-fade-in shrink-0">
            <div className="px-3 py-1.5 bg-[#22c55e]/10 border border-[#22c55e]/40 rounded-lg flex items-center gap-2">
                <label className="text-[10px] font-black text-[#22c55e] uppercase tracking-widest">Viewing as:</label>
                <span className="text-[11px] font-black text-white uppercase">{viewAsProfile?.full_name}</span>
            </div>
            <button
                onClick={stopImpersonating}
                className="px-3 py-1.5 bg-[#22c55e] text-[#09090B] text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#22c55e]/90 transition-all flex items-center gap-1.5 shadow-lg shadow-[#22c55e]/20 cursor-pointer"
            >
                Stop Impersonating
            </button>
        </div>
    );
};

export default ImpersonationWarning;
