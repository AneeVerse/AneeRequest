import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import {
    ensureFolderPath,
    uploadFileToDrive,
    renameFileInDrive,
    deleteFileFromDrive,
    getRootFolderId,
    listSubFolders,
    listFolderContents
} from '@/lib/googleDrive';

// ─── GET: Build the virtual file tree from LIVE DRIVE ───
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const callerRole = searchParams.get('role');
        const callerId = searchParams.get('user_id');

        const supabase = createServiceClient();
        const rootFolderId = await getRootFolderId();

        // 1. Fetch live subfolders from the current Drive Root
        const driveFolders = await listSubFolders(rootFolderId);

        // 2. Fetch all clients and requests from DB to enrich the Drive data
        const { data: allClients } = await supabase.from('clients').select('*');
        const { data: allRequests } = await supabase.from('requests').select('*');
        const { data: allProfiles } = await supabase.from('profiles').select('id, email, full_name, role');

        const clientTree: any[] = [];

        for (const driveFolder of driveFolders) {
            // Find matching client in DB by name or organization
            const matchingClient = allClients?.find(c =>
                (c.organization || c.name) === driveFolder.name
            );

            // Access control: if caller is a client, they only see their own folder
            if (callerRole === 'client' && matchingClient) {
                const profile = allProfiles?.find(p => p.email === matchingClient.email);
                if (profile?.id !== callerId) continue;
            }

            // Fetch live subfolders for this client (Requests)
            const requestFolders = await listSubFolders(driveFolder.id!);
            const requestsData: any[] = [];

            for (const reqFolder of requestFolders) {
                const matchingReq = allRequests?.find(r =>
                    r.title === reqFolder.name && r.client_link_id === matchingClient?.id
                );

                // Team access control: restricted team members only see assigned requests
                if (callerRole === 'team_member' && matchingReq && matchingReq.assigned_to !== callerId) {
                    continue;
                }

                // Fetch files for this request
                const contents = await listFolderContents(reqFolder.id!);
                const production = contents.filter(f => f.mimeType !== 'application/vnd.google-apps.folder')
                    .map(f => ({
                        drive_file_id: f.id,
                        name: f.name,
                        url: f.webViewLink,
                        type: f.mimeType,
                        uploaded_at: f.createdTime,
                        uploaded_by: 'Drive'
                    }));

                requestsData.push({
                    request_id: matchingReq?.id || reqFolder.id,
                    request_title: reqFolder.name,
                    production: production,
                    distributed: [] // In live mode, we treat all as production unless we distinguish folders
                });
            }

            clientTree.push({
                client_id: matchingClient?.id || driveFolder.id,
                client_name: driveFolder.name,
                client_full_name: matchingClient?.name || driveFolder.name,
                client_email: matchingClient?.email || '',
                requests: requestsData
            });
        }

        return NextResponse.json(clientTree);
    } catch (error: any) {
        console.error('Files API GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ─── POST: Upload file ───
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const requestId = formData.get('request_id') as string;
        const folder = formData.get('folder') as string;
        const senderId = formData.get('sender_id') as string;

        if (!file || !requestId || !folder || !senderId) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const supabase = createServiceClient();

        // Get request details
        const { data: req, error: reqErr } = await supabase
            .from('requests')
            .select('title, client_link_id')
            .eq('id', requestId)
            .single();

        if (reqErr) throw reqErr;

        // Get client metadata directly
        const { data: client } = await supabase
            .from('clients')
            .select('organization, name, drive_folder_id')
            .eq('id', req.client_link_id)
            .maybeSingle();

        const clientName = client?.organization || client?.name || 'Unknown';

        // Upload to Drive (use client-specific folder if set)
        const folderId = await ensureFolderPath(clientName, req.title, folder as any, client?.drive_folder_id);
        const { fileId, webViewLink } = await uploadFileToDrive(
            folderId,
            file.name,
            Buffer.from(await file.arrayBuffer()),
            file.type
        );

        const attachment = {
            name: file.name,
            url: webViewLink,
            type: file.type,
            drive_file_id: fileId
        };

        const { data: msg, error: msgErr } = await supabase
            .from('request_messages')
            .insert([{
                request_id: requestId,
                sender_id: senderId,
                message: `📁 File uploaded to ${folder}`,
                attachments: [attachment]
            }])
            .select()
            .single();

        if (msgErr) throw msgErr;

        return NextResponse.json({ success: true, message: msg });
    } catch (error: any) {
        console.error('Files API POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ─── PATCH: Rename ───
export async function PATCH(request: Request) {
    try {
        const { message_id, attachment_index, new_name } = await request.json();
        const supabase = createServiceClient();

        const { data: msg, error: fetchErr } = await supabase
            .from('request_messages')
            .select('attachments')
            .eq('id', message_id)
            .single();

        if (fetchErr || !msg) throw new Error('Message not found');

        const attachments = [...(msg.attachments as any[])];
        const att = attachments[attachment_index];

        if (att.drive_file_id) await renameFileInDrive(att.drive_file_id, new_name);

        attachments[attachment_index] = { ...att, name: new_name };
        await supabase.from('request_messages').update({ attachments }).eq('id', message_id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Files API PATCH Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// ─── DELETE: Delete ───
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const messageId = searchParams.get('message_id');
        const attachmentIndex = parseInt(searchParams.get('attachment_index') || '0');

        const supabase = createServiceClient();
        const { data: msg, error: fetchErr } = await supabase
            .from('request_messages')
            .select('attachments')
            .eq('id', messageId)
            .single();

        if (fetchErr || !msg) throw new Error('Message not found');

        const attachments = [...(msg.attachments as any[])];
        const att = attachments[attachmentIndex];

        if (att.drive_file_id) {
            try {
                await deleteFileFromDrive(att.drive_file_id);
            } catch (e) {
                console.warn('Drive delete failed:', e);
            }
        }

        attachments.splice(attachmentIndex, 1);
        if (attachments.length === 0) {
            await supabase.from('request_messages').delete().eq('id', messageId);
        } else {
            await supabase.from('request_messages').update({ attachments }).eq('id', messageId);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Files API DELETE Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
