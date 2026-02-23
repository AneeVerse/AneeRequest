import { getEnrichedClients } from '@/lib/data/clients';
import ClientsClient from '@/components/ClientsClient';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

// Force SSR
export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
    // Fetch clients data on the server
    const clientsData = await getEnrichedClients();

    // Map to UI format
    const mappedClients = clientsData.map((c: any) => {
        const lastLoginInfo = formatDateTime(c.last_login);
        return {
            id: c.id,
            profile_id: c.profile_id,
            name: c.name,
            email: c.email,
            organization: c.organization,
            createdAt: formatDate(c.created_at),
            lastLoginDate: lastLoginInfo.date,
            lastLoginTime: lastLoginInfo.time,
            lastLoginRaw: c.last_login,
            status: c.status || 'Ongoing',
            request_count: c.request_count || 0,
            task_count: c.task_count || 0
        };
    });

    return <ClientsClient initialClients={mappedClients} />;
}

