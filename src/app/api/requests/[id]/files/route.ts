import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { resolveRequestSlug } from '@/lib/utils';
import {
    getRootFolderId,
    findFolder,
    listFolderContents
} from '@/lib/googleDrive';

// GET: Fetch files for a specific request from Google Drive
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idOrSlug } = await params;
        const id = await resolveRequestSlug(idOrSlug);
        const supabase = createServiceClient();

        // 1. Get request details (title + client_id)
        const { data: req, error: reqErr } = await supabase
            .from('requests')
            .select('title, client_id')
            .eq('id', id)
            .single();

        if (reqErr || !req) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // 2. Get client info to find Drive folder
        const { data: clientProfile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', req.client_id)
            .single();

        const { data: client } = await supabase
            .from('clients')
            .select('organization, name, drive_folder_id')
            .ilike('email', clientProfile?.email || '')
            .maybeSingle();

        const clientName = client?.organization || client?.name || clientProfile?.full_name || 'Unknown';

        // 3. Navigate Drive folder structure
        let baseFolderId: string;

        if (client?.drive_folder_id) {
            baseFolderId = client.drive_folder_id;
        } else {
            const rootId = await getRootFolderId();
            const clientFolderId = await findFolder(rootId, clientName);
            if (!clientFolderId) {
                return NextResponse.json([]);
            }
            baseFolderId = clientFolderId;
        }

        // Find the request folder
        const requestFolderId = await findFolder(baseFolderId, req.title);
        if (!requestFolderId) {
            return NextResponse.json([]);
        }

        // 4. List all contents from production and distributed subfolders
        const allFiles: any[] = [];

        // Check for production subfolder
        const productionId = await findFolder(requestFolderId, 'production');
        if (productionId) {
            const prodFiles = await listFolderContents(productionId);
            for (const f of prodFiles) {
                if (f.mimeType !== 'application/vnd.google-apps.folder') {
                    allFiles.push({
                        id: f.id,
                        name: f.name,
                        mimeType: f.mimeType,
                        size: f.size ? parseInt(f.size) : null,
                        createdTime: f.createdTime,
                        folder: 'production',
                        previewUrl: `/api/drive/view?fileId=${f.id}`,
                        webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
                    });
                }
            }
        }

        // Check for distributed subfolder
        const distributedId = await findFolder(requestFolderId, 'distributed');
        if (distributedId) {
            const distFiles = await listFolderContents(distributedId);
            for (const f of distFiles) {
                if (f.mimeType !== 'application/vnd.google-apps.folder') {
                    allFiles.push({
                        id: f.id,
                        name: f.name,
                        mimeType: f.mimeType,
                        size: f.size ? parseInt(f.size) : null,
                        createdTime: f.createdTime,
                        folder: 'distributed',
                        previewUrl: `/api/drive/view?fileId=${f.id}`,
                        webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
                    });
                }
            }
        }

        // Also list files directly in the request folder (not in subfolders)
        const directFiles = await listFolderContents(requestFolderId);
        for (const f of directFiles) {
            if (f.mimeType !== 'application/vnd.google-apps.folder') {
                allFiles.push({
                    id: f.id,
                    name: f.name,
                    mimeType: f.mimeType,
                    size: f.size ? parseInt(f.size) : null,
                    createdTime: f.createdTime,
                    folder: 'root',
                    previewUrl: `/api/drive/view?fileId=${f.id}`,
                    webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
                });
            }
        }

        return NextResponse.json(allFiles);
    } catch (error: any) {
        console.error('Request Files API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
