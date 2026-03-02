import { createServiceClient } from '@/lib/supabase';

export function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w-]+/g, '')        // Remove all non-word chars
        .replace(/--+/g, '-')           // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

export function generateSlug(title: string): string {
    return slugify(title);
}

export async function resolveRequestSlug(idOrSlug: string): Promise<string> {
    // If it's a UUID, return it
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(idOrSlug)) return idOrSlug;

    const supabase = createServiceClient();
    const { data, error } = await supabase
        .from('requests')
        .select('id')
        .eq('slug', idOrSlug)
        .maybeSingle();

    if (error || !data) return idOrSlug; // Fallback to original
    return data.id;
}

export async function resolveTaskSlug(idOrSlug: string): Promise<string> {
    // If it's a UUID, return it
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(idOrSlug)) return idOrSlug;

    const supabase = createServiceClient();
    const { data, error } = await supabase
        .from('tasks')
        .select('id')
        .eq('slug', idOrSlug)
        .maybeSingle();

    if (error || !data) return idOrSlug;
    return data.id;
}
