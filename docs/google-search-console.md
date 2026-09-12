# Google Search Console activation

The website is ready for Google Search Console: it publishes crawl instructions at `/robots.txt`, generates `/sitemap-index.xml`, declares canonical URLs, and supports Google's HTML verification token.

## Recommended: domain verification

1. Open Google Search Console and add the **Domain** property `francescocastiglione.com`.
2. Copy the TXT record Google provides into the domain's DNS settings.
3. After verification, submit `https://francescocastiglione.com/sitemap-index.xml` in **Sitemaps**.
4. Inspect the homepage URL and request indexing after a major content update.

## Alternative: HTML-tag verification

1. Add a GitHub repository variable named `GOOGLE_SITE_VERIFICATION` containing only the verification token Google provides.
2. Run the deployment workflow again.
3. Ask Search Console to verify the URL-prefix property `https://francescocastiglione.com/`.

Do not add the full `<meta>` element to the repository variable; use only its `content` value.
