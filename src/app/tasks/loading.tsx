import DashboardShell from '@/components/DashboardShell';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function TasksLoading() {
    return (
        <DashboardShell>
            <LoadingSkeleton />
        </DashboardShell>
    );
}
