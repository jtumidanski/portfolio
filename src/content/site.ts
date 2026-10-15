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
  tagline:
    'Engineering leader building software for warehouse automation by day, and a homelab tinkerer by night. This is my corner of the internet.',
  bio: [
    'I’m a software engineering leader with over a decade of experience building products, leading teams, and solving complex technical challenges. My career has taken me through software development, DevOps, product ownership, and engineering management, giving me a broad perspective on how successful software gets built, from the initial idea through architecture, implementation, and delivery.',
    'Currently, I’m an Engineering Manager at Dematic, where I lead teams developing software solutions for warehouse automation and fulfillment operations. My work spans mobile applications, distributed systems, cloud technologies, and modern software architecture.',
    'I enjoy working at the intersection of technology, people, and product strategy. Whether it’s helping engineers grow, modernizing legacy systems, or turning ambiguous business problems into actionable technical solutions, I’m motivated by building things that make a meaningful difference.',
    'Outside of work, I’m a technology enthusiast who enjoys experimenting with infrastructure, self-hosted services, and new development tools. I maintain a personal homelab where I explore Kubernetes, virtualization, automation, and whatever else catches my interest.',
    'When I’m not behind a keyboard, you’ll probably find me running, working on cars, or finding another project to keep myself busy.',
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
