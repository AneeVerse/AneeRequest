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
 * Fetches all team members from the database with merged profile data
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
    const supabase = createServiceClient();

    let teamRes, profilesRes, authRes;
    try {
        [teamRes, profilesRes, authRes] = await Promise.all([
            supabase.from('team_members').select('*').order('created_at', { ascending: false }),
            supabase.from('profiles').select('id, email, full_name, role, avatar_url, phone, country_code'),
            supabase.auth.admin.listUsers()
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
    if (authRes.error) console.error('Error listing auth users:', authRes.error);

    const membersData = teamRes.data || [];
    const profiles = profilesRes.data || [];
    const authUsers = authRes.data?.users || [];

    // Merge by profile_id first, then email (case-insensitive)
    return membersData.map(member => {
        const matchedProfiles = profiles.filter(p =>
            (member.profile_id && p.id === member.profile_id) ||
            (p.email.toLowerCase() === member.email.toLowerCase())
        );

        // Prioritize the profile that has an avatar if there are multiple matches
        const profile = matchedProfiles.find(p => p.avatar_url) || matchedProfiles[0];

        const matchedAuthUsers = authUsers.filter(u =>
            (member.profile_id && u.id === member.profile_id) ||
            u.email?.toLowerCase() === member.email.toLowerCase()
        );
        const authUser = matchedAuthUsers.find(u => u.last_sign_in_at) || matchedAuthUsers[0];

        // Fallback for avatar: Profile URL > Auth Metadata URL > null
        const avatarUrl = profile?.avatar_url || authUser?.user_metadata?.avatar_url || null;

        return {
            ...member,
            profile_id: profile?.id || member.profile_id || null,
            avatar_url: avatarUrl,
            phone: profile?.phone || null,
            country_code: profile?.country_code || null,
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
