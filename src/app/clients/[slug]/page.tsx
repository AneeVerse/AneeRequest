import { Metadata } from 'next';
import ClientPageClient from './ClientPageClient';
import { getRequestsData, getProfiles, getClients } from '@/lib/data/requests';
import { getTasksData } from '@/lib/data/tasks';
import { getTeamMembers } from '@/lib/data/team';
import { slugify } from '@/lib/utils';

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const clients = await getClients();
  const client = clients.find(c => c.slug === params.slug || c.id === params.slug || slugify(c.organization) === params.slug);

  return {
    title: `${client?.organization || 'Client'} | AneeRequest`,
    description: `Manage requests and tasks for ${client?.organization || 'your client'}.`
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = params;

  // Fetch initial data on the server
  const [clients, allRequests, allTasks, profiles, teamMembers] = await Promise.all([
    getClients(),
    getRequestsData(),
    getTasksData(),
    getProfiles(),
    getTeamMembers()
  ]);

  const client = clients.find(c => c.slug === slug || c.id === slug || slugify(c.organization) === slug) || null;

  const initialRequests = client
    ? allRequests.filter(r => r.client?.id === client.id)
    : [];

  const requestIds = new Set(initialRequests.map(r => r.id));
  const initialTasks = client
    ? allTasks.filter(t => t.request_links?.some(link => requestIds.has(link.request?.id)))
    : [];

  return (
    <ClientPageClient
      initialClient={client}
      initialRequests={initialRequests}
      initialTasks={initialTasks}
      initialProfiles={profiles}
      initialTeamMembers={teamMembers}
    />
  );
}
