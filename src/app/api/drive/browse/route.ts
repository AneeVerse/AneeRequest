import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase';
import {
    listFolderContents,
    createFolder,
    renameFolderInDrive,
    deleteFolderFromDrive,
    renameFileInDrive,
    deleteFileFromDrive,
    uploadFileToDrive,
    validateFolderAccess,
    createGoogleFile
} from '@/lib/googleDrive';

async function checkSuperAdmin() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const serviceSupabase = createServiceClient();
    const { data: profile } = await serviceSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return profile?.role === 'super_admin';
}

// GET: Browse folder contents
export async function GET(request: Request) {
    try {
        if (!(await checkSuperAdmin())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const folderId = searchParams.get('folderId');

        if (!folderId) {
            return NextResponse.json({ error: 'Missing folderId' }, { status: 400 });
        }

        const items = await listFolderContents(folderId);

        const result = items.map(item => ({
            id: item.id,
            name: item.name,
            mimeType: item.mimeType,
            isFolder: item.mimeType === 'application/vnd.google-apps.folder',
            size: item.size ? parseInt(item.size) : null,
            createdTime: item.createdTime,
            webViewLink: item.webViewLink || (item.mimeType !== 'application/vnd.google-apps.folder'
                ? `https://drive.google.com/file/d/${item.id}/view`
                : `https://drive.google.com/drive/folders/${item.id}`),
            webContentLink: (item as any).webContentLink || null,
            previewUrl: item.mimeType !== 'application/vnd.google-apps.folder'
                ? `/api/drive/view?fileId=${item.id}`
                : null,
        }));

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Drive Browse GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create folder or upload file
export async function POST(request: Request) {
    try {
        if (!(await checkSuperAdmin())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            // Create folder or Google Workspace file
            const { parentId, folderName, type } = await request.json();
            if (!parentId || !folderName) {
                return NextResponse.json({ error: 'Missing parentId or folderName' }, { status: 400 });
            }

            if (type && ['document', 'spreadsheet', 'presentation', 'form'].includes(type)) {
                // Create Google Workspace file
                const result = await createGoogleFile(parentId, folderName, type as any);
                return NextResponse.json({ success: true, ...result, name: folderName });
            }

            // Standard folder creation
            const id = await createFolder(parentId, folderName);
            return NextResponse.json({ success: true, id, name: folderName });
        }

        // Upload file
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const parentId = formData.get('parentId') as string;

        if (!file || !parentId) {
            return NextResponse.json({ error: 'Missing file or parentId' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadFileToDrive(parentId, file.name, buffer, file.type);

        return NextResponse.json({
            success: true,
            id: result.fileId,
            name: file.name,
            webViewLink: result.webViewLink
        });
    } catch (error: any) {
        console.error('Drive Browse POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PATCH: Rename file or folder
export async function PATCH(request: Request) {
    try {
        if (!(await checkSuperAdmin())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id, newName, isFolder } = await request.json();
        if (!id || !newName) {
            return NextResponse.json({ error: 'Missing id or newName' }, { status: 400 });
        }

        if (isFolder) {
            await renameFolderInDrive(id, newName);
        } else {
            await renameFileInDrive(id, newName);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Drive Browse PATCH Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Delete file or folder
export async function DELETE(request: Request) {
    try {
        if (!(await checkSuperAdmin())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const isFolder = searchParams.get('isFolder') === 'true';

        if (!id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }

        if (isFolder) {
            await deleteFolderFromDrive(id);
        } else {
            await deleteFileFromDrive(id);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Drive Browse DELETE Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
