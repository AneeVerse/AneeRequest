import DashboardShell from '@/components/DashboardShell';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function FilesLoading() {
    return (
        <DashboardShell>
            <LoadingSkeleton />
        </DashboardShell>
    );
}
