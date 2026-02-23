import { createServiceClient } from '@/lib/supabase';

export interface ClientItem {
    id: string;
    profile_id?: string | null;
    name: string;
    email: string;
    organization: string;
    created_at: string;
    last_login: string | null;
    status: string;
}

/**
 * Fetches all clients from the database
 */
export async function getClients(): Promise<ClientItem[]> {
    const supabase = createServiceClient();

    const [clientsRes, authRes] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.auth.admin.listUsers()
    ]);

    if (clientsRes.error) {
        console.error('Error fetching clients:', clientsRes.error);
        return [];
    }

    const authUsers = authRes.data?.users || [];

    return (clientsRes.data || []).map(client => {
        const authUser = authUsers.find(u => u.email?.toLowerCase() === client.email.toLowerCase());
        return {
            ...client,
            last_login: authUser?.last_sign_in_at || client.last_login || null
        };
    });
}
