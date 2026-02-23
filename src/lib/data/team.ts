import { createServiceClient } from '@/lib/supabase';

export interface TeamMember {
    id: string;
    profile_id?: string | null;
    name: string;
    email: string;
    position: string;
    status: string;
    created_at: string;
    last_login: string | null;
    avatar_url?: string | null;
    department?: string | null;
    role?: string | null;
}

/**
 * Fetches all team members from the database with merged profile data
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
    const supabase = createServiceClient();

    // Fetch from both tables and Auth to replicate the API route logic
    const [teamRes, profilesRes, authRes] = await Promise.all([
        supabase.from('team_members').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, email, full_name, role, avatar_url'),
        supabase.auth.admin.listUsers()
    ]);

    if (teamRes.error) {
        console.error('Error fetching team members:', teamRes.error);
        return [];
    }

    const profiles = profilesRes.data || [];
    const authUsers = authRes.data?.users || [];

    // Merge by email as per api/team/route.ts
    return teamRes.data.map(member => {
        const profile = profiles.find(p => p.email.toLowerCase() === member.email.toLowerCase());
        const authUser = authUsers.find(u => u.email?.toLowerCase() === member.email.toLowerCase());

        return {
            ...member,
            profile_id: profile?.id || member.profile_id || null,
            avatar_url: profile?.avatar_url || null,
            role: profile?.role || member.role || null,
            last_login: authUser?.last_sign_in_at || member.last_login || null
        };
    });
}

/**
 * Fetches request counts for each team member
 */
export async function getTeamMemberRequestCounts(): Promise<Record<string, number>> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
        .from('requests')
        .select('assigned_to');

    if (error) {
        console.error('Error fetching request counts:', error);
        return {};
    }

    // Count occurrences
    const countMap: Record<string, number> = {};
    data?.forEach((req: any) => {
        if (req.assigned_to) {
            countMap[req.assigned_to] = (countMap[req.assigned_to] || 0) + 1;
        }
    });

    return countMap;
}

/**
 * Fetches task counts for each team member
 */
export async function getTeamMemberTaskCounts(): Promise<Record<string, number>> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
        .from('tasks')
        .select('assigned_to');

    if (error) {
        console.error('Error fetching task counts:', error);
        return {};
    }

    const countMap: Record<string, number> = {};
    data?.forEach((task: any) => {
        if (task.assigned_to) {
            countMap[task.assigned_to] = (countMap[task.assigned_to] || 0) + 1;
        }
    });

    return countMap;
}

/**
 * Fetches tasks for each team member
 */
export async function getTeamMemberTasks(): Promise<Record<string, string[]>> {
    const supabase = createServiceClient();

    const { data, error } = await supabase
        .from('tasks')
        .select('assigned_to, title');

    if (error) {
        console.error('Error fetching task titles:', error);
        return {};
    }

    const taskMap: Record<string, string[]> = {};
    data?.forEach((task: any) => {
        if (task.assigned_to) {
            if (!taskMap[task.assigned_to]) {
                taskMap[task.assigned_to] = [];
            }
            taskMap[task.assigned_to].push(task.title);
        }
    });

    return taskMap;
}

/**
 * Fetches all team data (members + counts) in parallel
 */
export async function getAllTeamData() {
    const [members, counts, taskCounts, tasks] = await Promise.all([
        getTeamMembers(),
        getTeamMemberRequestCounts(),
        getTeamMemberTaskCounts(),
        getTeamMemberTasks(),
    ]);

    return { members, counts, taskCounts, tasks };
}

/**
 * Returns a single list of team members enriched with roles and request counts
 */
export async function getEnrichedTeamMembers() {
    const { members, counts, taskCounts, tasks } = await getAllTeamData();

    return members.map(m => {
        // Normalize role for UI - Prioritize position over generic role
        const rawRole = (m.position || m.role || 'viewer').toLowerCase();
        let uiRole = 'viewer';
        if (rawRole.includes('admin')) uiRole = 'admin';
        else if (rawRole.includes('editor')) uiRole = 'editor';

        return {
            ...m,
            role: uiRole,
            request_count: (m.profile_id && counts[m.profile_id]) || 0,
            task_count: (m.profile_id && taskCounts[m.profile_id]) || 0,
            tasks: (m.profile_id && tasks[m.profile_id]) || []
        };
    });
}
