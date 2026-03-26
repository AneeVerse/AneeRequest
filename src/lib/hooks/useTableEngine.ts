'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface SortConfig {
    key: string;
    direction: 'asc' | 'desc' | null;
}

interface UseTableEngineOptions {
    defaultSort?: SortConfig;
}

/**
 * Shared table logic extracted from RequestsTable and TasksTable.
 * Handles: portal filter positioning, sort state, click-outside closing.
 */
export function useTableEngine(options?: UseTableEngineOptions) {
    const [activeFilterHeader, setActiveFilterHeader] = useState<string | null>(null);
    const [filterCoords, setFilterCoords] = useState({ top: 0, left: 0, width: 0 });
    const [mounted, setMounted] = useState(false);
    const headerRefs = useRef<{ [key: string]: HTMLTableCellElement | null }>({});

    useEffect(() => {
        setMounted(true);
    }, []);

    const updateFilterPosition = useCallback((filterKey: string) => {
        const el = headerRefs.current[filterKey];
        if (el) {
            const rect = el.getBoundingClientRect();
            setFilterCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, []);

    const toggleFilter = useCallback((filterKey: string) => {
        if (activeFilterHeader === filterKey) {
            setActiveFilterHeader(null);
        } else {
            updateFilterPosition(filterKey);
            setActiveFilterHeader(filterKey);
        }
    }, [activeFilterHeader, updateFilterPosition]);

    const [sortConfig, setSortConfig] = useState<SortConfig>(
        options?.defaultSort || { key: 'created_at', direction: 'desc' }
    );

    // Close filter dropdowns on click outside
    useEffect(() => {
        if (!activeFilterHeader) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (!(event.target as Element).closest('.header-filter-container')) {
                setActiveFilterHeader(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeFilterHeader]);

    const closeFilter = useCallback(() => setActiveFilterHeader(null), []);

    return {
        // Filter header state
        activeFilterHeader,
        filterCoords,
        mounted,
        headerRefs,
        toggleFilter,
        closeFilter,

        // Sort state
        sortConfig,
        setSortConfig,
    };
}

/**
 * Generic sort comparator that handles nested fields.
 * Pass a map of key -> accessor function for custom field resolution.
 */
export function createSortComparator<T>(
    sortConfig: SortConfig,
    accessors?: Record<string, (item: T) => any>,
    defaultSortFn?: (a: T, b: T) => number
) {
    return (a: T, b: T): number => {
        // Default sort when no key is specified
        if (!sortConfig.key && defaultSortFn) {
            return defaultSortFn(a, b);
        }

        if (!sortConfig.direction) return 0;

        let aValue: any;
        let bValue: any;

        // Use custom accessor if provided
        if (accessors && accessors[sortConfig.key]) {
            aValue = accessors[sortConfig.key](a);
            bValue = accessors[sortConfig.key](b);
        } else {
            aValue = (a as any)[sortConfig.key];
            bValue = (b as any)[sortConfig.key];
        }

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    };
}
