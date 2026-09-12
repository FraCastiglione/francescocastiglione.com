export const siteProfile = {
  name: 'Francesco Castiglione',
  url: 'https://francescocastiglione.com',
  linkedIn: 'https://www.linkedin.com/in/francescocastiglione5/',
  jobTitle: 'EU Project Management Professional',
  description:
    'Francesco Castiglione works on EU-funded projects, European cooperation, youth participation, partnerships, and international mobility.',
  image: '/assets/francesco-castiglione.jpg',
  socialImage: '/assets/francesco-castiglione-social.jpg',
  profileLastUpdated: '2026-09',
  profileLastUpdatedLabel: 'September 2026',
  erasmusPeriod: '2026–2027',
  erasmusStatusAsOf: 'September 2026',
} as const;

export const personStructuredData = {
  '@type': 'Person',
  '@id': `${siteProfile.url}/#person`,
  name: siteProfile.name,
  url: siteProfile.url,
  image: `${siteProfile.url}${siteProfile.image}`,
  jobTitle: siteProfile.jobTitle,
  description: siteProfile.description,
  sameAs: [siteProfile.linkedIn],
  knowsAbout: [
    'EU-funded projects',
    'European cooperation',
    'Project management',
    'Youth participation',
    'International mobility',
  ],
};

export const websiteStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${siteProfile.url}/#website`,
  url: siteProfile.url,
  name: siteProfile.name,
  description: siteProfile.description,
  publisher: { '@id': `${siteProfile.url}/#person` },
};

export const breadcrumbStructuredData = (items: Array<{ name: string; path: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: new URL(item.path, siteProfile.url).href,
  })),
});
