import DashboardShell from '@/components/DashboardShell';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function RequestsLoading() {
    return (
        <DashboardShell>
            <LoadingSkeleton />
        </DashboardShell>
    );
}
