import { getRootFilesData } from '@/lib/data/files';
import { getClients } from '@/lib/data/clients';
import { getRequestsData } from '@/lib/data/requests';
import FilesClient from '@/components/FilesClient';

// Force SSR
export const dynamic = 'force-dynamic';

export default async function FilesPage() {
    // 1. Fetch initial drive content
    const { rootId, items } = await getRootFilesData();

    // 2. Fetch enrichment data (Clients & Requests)
    const [clientsData, requestsData] = await Promise.all([
        getClients(),
        getRequestsData() // super_admin defaults
    ]);

    const dbEnrichment = {
        clients: clientsData.map((c: any) => ({ id: c.id, name: c.name, org: c.organization })),
        requests: requestsData.map((r: any) => ({ id: r.id, title: r.title }))
    };

    return (
        <FilesClient
            initialRootId={rootId}
            initialDriveItems={items}
            initialDbEnrichment={dbEnrichment}
        />
    );
}
