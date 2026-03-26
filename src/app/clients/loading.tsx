import DashboardShell from '@/components/DashboardShell';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function ClientsLoading() {
    return (
        <DashboardShell>
            <LoadingSkeleton />
        </DashboardShell>
    );
}
