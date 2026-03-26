import DashboardShell from '@/components/DashboardShell';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function TeamLoading() {
    return (
        <DashboardShell>
            <LoadingSkeleton />
        </DashboardShell>
    );
}
