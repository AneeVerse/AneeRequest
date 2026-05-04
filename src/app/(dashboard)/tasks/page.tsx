import React from 'react';
import TasksClient from '@/components/TasksClient';
import { getAllTasksData } from '@/lib/data/tasks';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
    const data = await getAllTasksData();

    return (
        <TasksClient
            initialTasks={data.tasks}
            profiles={data.profiles}
            teamMembers={data.teamMembers}
            requests={data.requests}
        />
    );
}
