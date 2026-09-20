# Website measurement

## Privacy-friendly visit analytics

The site supports GoatCounter, a lightweight, cookie-free analytics service. Tracking is disabled unless the GitHub Actions repository variable `PUBLIC_GOATCOUNTER_CODE` is set to the account code.

When enabled, page paths show which projects, certificates, and articles receive visits. Every public LinkedIn contact link also sends an event named `contact-linkedin:<page path>`, so LinkedIn clicks can be reviewed as the primary contact conversion and attributed to the page where the click began.

Activation:

1. Create the GoatCounter account and note its account code.
2. Add `PUBLIC_GOATCOUNTER_CODE` as a GitHub Actions repository variable.
3. Redeploy the site and confirm that page visits reach the GoatCounter dashboard.

No email address is displayed on the website. Keep individual pageview collection disabled in GoatCounter so reporting remains aggregate-only.

## Monthly Search Console dashboard

The private Looker Studio dashboard should use the Search Console connector and default to the last 28 days compared with the previous period. Its minimum useful view is:

- Scorecards: clicks, impressions, click-through rate, and average position.
- Time series: clicks and impressions by date.
- Tables: top landing pages and top search queries.
- Breakdowns: device and country.
- Filters: date range, page, query, device, and country.

Review the dashboard monthly, recording pages with rising impressions, pages with declining click-through rate, and high-impression queries where the average position is close to the first page.
