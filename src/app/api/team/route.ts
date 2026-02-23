import { NextResponse } from 'next/server';
import { supabase, createServiceClient } from '@/lib/supabase';

import { getEnrichedTeamMembers } from '@/lib/data/team';

export async function GET() {
    try {
        const data = await getEnrichedTeamMembers();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, department, position, password, role, accessible_sections } = body;

        if (!email || !name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const serviceClient = createServiceClient();

        // 1. Create the user in Supabase Auth (if password provided)
        let authUserId = null;
        if (password) {
            const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: name }
            });

            if (authError) throw authError;
            authUserId = authData.user.id;

            // 2. Update profile role to team_member
            await serviceClient
                .from('profiles')
                .update({ role: 'team_member' })
                .eq('id', authUserId);
        }

        // 3. Add to team_members table
        const { data, error: tableError } = await serviceClient
            .from('team_members')
            .insert([
                {
                    profile_id: authUserId,
                    name,
                    email,
                    department,
                    position,
                    accessible_sections: accessible_sections || [],
                    status: 'Active'
                }
            ])
            .select();

        if (tableError) {
            // Rollback auth user if table insert fails
            if (authUserId) {
                await serviceClient.auth.admin.deleteUser(authUserId);
            }
            throw tableError;
        }

        return NextResponse.json({
            message: "Team member created successfully",
            member: data[0]
        });

    } catch (error: any) {
        console.error("Team Member Creation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, name, email, department, position, password, oldEmail, accessible_sections } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing team member ID" }, { status: 400 });
        }

        const serviceClient = createServiceClient();

        // 1. Update team_members table
        const updateData: any = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (department !== undefined) updateData.department = department;
        if (position !== undefined) updateData.position = position;
        if (accessible_sections !== undefined) updateData.accessible_sections = accessible_sections;

        let memberData;
        if (Object.keys(updateData).length > 0) {
            const { data, error: memberError } = await serviceClient
                .from('team_members')
                .update(updateData)
                .eq('id', id)
                .select()
                .maybeSingle();

            if (memberError) throw memberError;
            if (!data) throw new Error("Team member not found");
            memberData = data;
        } else {
            const { data, error: fetchError } = await serviceClient
                .from('team_members')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (fetchError) throw fetchError;
            if (!data) throw new Error("Team member not found");
            memberData = data;
        }

        // 2. Update auth user if exists
        const { data: usersData, error: listError } = await serviceClient.auth.admin.listUsers();
        if (listError) throw listError;

        const authUser = usersData.users.find(u =>
            u.email === (oldEmail || email || memberData.email)
        );

        if (authUser) {
            const authUpdateData: any = {};
            if (email) authUpdateData.email = email;
            if (password) authUpdateData.password = password;
            if (name) authUpdateData.user_metadata = { full_name: name };

            const { error: updateAuthError } = await serviceClient.auth.admin.updateUserById(authUser.id, authUpdateData);
            if (updateAuthError) throw updateAuthError;

            // Update profiles table
            const profileUpdateData: any = {};
            if (email) profileUpdateData.email = email;
            if (name) profileUpdateData.full_name = name;

            if (Object.keys(profileUpdateData).length > 0) {
                await serviceClient
                    .from('profiles')
                    .update(profileUpdateData)
                    .eq('id', authUser.id);
            }
        }

        return NextResponse.json({
            message: "Team member updated successfully",
            member: memberData
        });

    } catch (error: any) {
        console.error("Team Member Update Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const email = searchParams.get('email');

        if (!id || !email) {
            return NextResponse.json({ error: "Missing team member ID or Email" }, { status: 400 });
        }

        const serviceClient = createServiceClient();

        // 1. Delete the Auth user first
        const { data: usersData, error: listError } = await serviceClient.auth.admin.listUsers();
        if (listError) throw listError;

        const authUser = usersData.users.find(u => u.email === email);
        if (authUser) {
            const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(authUser.id);
            if (authDeleteError) throw authDeleteError;
        }

        // 2. Delete from team_members table (cascade will handle assignments)
        const { error: memberDeleteError } = await serviceClient
            .from('team_members')
            .delete()
            .eq('id', id);

        if (memberDeleteError) throw memberDeleteError;

        return NextResponse.json({ message: "Team member deleted successfully" });

    } catch (error: any) {
        console.error("Team Member Deletion Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
