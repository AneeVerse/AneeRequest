/**
 * Centralized date utility for consistent formatting across the application.
 */

export const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    const day = String(d.getDate()).padStart(2, '0');
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);

    return `${day} ${month} ${year}`;
};

export const formatTime = (date: string | Date | null | undefined): string => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';

    hours = hours % 12;
    hours = hours ? hours : 12; // Handle midnight (0)

    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

export const formatDateTime = (date: string | Date | null | undefined): { date: string, time: string } => {
    return {
        date: formatDate(date),
        time: formatTime(date)
    };
};

export const getAutomaticPriority = (dueDate: string | Date | null | undefined) => {
    if (!dueDate) {
        return {
            label: 'LOW',
            colorClass: 'text-storm-gray',
            rank: 1,
            isOverdue: false
        };
    }

    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // Overdue or < 12 hours
    if (diffMs < 0 || diffHours <= 12) {
        return {
            label: 'CRITICAL',
            colorClass: 'text-rose-500',
            rank: 4,
            isOverdue: diffMs < 0
        };
    }

    // 12 to 48 hours
    if (diffHours <= 48) {
        return {
            label: 'HIGH',
            colorClass: 'text-amber-500',
            rank: 3,
            isOverdue: false
        };
    }

    // 2 to 5 days (48 to 120 hours)
    if (diffHours <= 120) {
        return {
            label: 'MEDIUM',
            colorClass: 'text-blue-400',
            rank: 2,
            isOverdue: false
        };
    }

    // > 5 days
    return {
        label: 'LOW',
        colorClass: 'text-storm-gray',
        rank: 1,
        isOverdue: false
    };
};
