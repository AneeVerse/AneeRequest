'use client';

import React from 'react';

function SkeletonRow({ cols = 7 }: { cols?: number }) {
    return (
        <tr className="border-b border-shark/30">
            <td className="px-5 py-4 border-r border-shark/30">
                <div className="h-3 w-6 bg-shark/40 rounded animate-pulse" />
            </td>
            {Array.from({ length: cols }).map((_, i) => (
                <td key={i} className="px-4 py-4 border-r border-shark/30">
                    <div className={`h-3 rounded animate-pulse bg-shark/40`} style={{ width: `${50 + Math.random() * 40}%`, animationDelay: `${i * 100}ms` }} />
                </td>
            ))}
        </tr>
    );
}

export default function LoadingSkeleton() {
    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header skeleton */}
            <div className="px-4 sm:px-6 py-4 border-b border-shark/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-5 w-5 bg-shark/40 rounded animate-pulse" />
                    <div className="h-5 w-32 bg-shark/40 rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-8 w-20 bg-shark/40 rounded-lg animate-pulse" />
                    <div className="h-8 w-20 bg-shark/40 rounded-lg animate-pulse" />
                </div>
            </div>

            {/* Tabs skeleton */}
            <div className="px-4 sm:px-6 py-3 border-b border-shark/40 flex items-center gap-4">
                {[80, 100, 60, 50].map((w, i) => (
                    <div key={i} className="h-4 bg-shark/40 rounded animate-pulse" style={{ width: w, animationDelay: `${i * 150}ms` }} />
                ))}
            </div>

            {/* Table skeleton */}
            <div className="flex-1 overflow-hidden px-3 sm:px-6 pt-4">
                <div className="border border-shark/30 rounded-xl overflow-hidden bg-black/20">
                    {/* Table header */}
                    <div className="bg-[#17171a] border-b border-shark/40 px-4 py-3 flex items-center gap-6">
                        {[30, 200, 150, 100, 120, 80, 100, 100].map((w, i) => (
                            <div key={i} className="h-3 bg-shark/40 rounded animate-pulse" style={{ width: w, animationDelay: `${i * 80}ms` }} />
                        ))}
                    </div>

                    {/* Table rows */}
                    <table className="w-full">
                        <tbody>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <SkeletonRow key={i} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
