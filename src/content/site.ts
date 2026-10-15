export interface Social {
  label: string;
  href: string;
  icon: 'linkedin' | 'github' | 'email';
}

export interface App {
  name: string;
  description: string;
  /** Public instance. Omit for apps with no public URL; the card then shows Source only. */
  liveUrl?: string;
  sourceUrl: string;
}

export interface Site {
  name: string;
  title: string;
  tagline: string;
  bio: string[];
  photo: string;
  photoAlt: string;
  socials: Social[];
  stack: string[];
  apps: App[];
  footer: { k3sRepoUrl: string };
}

// Everything a visitor reads lives here. Placeholders are marked TODO(owner).
export const site: Site = {
  name: 'Justin Tumidanski',
  title: 'Software Engineer and Manager',
  tagline: 'I build backend systems in Go and run a small homelab on k3s. This is my corner of the internet.', // TODO(owner)
  bio: [
    'TODO(owner): Paragraph one. Who you are, what you work on day to day, and what you care about in software.',
    'TODO(owner): Paragraph two. The homelab, the side projects, and why you self-host.',
  ],
  photo: '/me.jpg',
  photoAlt: 'Portrait of Justin Tumidanski',
  socials: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/justin-tumidanski-61165730', icon: 'linkedin' },
    { label: 'GitHub', href: 'https://github.com/jtumidanski', icon: 'github' },
    { label: 'Email', href: 'mailto:jtumidanski@gmail.com', icon: 'email' },
  ],
  stack: ['Go', 'TypeScript', 'React', 'Kubernetes', 'PostgreSQL', 'Kafka', 'Traefik', 'Argo CD'],
  apps: [
    {
      name: 'home-hub',
      description: 'Household dashboard: calendar, recipes, shopping, packages, workouts.',
      liveUrl: 'https://home-hub.tumidanski.com',
      sourceUrl: 'https://github.com/jtumidanski/home-hub',
    },
    {
      name: 'MyFleet',
      description:
        'Vehicle fleet tracking with maintenance logs, service reminders, document storage, and photo media for every vehicle in the household.',
      liveUrl: 'https://myfleet.tumidanski.com',
      sourceUrl: 'https://github.com/jtumidanski/MyFleet',
    },
    {
      name: 'Harbormaster',
      description: 'Admin console for S3-compatible object stores.',
      // No public instance; source only.
      sourceUrl: 'https://github.com/jtumidanski/Harbormaster',
    },
  ],
  footer: { k3sRepoUrl: 'https://github.com/jtumidanski/k3s' },
};
