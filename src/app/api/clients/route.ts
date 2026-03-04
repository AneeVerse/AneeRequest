import { NextResponse } from 'next/server';
import { supabase, createServiceClient } from '@/lib/supabase';
import { getOrCreateFolder, getRootFolderId } from '@/lib/googleDrive';

import { getClients } from '@/lib/data/clients';

export async function GET() {
    try {
        const mergedData = await getClients();
        return NextResponse.json(mergedData);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, organization, email, password, status, avatarUrl, website, phone, country_code } = body;

        if (!email || !password || !name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Initialize Service Client to bypass client-side auth and direct user creation
        const serviceClient = createServiceClient();

        // 1. Create the user in Supabase Auth
        const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Automatically confirm email
            user_metadata: {
                full_name: name,
                avatar_url: avatarUrl,
                website: website
            }
        });

        if (authError) throw authError;

        // 2. The SQL Trigger (on_auth_user_created) will automatically create the row in 'profiles'
        if (avatarUrl && authData.user) {
            await serviceClient
                .from('profiles')
                .update({
                    avatar_url: avatarUrl,
                    phone: phone || null,
                    country_code: country_code || '+91',
                    role: 'client'
                })
                .eq('id', authData.user.id);
        }

        // 3. Add to the legacy 'clients' table for dashboard compatibility
        const { data, error: tableError } = await serviceClient
            .from('clients')
            .insert([
                {
                    name,
                    organization,
                    email,
                    status: status || 'Ongoing',
                    last_login: null
                }
            ])
            .select();

        if (tableError) {
            // Rollback auth user if table insert fails (optional but good practice)
            await serviceClient.auth.admin.deleteUser(authData.user.id);
            throw tableError;
        }

        // Auto-create Google Drive folder for this client (only if requested)
        if (body.create_folder !== false) {
            const folderName = organization || name;
            try {
                const rootId = await getRootFolderId();
                await getOrCreateFolder(rootId, folderName);
            } catch (driveErr) {
                console.warn('Could not create Drive folder for client:', driveErr);
            }
        }

        return NextResponse.json({
            message: "Client created and account activated",
            user: authData.user,
            client: data[0]
        });

    } catch (error: any) {
        console.error("Client Creation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, name, organization, email, password, oldEmail, drive_folder_id, status, avatarUrl, website, phone, country_code } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing client ID" }, { status: 400 });
        }

        const serviceClient = createServiceClient();

        // 1. Get current client data or update it
        const updateData: any = {};
        if (name) updateData.name = name;
        if (organization) updateData.organization = organization;
        if (email) updateData.email = email;
        if (status) updateData.status = status;
        if (drive_folder_id !== undefined) updateData.drive_folder_id = drive_folder_id || null;

        let clientData;
        if (Object.keys(updateData).length > 0) {
            const { data, error: clientError } = await serviceClient
                .from('clients')
                .update(updateData)
                .eq('id', id)
                .select()
                .maybeSingle();

            if (clientError) throw clientError;
            if (!data) throw new Error("Client not found");
            clientData = data;
        } else {
            const { data, error: fetchError } = await serviceClient
                .from('clients')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (fetchError) throw fetchError;
            if (!data) throw new Error("Client not found");
            clientData = data;
        }

        // 2. Find and update the profile in 'profiles' table directly
        const searchEmail = oldEmail || email || clientData.email;

        const profileUpdateData: any = {};
        if (email) profileUpdateData.email = email;
        if (name) profileUpdateData.full_name = name;
        if (avatarUrl !== undefined) profileUpdateData.avatar_url = avatarUrl;
        if (phone !== undefined) profileUpdateData.phone = phone;
        if (country_code !== undefined) profileUpdateData.country_code = country_code;
        profileUpdateData.role = 'client';

        if (Object.keys(profileUpdateData).length > 0) {
            // Update profile by matching email (case-insensitive if needed, but exact is fine if we use the original email)
            const { data: updatedProfiles, error: profileUpdateError } = await serviceClient
                .from('profiles')
                .update(profileUpdateData)
                .ilike('email', searchEmail)
                .select();

            if (profileUpdateError) {
                console.error("Profile update error:", profileUpdateError);
            }

            // 3. Update Auth user if we successfully found their profile ID
            if (updatedProfiles && updatedProfiles.length > 0) {
                const profileId = updatedProfiles[0].id;
                const authUpdateData: any = {};
                if (email) authUpdateData.email = email;
                if (password) authUpdateData.password = password;
                if (name || avatarUrl || website !== undefined) {
                    authUpdateData.user_metadata = {
                        ...(name && { full_name: name }),
                        ...(avatarUrl && { avatar_url: avatarUrl }),
                        ...(website !== undefined && { website })
                    };
                }

                try {
                    await serviceClient.auth.admin.updateUserById(profileId, authUpdateData);
                } catch (err) {
                    console.error("Auth user update error:", err);
                }
            }
        }

        return NextResponse.json({
            message: "Client updated successfully",
            client: clientData
        });

    } catch (error: any) {
        console.error("Client Update Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const email = searchParams.get('email');

        if (!id || !email) {
            return NextResponse.json({ error: "Missing client ID or Email" }, { status: 400 });
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

        // 2. Update 'clients' table to delete the record
        const { error: clientDeleteError } = await serviceClient
            .from('clients')
            .delete()
            .eq('id', id);

        if (clientDeleteError) throw clientDeleteError;

        return NextResponse.json({ message: "Client and account deleted successfully" });

    } catch (error: any) {
        console.error("Client Deletion Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
