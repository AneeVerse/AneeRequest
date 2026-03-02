import { NextResponse } from 'next/server';
import { supabase, createServiceClient } from '@/lib/supabase';

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, fullName, email, password, avatarUrl, oldEmail, organization } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
        }

        const serviceClient = createServiceClient();

        // Create a list of promises for parallel execution to speed things up
        const updatePromises: Promise<any>[] = [];

        // 1. Prepare updates for public.profiles
        const profileUpdates: any = {};
        if (fullName) profileUpdates.full_name = fullName;
        if (email) profileUpdates.email = email;
        if (avatarUrl) profileUpdates.avatar_url = avatarUrl;

        if (Object.keys(profileUpdates).length > 0) {
            updatePromises.push(
                Promise.resolve(
                    serviceClient
                        .from('profiles')
                        .update(profileUpdates)
                        .eq('id', id)
                ).then(({ error }) => { if (error) throw error; })
            );
        }

        // 2. Sync with public.clients if user is a client (or if updating organization/logo)
        if (email || fullName || avatarUrl || organization) {
            const clientUpdates: any = {};
            if (email) clientUpdates.email = email;
            if (fullName) clientUpdates.name = fullName;
            if (organization) clientUpdates.organization = organization;
            if (avatarUrl) clientUpdates.avatar_url = avatarUrl;

            updatePromises.push(
                Promise.resolve(
                    serviceClient
                        .from('clients')
                        .update(clientUpdates)
                        .eq('email', oldEmail || email)
                ).then(({ error }) => {
                    // Silent warning for clients as they might not exist for admins
                    if (error) console.warn("Client sync warning:", error.message);
                })
            );
        }

        // 3. Update Supabase Auth user (Admin API)
        const authUpdates: any = {};
        if (email) authUpdates.email = email;
        if (password) authUpdates.password = password;
        if (fullName || avatarUrl) {
            authUpdates.user_metadata = {
                ...(fullName && { full_name: fullName }),
                ...(avatarUrl && { avatar_url: avatarUrl })
            };
        }

        if (Object.keys(authUpdates).length > 0) {
            updatePromises.push(
                Promise.resolve(
                    serviceClient.auth.admin.updateUserById(id, authUpdates)
                ).then(({ error }) => { if (error) throw error; })
            );
        }

        // Execute all updates in parallel
        await Promise.all(updatePromises);

        return NextResponse.json({ message: "Account updated successfully" });

    } catch (error: any) {
        console.error("Account Update Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
