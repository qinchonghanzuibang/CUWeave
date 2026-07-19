import type { MetadataRoute } from 'next'

const publicPaths = [
  '/',
  '/courses',
  '/planner',
  '/data-status',
  '/feedback',
  '/privacy',
  '/terms',
  '/community-guidelines',
  '/moderation-policy',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = new URL(process.env.BETTER_AUTH_URL ?? 'http://localhost:3000')
  return publicPaths.map((path) => ({
    url: new URL(path, origin).toString(),
    changeFrequency: path === '/courses' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : path === '/courses' ? 0.9 : 0.6,
  }))
}
