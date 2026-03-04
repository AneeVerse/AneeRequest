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
