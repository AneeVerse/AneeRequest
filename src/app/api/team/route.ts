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
        const { name, email, department, position, password, role, accessible_sections, avatarUrl, phone, country_code } = body;

        if (!email || !name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const serviceClient = createServiceClient();
        const cleanEmail = email.trim();

        // 1. Create the user in Supabase Auth (if password provided)
        let authUserId = null;
        if (password) {
            const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
                email: cleanEmail,
                password,
                email_confirm: true,
                user_metadata: {
                    full_name: name,
                    avatar_url: avatarUrl
                }
            });

            if (authError) throw authError;
            authUserId = authData.user.id;

            // 2. Update profile role and metadata
            const { error: pError } = await serviceClient
                .from('profiles')
                .update({
                    role: (role || 'viewer').toLowerCase().includes('admin') ? 'admin' : 'team_member',
                    avatar_url: avatarUrl || undefined,
                    full_name: name,
                    accessible_sections: accessible_sections || [],
                    phone: phone || null,
                    country_code: country_code || '+91'
                })
                .eq('id', authUserId);

            if (pError) console.error('POST Profile update error:', pError);
        } else {
            // Find existing profile by email (case-insensitive)
            const { data: existingProfile } = await serviceClient
                .from('profiles')
                .select('id')
                .ilike('email', cleanEmail)
                .maybeSingle();

            if (!existingProfile) {
                // Create a placeholder profile
                const { data: newProfile, error: insError } = await serviceClient.from('profiles').insert({
                    id: crypto.randomUUID(),
                    email: cleanEmail,
                    full_name: name,
                    avatar_url: avatarUrl,
                    phone: phone || null,
                    country_code: country_code || '+91',
                    role: (role || 'viewer').toLowerCase().includes('admin') ? 'admin' : 'team_member'
                }).select().single();

                if (insError) console.error('POST Profile insert error:', insError);
                if (newProfile) authUserId = newProfile.id;
            } else {
                authUserId = existingProfile.id;
                // Update existing profile with new info
                const { error: upError } = await serviceClient.from('profiles').update({
                    avatar_url: avatarUrl,
                    full_name: name,
                    phone: phone || null,
                    country_code: country_code || '+91',
                    role: (role || 'viewer').toLowerCase().includes('admin') ? 'admin' : 'team_member'
                }).eq('id', authUserId);
                if (upError) console.error('POST Profile update existing error:', upError);
            }
        }

        // 3. Add to team_members table
        const { data, error: tableError } = await serviceClient
            .from('team_members')
            .insert([
                {
                    profile_id: authUserId,
                    name,
                    email: cleanEmail,
                    department,
                    position,
                    accessible_sections: accessible_sections || [],
                    status: 'Active'
                }
            ])
            .select();

        if (tableError) {
            if (authUserId && password) {
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
        const { id, name, email, department, position, password, oldEmail, role, accessible_sections, avatarUrl, phone, country_code } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing team member ID" }, { status: 400 });
        }

        const serviceClient = createServiceClient();

        // 1. Update team_members table
        const updateData: any = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email.trim();
        if (department !== undefined) updateData.department = department;
        if (position !== undefined) updateData.position = position;
        if (accessible_sections !== undefined) updateData.accessible_sections = accessible_sections;

        const { data: memberData, error: memberError } = await serviceClient
            .from('team_members')
            .update(updateData)
            .eq('id', id)
            .select()
            .maybeSingle();

        if (memberError) throw memberError;
        if (!memberData) throw new Error("Team member not found");

        const targetEmail = (oldEmail || email || memberData.email).trim();

        // 2. Sync with Profiles and Auth
        try {
            // Find ALL profiles matching this email to ensure we sync them all
            const { data: matchingProfiles } = await serviceClient
                .from('profiles')
                .select('id, email')
                .ilike('email', targetEmail);

            const profileIds = matchingProfiles?.map(p => p.id) || [];
            if (memberData.profile_id && !profileIds.includes(memberData.profile_id)) {
                profileIds.push(memberData.profile_id);
            }

            // Update Auth Metadata if reachable
            const { data: usersData } = await serviceClient.auth.admin.listUsers();
            const authUser = usersData?.users.find(u =>
                profileIds.includes(u.id) ||
                u.email?.toLowerCase() === targetEmail.toLowerCase()
            );

            if (authUser) {
                const authUpdateData: any = {};
                if (email) authUpdateData.email = email.trim();
                if (password) authUpdateData.password = password;
                if (name || avatarUrl) {
                    authUpdateData.user_metadata = {
                        ...(name && { full_name: name }),
                        ...(avatarUrl && { avatar_url: avatarUrl })
                    };
                }
                const { error: authUpErr } = await serviceClient.auth.admin.updateUserById(authUser.id, authUpdateData);
                if (authUpErr) console.error('PATCH Auth update error:', authUpErr);
                if (!profileIds.includes(authUser.id)) profileIds.push(authUser.id);
            }

            // Sync Profile Records
            const profileUpdateData: any = {};
            if (email) profileUpdateData.email = email.trim();
            if (name) profileUpdateData.full_name = name;
            if (avatarUrl !== undefined) profileUpdateData.avatar_url = avatarUrl;
            if (accessible_sections !== undefined) profileUpdateData.accessible_sections = accessible_sections;
            if (phone !== undefined) profileUpdateData.phone = phone;
            if (country_code !== undefined) profileUpdateData.country_code = country_code;

            // Ensure role is correct for team members
            if (role) {
                profileUpdateData.role = role.toLowerCase().includes('admin') ? 'admin' : 'team_member';
            }

            if (Object.keys(profileUpdateData).length > 0) {
                if (profileIds.length > 0) {
                    // Update all matching profiles
                    for (const pid of profileIds) {
                        const { error: pUpErr } = await serviceClient.from('profiles').update(profileUpdateData).eq('id', pid);
                        if (pUpErr) console.error(`PATCH Profile update error for ${pid}:`, pUpErr);
                    }
                } else {
                    // Create placeholder if absolutely none found
                    const { data: newP, error: pInsErr } = await serviceClient.from('profiles').insert({
                        id: crypto.randomUUID(),
                        email: targetEmail,
                        full_name: name || memberData.name,
                        avatar_url: avatarUrl,
                        role: role ? (role.toLowerCase().includes('admin') ? 'admin' : 'team_member') : 'team_member'
                    }).select().single();

                    if (pInsErr) console.error('PATCH Profile insert error:', pInsErr);
                    if (newP) {
                        await serviceClient.from('team_members').update({ profile_id: newP.id }).eq('id', id);
                    }
                }
            }

            // Final check: if team_member has no profile_id but we found reference profiles, link it
            if (!memberData.profile_id && profileIds.length > 0) {
                await serviceClient.from('team_members').update({ profile_id: profileIds[0] }).eq('id', id);
            }

        } catch (syncErr) {
            console.error('Profile/Auth synchronization error:', syncErr);
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
        const cleanEmail = email.trim();

        // Delete from team_members first
        await serviceClient.from('team_members').delete().eq('id', id);

        // Try to delete Auth user
        const { data: usersData } = await serviceClient.auth.admin.listUsers();
        const authUser = usersData.users.find(u => u.email?.toLowerCase() === cleanEmail.toLowerCase());
        if (authUser) {
            await serviceClient.auth.admin.deleteUser(authUser.id);
        }

        return NextResponse.json({ message: "Team member deleted successfully" });
    } catch (error: any) {
        console.error("Team Member Deletion Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
