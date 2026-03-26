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
 * Fetches all clients from the database.
 * Joins with profiles for avatar/phone data. Uses clients.last_login directly
 * instead of calling supabase.auth.admin.listUsers() (which fetched ALL auth users).
 */
export async function getClients(): Promise<ClientItem[]> {
    const supabase = createServiceClient();

    let clientsRes, profilesRes;
    try {
        [clientsRes, profilesRes] = await Promise.all([
            supabase.from('clients').select('*').order('created_at', { ascending: false }),
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

    const profiles = profilesRes.data || [];

    // Build a lookup map for O(1) profile matching instead of O(n) per client
    const profileByEmail = new Map<string, typeof profiles[0]>();
    for (const p of profiles) {
        profileByEmail.set(p.email.toLowerCase(), p);
    }

    return (clientsRes.data || []).map(client => {
        const profile = profileByEmail.get(client.email.toLowerCase());
        return {
            ...client,
            profile_id: profile?.id || null,
            avatar_url: profile?.avatar_url || client.avatar_url || null,
            phone: (profile as any)?.phone || null,
            country_code: (profile as any)?.country_code || null,
            last_login: client.last_login || null,
            slug: slugify(client.organization || client.name)
        };
    });
}

/**
 * Fetches request and task counts for all clients.
 * Uses minimal selects — only the columns needed for counting.
 */
export async function getClientCounts() {
    const supabase = createServiceClient();

    const [requestsRes, tasksRes] = await Promise.all([
        supabase.from('requests').select('client_link_id'),
        supabase.from('tasks').select('id, task_request_links(request:request_id(client_link_id))')
    ]);

    const requestCounts: Record<string, number> = {};
    const taskCounts: Record<string, number> = {};

    requestsRes.data?.forEach(req => {
        if (req.client_link_id) {
            requestCounts[req.client_link_id] = (requestCounts[req.client_link_id] || 0) + 1;
        }
    });

    tasksRes.data?.forEach((task: any) => {
        const clientIds = new Set<string>();
        task.task_request_links?.forEach((link: any) => {
            if (link.request?.client_link_id) {
                clientIds.add(link.request.client_link_id);
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
        request_count: counts.requestCounts[client.id] || 0,
        task_count: counts.taskCounts[client.id] || 0
    }));
}
