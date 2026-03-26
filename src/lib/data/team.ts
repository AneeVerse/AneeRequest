import { createServiceClient } from '@/lib/supabase';

export interface TeamMember {
    id: string;
    profile_id?: string | null;
    name: string;
    email: string;
    phone?: string | null;
    country_code?: string | null;
    position: string;
    status: string;
    created_at: string;
    last_login: string | null;
    avatar_url?: string | null;
    department?: string | null;
    role?: string | null;
    accessible_sections?: string[];
}

/**
 * Fetches all team members from the database with merged profile data.
 * Uses team_members.last_login directly instead of calling
 * supabase.auth.admin.listUsers() (which fetched ALL auth users).
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
    const supabase = createServiceClient();

    let teamRes, profilesRes;
    try {
        [teamRes, profilesRes] = await Promise.all([
            supabase.from('team_members').select('*').order('created_at', { ascending: false }),
            supabase.from('profiles').select('id, email, full_name, role, avatar_url, phone, country_code')
        ]);

        if (profilesRes.error && (profilesRes.error.message.includes('column') || profilesRes.error.code === '42703')) {
            console.warn('Profiles fetch failed in team, trying fallback without phone columns:', profilesRes.error.message);
            profilesRes = await supabase.from('profiles').select('id, email, full_name, role, avatar_url');
        }
    } catch (err) {
        console.error('Promise.all failed in getTeamMembers:', err);
        return [];
    }

    if (teamRes.error) console.error('Error fetching team members:', teamRes.error);
    if (profilesRes.error) console.error('Error fetching profiles:', profilesRes.error);

    const membersData = teamRes.data || [];
    const profiles = profilesRes.data || [];

    // Build lookup maps for O(1) matching instead of O(n) per member
    const profileById = new Map<string, typeof profiles[0]>();
    const profileByEmail = new Map<string, typeof profiles[0]>();
    for (const p of profiles) {
        profileById.set(p.id, p);
        profileByEmail.set(p.email.toLowerCase(), p);
    }

    return membersData.map(member => {
        // Match by profile_id first, then email
        const profile = (member.profile_id && profileById.get(member.profile_id))
            || profileByEmail.get(member.email.toLowerCase())
            || null;

        return {
            ...member,
            profile_id: profile?.id || member.profile_id || null,
            avatar_url: profile?.avatar_url || null,
            phone: (profile as any)?.phone || null,
            country_code: (profile as any)?.country_code || null,
            role: profile?.role || member.role || null,
            last_login: member.last_login || null
        };
    });
}

/**
 * Fetches request and task counts + task titles for all team members in 2 queries
 * (instead of the previous 3 separate full-table scans).
 */
export async function getTeamMemberCounts(): Promise<{
    requestCounts: Record<string, number>;
    taskCounts: Record<string, number>;
    taskTitles: Record<string, string[]>;
}> {
    const supabase = createServiceClient();

    const [requestsRes, tasksRes] = await Promise.all([
        supabase.from('requests').select('assigned_to'),
        supabase.from('tasks').select('assigned_to, title')
    ]);

    const requestCounts: Record<string, number> = {};
    const taskCounts: Record<string, number> = {};
    const taskTitles: Record<string, string[]> = {};

    requestsRes.data?.forEach((req: any) => {
        if (req.assigned_to) {
            requestCounts[req.assigned_to] = (requestCounts[req.assigned_to] || 0) + 1;
        }
    });

    tasksRes.data?.forEach((task: any) => {
        if (task.assigned_to) {
            taskCounts[task.assigned_to] = (taskCounts[task.assigned_to] || 0) + 1;
            if (!taskTitles[task.assigned_to]) taskTitles[task.assigned_to] = [];
            taskTitles[task.assigned_to].push(task.title);
        }
    });

    return { requestCounts, taskCounts, taskTitles };
}

/**
 * Returns a single list of team members enriched with roles and request counts.
 * Combines getTeamMembers() + getTeamMemberCounts() in parallel (2 queries instead of 5).
 */
export async function getEnrichedTeamMembers() {
    const [members, counts] = await Promise.all([
        getTeamMembers(),
        getTeamMemberCounts()
    ]);

    return members.map(m => {
        const rawRole = (m.position || m.role || 'viewer').toLowerCase();
        let uiRole = 'viewer';
        if (rawRole.includes('admin')) uiRole = 'admin';
        else if (rawRole.includes('editor')) uiRole = 'editor';

        return {
            ...m,
            role: uiRole,
            request_count: (m.profile_id && counts.requestCounts[m.profile_id]) || 0,
            task_count: (m.profile_id && counts.taskCounts[m.profile_id]) || 0,
            tasks: (m.profile_id && counts.taskTitles[m.profile_id]) || []
        };
    });
}

// Keep backward-compatible exports for any code that calls these individually
export async function getTeamMemberRequestCounts(): Promise<Record<string, number>> {
    return (await getTeamMemberCounts()).requestCounts;
}

export async function getTeamMemberTaskCounts(): Promise<Record<string, number>> {
    return (await getTeamMemberCounts()).taskCounts;
}

export async function getTeamMemberTasks(): Promise<Record<string, string[]>> {
    return (await getTeamMemberCounts()).taskTitles;
}
