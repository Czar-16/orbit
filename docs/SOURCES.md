# Source register

No external job APIs, feeds, crawling, or submission integrations are enabled through Phase 4. No listing pages are fetched.

| Origin | Current intake | Network/source permission |
| --- | --- | --- |
| LinkedIn | User-pasted URL/description or user-imported JSON list only | Manual source record; API enablement blocked by database constraint. No page fetch or automated Apply/Easy Apply/Continue/Submit. |
| Indeed | User-pasted URL/description or user-imported JSON list only | Manual source record; API enablement blocked by database constraint. No page fetch or automated Apply/Easy Apply/Continue/Submit. |
| Other supplied URLs/descriptions | Manual entry/import only | User-provided source label; no API/feed enabled or terms permission inferred. |

Public DNS lookup is used only to validate manually supplied URL hosts and block private/non-public addresses. It is not permission to fetch a listing. HTTPS, credentials, custom ports, fragments, loopback/private/link-local/metadata/reserved addresses, and mixed unsafe DNS answers are checked. No HTTP redirects are requested or followed. Any future permitted fetch must independently validate every redirect and the address at connection time; the stored validation is not permission to bypass a network-boundary check.

Before enabling any other source, record its official public API/feed, current terms URL, review date, permitted use, restrictions, and enable/disable decision here. Mirror the decision in Source and enforce it before scheduling a request. A technically reachable endpoint is not permission. User-provided job fields stay User-provided and unknown fields stay Unknown; no AI output is presented as verified employer information.
