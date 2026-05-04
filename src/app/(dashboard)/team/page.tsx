import { getEnrichedTeamMembers, getTeamMemberRequestCounts } from '@/lib/data/team';
import TeamClient from '@/components/TeamClient';

// Force SSR
export const dynamic = 'force-dynamic';

export default async function TeamPage() {
    // 1. Fetch fully enriched team data
    const members = await getEnrichedTeamMembers();

    // 2. Fetch raw counts for the client fallback record
    const counts = await getTeamMemberRequestCounts();

    return <TeamClient initialMembers={members as any} initialCounts={counts} />;
}
