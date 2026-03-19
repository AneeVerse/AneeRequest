'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react';
import { formatDate as formatDateStandard } from '@/lib/dateUtils';

interface CustomDatePickerProps {
    value?: string | null;
    onChange: (date: string | null) => void;
    placeholder?: string;
    className?: string;
    variant?: 'default' | 'minimal';
}

export default function CustomDatePicker({
    value,
    onChange,
    placeholder = 'NOT SET',
    className = '',
    variant = 'default'
}: CustomDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0 });
    const popoverRef = useRef<HTMLDivElement>(null);

    // Internal state for the picker
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
    const [tempDate, setTempDate] = useState<Date | null>(value ? new Date(value) : null);

    const updatePosition = () => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const popoverWidth = 280; // Width of the popover as defined in style
            const popoverHeight = 350; // Estimated height of calendar + controls
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Calculate center of the container
            const containerCenter = rect.left + rect.width / 2;

            // Align center of popover with center of container
            let left = containerCenter - popoverWidth / 2;

            // Horizontal boundary checks
            if (left < 20) left = 20;
            if (left + popoverWidth > viewportWidth - 20) {
                left = viewportWidth - popoverWidth - 20;
            }

            // Vertical boundary checks
            let top = rect.bottom + window.scrollY + 8;

            // If it would go off the bottom, show it above the input
            if (rect.bottom + popoverHeight > viewportHeight - 20) {
                top = rect.top + window.scrollY - popoverHeight - 8;
            }

            setPopoverCoords({
                top,
                left: left + window.scrollX
            });
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen &&
                containerRef.current && !containerRef.current.contains(event.target as Node) &&
                popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('mousedown', handleClickOutside);
            setTempDate(value ? new Date(value) : null);
            if (value) setViewDate(new Date(value));
        }

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, value]);

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getDisplayValue = () => {
        if (!value) return placeholder;
        return formatDateStandard(value);
    };

    const handleDateClick = (date: Date) => {
        setTempDate(date);
    };

    const handleApply = () => {
        if (tempDate) {
            onChange(formatDate(tempDate));
        }
        setIsOpen(false);
    };

    const handleCancel = () => {
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange(null);
        setIsOpen(false);
    };

    const renderCalendar = () => {
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        const monthName = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear();

        const firstDayOfMonth = new Date(year, date.getMonth(), 1).getDay();
        const daysInMonth = new Date(year, date.getMonth() + 1, 0).getDate();

        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="w-9 h-9" />);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const currentDay = new Date(year, date.getMonth(), d);
            const isSelected = tempDate && formatDate(currentDay) === formatDate(tempDate);
            const isToday = formatDate(currentDay) === formatDate(new Date());

            days.push(
                <button
                    key={d}
                    onClick={() => handleDateClick(currentDay)}
                    className={`w-9 h-9 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center
                        ${isSelected
                            ? 'bg-[#279da6] text-white shadow-[0_0_15px_rgba(39,157,166,0.4)] scale-110 z-10'
                            : isToday
                                ? 'text-[#279da6] border border-[#279da6]/20'
                                : 'text-iron hover:bg-shark/50'}`}
                >
                    {d}
                </button>
            );
        }

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <button
                        onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))}
                        className="p-1.5 hover:bg-shark rounded-lg text-storm-gray transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    <span className="text-[11px] font-black uppercase tracking-widest text-[#279da6]">
                        {monthName} {year}
                    </span>

                    <button
                        onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))}
                        className="p-1.5 hover:bg-shark rounded-lg text-storm-gray transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                    {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(day => (
                        <div key={day} className="w-9 h-6 flex items-center justify-center text-[9px] font-black text-storm-gray tracking-tighter">
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
                className={variant === 'minimal'
                    ? `flex items-center gap-2 group focus:outline-none cursor-pointer justify-center ${className}`
                    : `flex items-center gap-2 px-2.5 py-1.5 bg-black/40 border rounded-xl cursor-pointer transition-all duration-300 group ${className} ${isOpen ? 'border-[#279da6]/40 ring-2 ring-[#279da6]/10 bg-black/60 shadow-[0_0_20px_rgba(39,157,166,0.1)]' : 'border-shark/50 hover:border-shark hover:bg-black/50'}`
                }
            >
                <CalendarIcon size={variant === 'minimal' ? 14 : 12} className={`transition-colors shrink-0 ${isOpen ? 'text-[#279da6]' : 'text-storm-gray group-hover:text-[#279da6]'}`} />
                <span className={`font-black uppercase tracking-widest truncate ${variant === 'minimal' ? 'text-[12px]' : 'text-[10px]'} ${!value ? 'text-storm-gray' : 'text-iron group-hover:text-white'}`}>
                    {getDisplayValue()}
                </span>
                {(value && variant !== 'minimal') && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange(null);
                        }}
                        className="p-0.5 hover:bg-shark rounded text-storm-gray hover:text-white transition-colors"
                    >
                        <X size={10} />
                    </button>
                )}
            </div>

            {isOpen && createPortal(
                <div
                    ref={popoverRef}
                    className="fixed z-[9999] p-4 bg-[#101011] border border-shark/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-4 animate-in fade-in zoom-in duration-200"
                    style={{ top: popoverCoords.top, left: popoverCoords.left, width: '280px' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {renderCalendar()}

                    <div className="flex items-center justify-between pt-3 border-t border-shark/50">
                        <button
                            onClick={handleClear}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-[#ef4444] hover:bg-[#ef4444]/10 transition-all group/clear"
                            title="Clear date"
                        >
                            <Trash2 size={12} className="opacity-60 group-hover/clear:opacity-100 transition-opacity" />
                            <span>Clear</span>
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCancel}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-storm-gray hover:text-white hover:bg-shark/30 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApply}
                                className="px-4 py-1.5 rounded-lg bg-[#279da6] text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#2fc4cf] transition-all shadow-[0_0_15px_rgba(39,157,166,0.3)]"
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
