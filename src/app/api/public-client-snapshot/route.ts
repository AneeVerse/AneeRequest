import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

// ⚠️ TEMPORARY public endpoint – DELETE after use
export async function GET() {
    const { data, error } = await supabase
        .from("clients")
        .select("name, organization, status, email, created_at")
        .order("organization", { ascending: true })
        .limit(1000);

    if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const grouped: Record<string, any[]> = {};
    for (const c of data || []) {
        const bucket = grouped[c.status] ?? (grouped[c.status] = []);
        bucket.push({ name: c.name, organization: c.organization, email: c.email });
    }

    return NextResponse.json({
        ok: true,
        total: (data || []).length,
        counts: Object.fromEntries(
            Object.entries(grouped).map(([k, v]) => [k, v.length])
        ),
        allGrouped: grouped,
    });
}
