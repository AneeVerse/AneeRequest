'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react';
import { formatDate as formatDateStandard } from '@/lib/dateUtils';

interface CustomDateRangePickerProps {
    from?: string;
    to?: string;
    onChange: (from: string, to: string) => void;
    placeholder?: string;
}

export default function CustomDateRangePicker({ from, to, onChange, placeholder = 'NOT SET' }: CustomDateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0 });
    const popoverRef = useRef<HTMLDivElement>(null);

    // Internal state for the picker
    const [viewDate, setViewDate] = useState(new Date());
    const [tempFrom, setTempFrom] = useState<Date | null>(from ? new Date(from) : null);
    const [tempTo, setTempTo] = useState<Date | null>(to ? new Date(to) : null);

    const updatePosition = () => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const popoverWidth = 688; // Approximate width of dual calendars + gap + padding
            const viewportWidth = window.innerWidth;

            // Align right edge of popover with right edge of container
            let left = rect.right - popoverWidth;

            // Boundary checks
            if (left < 20) left = 20;
            if (left + popoverWidth > viewportWidth - 20) {
                left = viewportWidth - popoverWidth - 20;
            }

            setPopoverCoords({
                top: rect.bottom + window.scrollY + 12,
                left: left + window.scrollX
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            // Reset temp state to current props when opening
            setTempFrom(from ? new Date(from) : null);
            setTempTo(to ? new Date(to) : null);
        }
        return () => window.removeEventListener('resize', updatePosition);
    }, [isOpen, from, to]);

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getDisplayValue = () => {
        if (!from && !to) return placeholder;
        if (from && !to) return `FROM ${formatDateStandard(from)}`;
        if (!from && to) return `UNTIL ${formatDateStandard(to)}`;
        if (from === to) return formatDateStandard(from);

        const fromDate = formatDateStandard(from);
        // For the "from" part in a range, we might want to omit the year if it's the same, 
        // but user asked for "04 MAR 26", so I'll keep it simple and consistent.
        // Actually, the previous implementation did: 28 FEB - 04 MAR 2026
        // Let's stick to the requested format for both.
        return `${fromDate} - ${formatDateStandard(to)}`;
    };

    const handleDateClick = (date: Date) => {
        if (!tempFrom || (tempFrom && tempTo)) {
            setTempFrom(date);
            setTempTo(null);
        } else {
            if (date < tempFrom) {
                setTempTo(tempFrom);
                setTempFrom(date);
            } else {
                setTempTo(date);
            }
        }
    };

    const handleApply = () => {
        onChange(tempFrom ? formatDate(tempFrom) : '', tempTo ? formatDate(tempTo) : (tempFrom ? formatDate(tempFrom) : ''));
        setIsOpen(false);
    };

    const handleCancel = () => {
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange('', '');
        setIsOpen(false);
    };

    const renderCalendar = (monthOffset: number) => {
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth() + monthOffset, 1);
        const monthName = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear();

        const firstDayOfMonth = new Date(year, date.getMonth(), 1).getDay();
        const daysInMonth = new Date(year, date.getMonth() + 1, 0).getDate();

        const days = [];
        // Fill empty days at start
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="w-10 h-10" />);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const currentDay = new Date(year, date.getMonth(), d);
            const isSelected = (tempFrom && formatDate(currentDay) === formatDate(tempFrom)) ||
                (tempTo && formatDate(currentDay) === formatDate(tempTo));
            const isInRange = tempFrom && tempTo && currentDay > tempFrom && currentDay < tempTo;

            days.push(
                <button
                    key={d}
                    onClick={() => handleDateClick(currentDay)}
                    className={`w-10 h-10 text-[12px] font-bold rounded-xl transition-all flex items-center justify-center
                        ${isSelected ? 'bg-[#279da6] text-white shadow-[0_0_15px_rgba(39,157,166,0.4)] scale-110 z-10' :
                            isInRange ? 'bg-[#279da6]/20 text-[#279da6] rounded-none' :
                                'text-iron hover:bg-shark/50'}`}
                >
                    {d}
                </button>
            );
        }

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    {monthOffset === 0 ? (
                        <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-2 hover:bg-shark rounded-lg text-storm-gray transition-colors">
                            <ChevronLeft size={16} />
                        </button>
                    ) : <div className="w-8" />}

                    <span className="text-[13px] font-black uppercase tracking-widest text-[#279da6]">
                        {monthName} {year}
                    </span>

                    {monthOffset === 1 ? (
                        <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-2 hover:bg-shark rounded-lg text-storm-gray transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    ) : <div className="w-8" />}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(day => (
                        <div key={day} className="w-10 h-8 flex items-center justify-center text-[10px] font-black text-storm-gray tracking-tighter">
                            {day}
                        </div>
                    ))}
                    {days}
                </div>
            </div>
        );
    };

    return (
        <>
            <div
                ref={containerRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 px-4 py-2.5 bg-black/40 border rounded-xl cursor-pointer transition-all duration-300 group
                    ${isOpen ? 'border-[#279da6]/40 ring-2 ring-[#279da6]/10 bg-black/60 shadow-[0_0_20px_rgba(39,157,166,0.1)]' : 'border-shark/50 hover:border-shark hover:bg-black/50'}`}
            >
                <CalendarIcon size={14} className={`transition-colors ${isOpen ? 'text-[#279da6]' : 'text-storm-gray group-hover:text-iron'}`} />
                <span className={`text-[12px] font-black uppercase tracking-widest truncate flex-1 ${(!from && !to) ? 'text-storm-gray' : 'text-iron'}`}>
                    {getDisplayValue()}
                </span>
                {(from || to) && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange('', '');
                        }}
                        className="p-1 hover:bg-shark rounded-md text-storm-gray hover:text-white transition-colors"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            {isOpen && createPortal(
                <div
                    className="fixed z-[9999] p-6 bg-[#121214] border border-shark/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-6 animate-in fade-in zoom-in duration-200"
                    style={{ top: popoverCoords.top, left: popoverCoords.left }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex gap-8">
                        {renderCalendar(0)}
                        {renderCalendar(1)}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-shark/50">
                        <button
                            onClick={handleClear}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest text-[#ef4444] hover:bg-[#ef4444]/10 transition-all group/clear"
                            title="Clear date range"
                        >
                            <Trash2 size={13} className="opacity-60 group-hover/clear:opacity-100 transition-opacity" />
                            <span>Clear</span>
                        </button>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest text-storm-gray hover:text-white hover:bg-shark/30 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApply}
                                className="px-6 py-2 rounded-xl bg-[#279da6] text-[11px] font-black uppercase tracking-widest text-white hover:bg-[#2fc4cf] transition-all shadow-[0_0_15px_rgba(39,157,166,0.3)]"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
