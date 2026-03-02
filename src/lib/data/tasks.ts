import { createServiceClient } from '@/lib/supabase';

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
                organization?: string;
                avatar_url?: string | null;
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
                        client:client_id (id, full_name, email, avatar_url)
                    )
                )
            `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching tasks:', error.message);
        return [];
    }

    const tasks = (data || []) as TaskItem[];

    // Extract client emails for organization/avatar enrichment
    const clientEmails = new Set<string>();
    tasks.forEach(task => {
        task.request_links?.forEach(link => {
            if (link.request?.client?.email) {
                clientEmails.add(link.request.client.email);
            }
        });
    });

    // Fetch organizations and avatars for all clients
    if (clientEmails.size > 0) {
        const { data: clientsData } = await supabase
            .from('clients')
            .select('email, organization')
            .in('email', Array.from(clientEmails));

        if (clientsData) {
            tasks.forEach(task => {
                task.request_links?.forEach(link => {
                    const email = link.request?.client?.email;
                    if (email) {
                        const c = clientsData.find(cd => cd.email.toLowerCase().trim() === email.toLowerCase().trim());
                        if (c) {
                            (link.request!.client as any).organization = c.organization;
                        }
                    }
                });
            });
        }
    }

    return tasks;
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
