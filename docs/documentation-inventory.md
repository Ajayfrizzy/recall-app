# Documentation Inventory

This inventory records the September 26, 2026 documentation audit. It covers every version-controlled project document in `README.md` and `docs/` before consolidation, plus the consolidated destination created by the audit.

| Document                          | Disposition                 | Reason and result                                                                                                                                                                            |
| --------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                       | Keep and update             | Shortened to the project overview, principal features, implemented InterServer architecture, setup, checks, build status, limitations, and documentation index.                              |
| `docs/architecture.md`            | Keep and update             | Corrected the obsolete DigitalOcean plan and documented the implemented Caddy, Compose, backend, and persistent SQLite topology.                                                             |
| `docs/deployment.md`              | Keep and update             | Retained the authoritative InterServer, Docker Compose, Caddy, HTTPS, environment, SQLite persistence, backup, restore-test, update, and rollback runbook; added the verified health status. |
| `docs/judge-guide.md`             | Keep and update             | Retained onboarding, screenshot access, optional AI, 90-day judge AI/RevenueCat Pro activation, demonstration flow, and accurate testing limits.                                             |
| `docs/privacy-policy.md`          | Keep and update             | Retained the implementation-based draft, corrected deployment status, and explicitly preserved unresolved legal/contact/effective-date/retention placeholders.                               |
| `docs/release-qa.md`              | Keep and update             | Remains the single checklist separating verified infrastructure and existing-device results from the pending clean standalone APK, first-time judge flow, and physical Relevant Now retest.  |
| `docs/demo-script.md`             | Keep and update             | Still needed until the final video is complete; updated the exact **Snooze 1 day** demonstration label.                                                                                      |
| `docs/release-notes.md`           | Keep and update             | Reduced repetitive milestone notes to a concise release-candidate history and current verification boundary.                                                                                 |
| `docs/next-gen-submission.md`     | Merge into another document | Rules, deadline, eligibility, Devpost requirements, judging criteria, and readiness checks moved to `docs/submission.md`. Source file removed to avoid parallel checklists.                  |
| `docs/submission-checklist.md`    | Merge into another document | Icon, screenshot, video, capture-safety, and optional APK requirements moved to `docs/submission.md`. Source file removed.                                                                   |
| `docs/submission-notes.md`        | Merge into another document | Devpost-ready problem, solution, differentiation, RevenueCat, AI, architecture, challenge, and status copy moved to `docs/submission.md`. Source file removed.                               |
| `docs/submission.md`              | Keep and update             | New consolidated source for Shipaton requirements, September 30 deadline, proposed copy, evidence, assets, and optional judge material.                                                      |
| `docs/documentation-inventory.md` | Keep and update             | Records audit scope and future ownership of each document.                                                                                                                                   |

## Removed as obsolete

No complete version-controlled document was deleted solely as obsolete. Obsolete DigitalOcean and undeployed-backend statements were removed in place, and repetitive release milestone details were condensed. The only deleted files were the three submission documents whose useful content was preserved in `docs/submission.md`.

## Public-document safety review

The version-controlled Markdown contains no real invitation code, access token, API secret, password, private host address, personal screenshot, or personal contact detail. Placeholder secret names, sample values, public project URLs, and the public backend hostname remain because they are required for setup and operations.

Ignored maintainer files (`AGENTS.md`, `CLAUDE.md`, and `call.md`) are not public repository documentation. The local `call.md` operator note contains machine-specific deployment details, remains ignored by Git, and is not linked from public documentation.
