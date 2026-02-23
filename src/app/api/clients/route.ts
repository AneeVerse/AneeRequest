import { NextResponse } from 'next/server';
import { supabase, createServiceClient } from '@/lib/supabase';
import { getOrCreateFolder, getRootFolderId } from '@/lib/googleDrive';

export async function GET() {
    try {
        // Fetch from both tables to bridge the gap
        const [clientsRes, profilesRes] = await Promise.all([
            supabase.from('clients').select('*').order('created_at', { ascending: false }),
            supabase.from('profiles').select('id, email, full_name, role').eq('role', 'client')
        ]);

        if (clientsRes.error) throw clientsRes.error;
        if (profilesRes.error) throw profilesRes.error;

        // Merge by email
        const mergedData = clientsRes.data.map(client => {
            const profile = profilesRes.data.find(p => p.email.toLowerCase() === client.email.toLowerCase());
            return {
                ...client,
                profile_id: profile?.id || null
            };
        });

        return NextResponse.json(mergedData);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, organization, email, password, status } = body;

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
            user_metadata: { full_name: name }
        });

        if (authError) throw authError;

        // 2. The SQL Trigger (on_auth_user_created) will automatically create the row in 'profiles'

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
        const { id, name, organization, email, password, oldEmail, drive_folder_id, status } = body;

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

        // 2. Find the Auth user by current or old email and update metadata/email/password
        const { data: usersData, error: listError } = await serviceClient.auth.admin.listUsers();
        if (listError) throw listError;

        // Try searching by oldEmail first if provided, then email, then the email from DB
        const authUser = usersData.users.find(u =>
            u.email === (oldEmail || email || clientData.email)
        );

        if (authUser) {
            const authUpdateData: any = {};
            if (email) authUpdateData.email = email;
            if (password) authUpdateData.password = password;
            if (name) authUpdateData.user_metadata = { full_name: name };

            const { error: updateAuthError } = await serviceClient.auth.admin.updateUserById(authUser.id, authUpdateData);
            if (updateAuthError) throw updateAuthError;

            // Update 'profiles' table manually
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
