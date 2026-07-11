import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const locationSchema = z.object({
  city: z.string(),
  country: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
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
    summary: z.string(),
    skills: z.array(z.string()).default([]),
    relatedProjects: z.array(z.string()).default([]),
    pdfPath: z.string().optional(),
    credentialUrl: z.url().optional(),
    featured: z.boolean().default(false),
  }),
});

const news = defineCollection({
  loader: glob({ base: './src/content/news', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    publishedAt: z.coerce.date(),
    category: z.enum(['project', 'article', 'event', 'update']),
    relatedProjects: z.array(z.string()).default([]),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, certificates, news };
