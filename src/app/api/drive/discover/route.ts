import { NextResponse } from 'next/server';
import { findFolder, getRootFolderId } from '@/lib/googleDrive';
import { createServiceClient } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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

export async function GET(request: Request) {
    try {
        if (!(await checkSuperAdmin())) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');

        if (!name) {
            return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 });
        }

        const rootId = await getRootFolderId();
        const folderId = await findFolder(rootId, name);

        return NextResponse.json({
            found: !!folderId,
            folderId,
            folderName: name
        });
    } catch (error: any) {
        console.error('Drive Discover Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
