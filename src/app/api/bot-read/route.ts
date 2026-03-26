import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

// Read-only public endpoint for bot consumption
// Only exposes non-sensitive summary data
export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (!action) {
        return NextResponse.json({
            ok: true,
            actions: ["clients", "requests", "tasks", "dashboard"],
        });
    }

    if (action === "clients") {
        const { data, error } = await supabase
            .from("clients")
            .select("name, organization, status, email, created_at")
            .order("organization", { ascending: true })
            .limit(1000);
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

        const grouped: Record<string, any[]> = {};
        for (const c of data || []) {
            const bucket = grouped[c.status] ?? (grouped[c.status] = []);
            bucket.push({ name: c.name, organization: c.organization, email: c.email });
        }
        return NextResponse.json({
            ok: true,
            total: (data || []).length,
            counts: Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.length])),
            grouped,
        });
    }

    if (action === "requests") {
        const { data, error } = await supabase
            .from("requests")
            .select("title, status, priority, due_date, created_at, client:client_id(name, organization)")
            .order("created_at", { ascending: false })
            .limit(500);
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, total: (data || []).length, data });
    }

    if (action === "tasks") {
        const { data, error } = await supabase
            .from("tasks")
            .select("title, status, priority, due_date, created_at, assignee:assigned_to(full_name)")
            .order("created_at", { ascending: false })
            .limit(500);
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, total: (data || []).length, data });
    }

    if (action === "dashboard") {
        const [clientsRes, requestsRes, tasksRes] = await Promise.all([
            supabase.from("clients").select("status").limit(1000),
            supabase.from("requests").select("status, priority").limit(1000),
            supabase.from("tasks").select("status").limit(1000),
        ]);

        const countBy = (arr: any[], key: string) => {
            const counts: Record<string, number> = {};
            for (const item of arr) { counts[item[key]] = (counts[item[key]] || 0) + 1; }
            return counts;
        };

        return NextResponse.json({
            ok: true,
            ts: new Date().toISOString(),
            clients: { total: (clientsRes.data || []).length, by_status: countBy(clientsRes.data || [], "status") },
            requests: { total: (requestsRes.data || []).length, by_status: countBy(requestsRes.data || [], "status"), by_priority: countBy(requestsRes.data || [], "priority") },
            tasks: { total: (tasksRes.data || []).length, by_status: countBy(tasksRes.data || [], "status") },
        });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
