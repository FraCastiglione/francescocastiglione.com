import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const locationSchema = z.object({
  city: z.string(),
  country: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const certificateLocationSchema = z.object({
  city: z.string(),
  country: z.string(),
});

const certificatePdfPathSchema = z.string().regex(/^\/documents\/certificates\/[a-z0-9-]+\.pdf$/);
const certificatePreviewPathSchema = z.string().regex(/^\/assets\/certificates\/[a-z0-9-]+\.jpg$/);
const galleryImagePathSchema = z.string().regex(
  /^\/assets\/gallery\/[a-z0-9\/_-]+\.(?:avif|jpe?g|png|webp)$/,
  'Gallery photos and posters must be web-ready images inside /public/assets/gallery/',
);
const galleryVideoPathSchema = z.string().regex(
  /^\/assets\/gallery\/[a-z0-9\/_-]+\.(?:mp4|webm)$/,
  'Gallery videos must be MP4 or WebM files inside /public/assets/gallery/',
);

const certificateDocumentSchema = z.object({
  label: z.string(),
  path: certificatePdfPathSchema,
  pages: z.number().int().positive().optional(),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    yearLabel: z.string(),
    sortDate: z.coerce.date().optional(),
    role: z.string(),
    program: z.string(),
    activityType: z.string(),
    deliveryMode: z.enum(['in-person', 'online', 'hybrid']).default('in-person'),
    status: z.enum(['complete', 'in-progress', 'details-pending']),
    locations: z.array(locationSchema).default([]),
    skills: z.array(z.string()).default([]),
    organisations: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    externalUrl: z.url().optional(),
    relatedCertificates: z.array(z.string()).default([]),
  }),
});

const certificates = defineCollection({
  loader: glob({ base: './src/content/certificates', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    issuer: z.string(),
    issued: z.string(),
    sortDate: z.coerce.date().optional(),
    summary: z.string(),
    category: z.string().default('Professional credential'),
    program: z.string().default('Professional development'),
    activityType: z.string().default('Course'),
    locations: z.array(certificateLocationSchema).default([]),
    deliveryMode: z.string().optional(),
    skills: z.array(z.string()).default([]),
    relatedProjects: z.array(z.string()).default([]),
    pdfPath: certificatePdfPathSchema.optional(),
    documents: z.array(certificateDocumentSchema).default([]),
    credentialUrl: z.url().optional(),
    previewImage: certificatePreviewPathSchema.optional(),
    previewAlt: z.string().optional(),
    documentStatus: z.enum(['private-review', 'public']).default('private-review'),
    pageCount: z.number().int().positive().optional(),
    documentCount: z.number().int().positive().default(1),
    featured: z.boolean().default(false),
  }),
});

const news = defineCollection({
  loader: glob({ base: './src/content/news', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    publishedAt: z.coerce.date(),
    dateLabel: z.string().optional(),
    category: z.enum(['project', 'article', 'event', 'update']),
    relatedProjects: z.array(z.string()).default([]),
    relatedAffiliations: z.array(z.string()).default([]),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    imageCaption: z.string().optional(),
    imageCredit: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const galleryCommonSchema = {
  title: z.string(),
  caption: z.string(),
  alt: z.string(),
  category: z.string().default('Project'),
  sortDate: z.coerce.date(),
  dateLabel: z.string().optional(),
  location: z.string().optional(),
  relatedProjects: z.array(z.string()).default([]),
  relatedNews: z.array(z.string()).default([]),
  relatedAffiliations: z.array(z.string()).default([]),
  credit: z.string().optional(),
  creditUrl: z.url().optional(),
  fit: z.enum(['cover', 'contain']).default('cover'),
  featured: z.boolean().default(false),
};

const gallery = defineCollection({
  loader: glob({ base: './src/content/gallery', pattern: '**/*.md' }),
  schema: z.discriminatedUnion('mediaType', [
    z.object({
      ...galleryCommonSchema,
      mediaType: z.literal('photo'),
      src: galleryImagePathSchema,
    }),
    z.object({
      ...galleryCommonSchema,
      mediaType: z.literal('video'),
      src: galleryVideoPathSchema,
      poster: galleryImagePathSchema.optional(),
    }),
  ]),
});

const affiliations = defineCollection({
  loader: glob({ base: './src/content/affiliations', pattern: '**/*.md' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    period: z.string(),
    location: z.string(),
    summary: z.string(),
    monogram: z.string().min(2).max(5),
    externalUrl: z.url(),
    relatedProjects: z.array(z.string()).default([]),
    sortOrder: z.number().int().default(0),
    active: z.boolean().default(true),
  }),
});

export const collections = { projects, certificates, news, gallery, affiliations };
