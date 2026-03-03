import { createServiceClient } from '@/lib/supabase';
import { slugify } from '@/lib/utils';

export interface ClientItem {
    id: string;
    profile_id?: string | null;
    name: string;
    email: string;
    phone?: string | null;
    country_code?: string | null;
    organization: string;
    created_at: string;
    last_login: string | null;
    status: string;
    website?: string | null;
    slug: string;
    avatar_url?: string | null;
}

/**
 * Fetches all clients from the database
 */
export async function getClients(): Promise<ClientItem[]> {
    const supabase = createServiceClient();

    let clientsRes, authRes, profilesRes;
    try {
        [clientsRes, authRes, profilesRes] = await Promise.all([
            supabase.from('clients').select('*').order('created_at', { ascending: false }),
            supabase.auth.admin.listUsers(),
            supabase.from('profiles').select('id, email, full_name, role, avatar_url, phone, country_code')
        ]);

        // If the profiles fetch failed because of missing columns, try a fallback
        if (profilesRes.error && (profilesRes.error.message.includes('column') || profilesRes.error.code === '42703')) {
            console.warn('Profiles fetch failed, trying fallback without phone columns:', profilesRes.error.message);
            profilesRes = await supabase.from('profiles').select('id, email, full_name, role, avatar_url');
        }
    } catch (err) {
        console.error('Promise.all failed in getClients:', err);
        return [];
    }

    if (clientsRes.error) {
        console.error('Error fetching clients:', clientsRes.error);
        return [];
    }

    const authUsers = authRes.data?.users || [];
    const profiles = profilesRes.data || [];

    return (clientsRes.data || []).map(client => {
        const authUser = authUsers.find(u => u.email?.toLowerCase() === client.email.toLowerCase());
        const profile = profiles.find(p => p.email.toLowerCase() === client.email.toLowerCase());
        return {
            ...client,
            profile_id: profile?.id || null,
            avatar_url: profile?.avatar_url || client.avatar_url || null,
            phone: (profile as any)?.phone || null,
            country_code: (profile as any)?.country_code || null,
            last_login: authUser?.last_sign_in_at || client.last_login || null,
            slug: slugify(client.organization || client.name)
        };
    });
}

/**
 * Fetches request and task counts for all clients
 */
export async function getClientCounts() {
    const supabase = createServiceClient();

    // Fetch all requests and tasks to count by client_id
    const [requestsRes, tasksRes] = await Promise.all([
        supabase.from('requests').select('client_id'),
        supabase.from('tasks').select('id, task_request_links(request:request_id(client_id))')
    ]);

    const requestCounts: Record<string, number> = {};
    const taskCounts: Record<string, number> = {};

    requestsRes.data?.forEach(req => {
        if (req.client_id) {
            requestCounts[req.client_id] = (requestCounts[req.client_id] || 0) + 1;
        }
    });

    tasksRes.data?.forEach((task: any) => {
        // A task can be linked to multiple requests, but usually one client.
        // We'll count unique clients per task to avoid double counting if linked to multiple requests of same client. Or just pick first.
        const clientIds = new Set<string>();
        task.task_request_links?.forEach((link: any) => {
            if (link.request?.client_id) {
                clientIds.add(link.request.client_id);
            }
        });

        clientIds.forEach(clientId => {
            taskCounts[clientId] = (taskCounts[clientId] || 0) + 1;
        });
    });

    return { requestCounts, taskCounts };
}

/**
 * Returns clients enriched with counts
 */
export async function getEnrichedClients() {
    const [clients, counts] = await Promise.all([
        getClients(),
        getClientCounts()
    ]);

    return clients.map(client => ({
        ...client,
        request_count: (client.profile_id && counts.requestCounts[client.profile_id]) || 0,
        task_count: (client.profile_id && counts.taskCounts[client.profile_id]) || 0
    }));
}

