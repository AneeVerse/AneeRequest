import { createServiceClient } from '@/lib/supabase';
import { slugify } from '@/lib/utils';

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
 * Fetches tasks with necessary joins
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
                    client:client_id (id, full_name:name, email)
                )
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching tasks:', error.message);
        return [];
    }

    const tasks = (data || []) as any[];

    // Fetch organizations for all clients linked to these tasks
    const clientEmails = tasks
        .flatMap(t => t.request_links || [])
        .map(rl => rl.request?.client?.email)
        .filter(Boolean) as string[];

    if (clientEmails.length > 0) {
        const { data: clientsData } = await supabase
            .from('clients')
            .select('email, organization')
            .in('email', clientEmails);

        if (clientsData) {
            tasks.forEach(t => {
                t.request_links?.forEach((rl: any) => {
                    const client = rl.request?.client;
                    if (client?.email) {
                        const c = clientsData.find(cd => cd.email === client.email);
                        if (c) {
                            client.organization = c.organization;
                        }
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

    // Fetch tasks, profiles (for assignment), team members, and requests
    const [tasks, profilesRes, teamRes, requestsRes] = await Promise.all([
        getTasksData(),
        supabase.from('profiles').select('id, full_name, email, role'),
        supabase.from('team_members').select('*'),
        supabase.from('requests').select('id, title').order('created_at', { ascending: false })
    ]);

    return {
        tasks,
        profiles: profilesRes.data || [],
        teamMembers: teamRes.data || [],
        requests: requestsRes.data || []
    };
}
