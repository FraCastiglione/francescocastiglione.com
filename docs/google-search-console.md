# Google Search Console activation

The website is ready for Google Search Console: it publishes crawl instructions at `/robots.txt`, generates `/sitemap-index.xml`, and declares canonical URLs.

## Domain verification

1. Open Google Search Console and add the **Domain** property `francescocastiglione.com`.
2. Copy the TXT record Google provides into the domain's DNS settings.
3. After verification, submit `https://francescocastiglione.com/sitemap-index.xml` in **Sitemaps**.
4. Inspect the homepage URL and request indexing after a major content update.
