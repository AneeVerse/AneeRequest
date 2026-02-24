import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { resolveRequestSlug } from '@/lib/utils';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idOrSlug } = await params;
        const id = await resolveRequestSlug(idOrSlug);
        const supabase = createServiceClient();

        const { data, error } = await supabase
            .from('request_assignments')
            .select(`
                *,
                team_member:team_member_id (
                    id,
                    name,
                    email,
                    department,
                    position,
                    profile_id,
                    profiles:profile_id (avatar_url)
                )
            `)
            .eq('request_id', id)
            .order('assigned_at', { ascending: false });

        if (error) throw error;

        // Flatten the nested profiles data
        const flattenedData = data.map(assignment => ({
            ...assignment,
            team_member: {
                ...assignment.team_member,
                avatar_url: assignment.team_member.profiles?.avatar_url || null
            }
        }));

        return NextResponse.json(flattenedData);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idOrSlug } = await params;
        const id = await resolveRequestSlug(idOrSlug);
        const body = await request.json();
        const { team_member_id, role, assigned_by } = body;

        if (!team_member_id || !role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const supabase = createServiceClient();

        // Check if assignment already exists
        const { data: existing } = await supabase
            .from('request_assignments')
            .select('id')
            .eq('request_id', id)
            .eq('team_member_id', team_member_id)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: "Team member already assigned to this request" }, { status: 409 });
        }

        const { data, error } = await supabase
            .from('request_assignments')
            .insert([
                {
                    request_id: id,
                    team_member_id,
                    role,
                    assigned_by
                }
            ])
            .select(`
                *,
                team_member:team_member_id (
                    id,
                    name,
                    email,
                    department,
                    position,
                    profile_id,
                    profiles:profile_id (avatar_url)
                )
            `)
            .single();

        if (error) throw error;

        // Flatten the nested profiles data
        const flattenedData = {
            ...data,
            team_member: {
                ...data.team_member,
                avatar_url: data.team_member.profiles?.avatar_url || null
            }
        };

        return NextResponse.json({
            message: "Team member assigned successfully",
            assignment: flattenedData
        });

    } catch (error: any) {
        console.error("Assignment Creation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idOrSlug } = await params;
        const id = await resolveRequestSlug(idOrSlug);
        const body = await request.json();
        const { assignment_id, role } = body;

        if (!assignment_id || !role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const supabase = createServiceClient();

        const { data, error } = await supabase
            .from('request_assignments')
            .update({ role })
            .eq('id', assignment_id)
            .eq('request_id', id)
            .select(`
                *,
                team_member:team_member_id (
                    id,
                    name,
                    email,
                    department,
                    position,
                    profile_id,
                    profiles:profile_id (avatar_url)
                )
            `)
            .single();

        if (error) throw error;

        // Flatten the nested profiles data
        const flattenedData = {
            ...data,
            team_member: {
                ...data.team_member,
                avatar_url: data.team_member.profiles?.avatar_url || null
            }
        };

        return NextResponse.json({
            message: "Assignment role updated successfully",
            assignment: flattenedData
        });

    } catch (error: any) {
        console.error("Assignment Update Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idOrSlug } = await params;
        const id = await resolveRequestSlug(idOrSlug);
        const { searchParams } = new URL(request.url);
        const assignment_id = searchParams.get('assignment_id');

        if (!assignment_id) {
            return NextResponse.json({ error: "Missing assignment ID" }, { status: 400 });
        }

        const supabase = createServiceClient();

        const { error } = await supabase
            .from('request_assignments')
            .delete()
            .eq('id', assignment_id)
            .eq('request_id', id);

        if (error) throw error;

        return NextResponse.json({ message: "Assignment removed successfully" });

    } catch (error: any) {
        console.error("Assignment Deletion Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
