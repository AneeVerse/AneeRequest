import { createServiceClient } from '@/lib/supabase';
import { getTeamMembers, type TeamMember } from './team';
export type { TeamMember };

export interface TaskItem {
    id: string;
    slug: string | null;
    title: string;
    description: string | null;
    status: 'Todo' | 'In Progress' | 'Review' | 'Done';
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    assigned_to: string | null;
    assignee?: { id: string; full_name: string } | null;
    created_by: string | null;
    creator?: { id: string; full_name: string } | null;
    request_links?: {
        request: {
            id: string;
            slug: string | null;
            title: string;
            client?: {
                id: string;
                full_name: string;
                email: string;
                avatar_url?: string;
                organization?: string;
            } | null;
        } | null;
    }[] | null;
    due_date: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Fetches tasks with necessary joins.
 * Client join now includes organization and avatar_url directly,
 * eliminating the previous N+1 secondary queries.
 */
export async function getTasksData() {
    const supabase = createServiceClient();

    const { data, error } = await supabase
        .from('tasks')
        .select(`
            *,
            assignee:assigned_to (
                id,
                full_name,
                team_members!team_members_profile_id_fkey (name)
            ),
            creator:created_by (
                id,
                full_name,
                team_members!team_members_profile_id_fkey (name)
            ),
            request_links:task_request_links (
                request:request_id (
                    id,
                    slug,
                    title,
                    client:client_id (id, full_name:name, email, organization, avatar_url)
                )
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching tasks:', error.message);
        return [];
    }

    const tasks = (data || []) as any[];

    // Enrich with avatar_url from profiles where client table doesn't have it
    const clientEmails = tasks
        .flatMap(t => t.request_links || [])
        .map(rl => rl.request?.client?.email)
        .filter(Boolean) as string[];

    if (clientEmails.length > 0) {
        const { data: profilesData } = await supabase
            .from('profiles')
            .select('email, avatar_url')
            .in('email', [...new Set(clientEmails)]);

        if (profilesData) {
            const avatarMap = new Map<string, string>();
            for (const p of profilesData) {
                if (p.avatar_url) avatarMap.set(p.email.toLowerCase(), p.avatar_url);
            }

            tasks.forEach(t => {
                t.request_links?.forEach((rl: any) => {
                    const client = rl.request?.client;
                    if (client?.email && !client.avatar_url) {
                        const avatar = avatarMap.get(client.email.toLowerCase());
                        if (avatar) client.avatar_url = avatar;
                    }
                });
            });
        }
    }

    return tasks as TaskItem[];
}

/**
 * Wrapper for initial page load data
 */
export async function getAllTasksData() {
    const supabase = createServiceClient();

    const [tasks, profilesRes, teamMembers, requestsRes] = await Promise.all([
        getTasksData(),
        supabase.from('profiles').select('id, full_name, email, role'),
        getTeamMembers(),
        supabase.from('requests').select('id, title, client:client_id (id, name, organization)').order('created_at', { ascending: false })
    ]);

    return {
        tasks,
        profiles: profilesRes.data || [],
        teamMembers,
        requests: requestsRes.data || []
    };
}
