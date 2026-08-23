---
name: n8n-render-neon-deploy
description: Deploy, import, repair, and validate self-hosted n8n on Render with Neon Postgres, especially on Render's 512 MB free service. Use for n8n setup, failed imports, memory exits, editor connection loss, webhook routing, version pinning, and safe workflow activation. Do not use for unrelated Render or database work.
---

# n8n on Render and Neon

Use a persistent Neon Postgres database and treat the Render filesystem as ephemeral. Pin an explicit n8n image version; never deploy `latest` on a memory-constrained production service.

Before changing a live service, inspect the current live deployment, desired image, Docker command, environment, database compatibility, and available rollback. Preserve the last healthy deployment until the replacement is verified.

Read [references/runbook.md](references/runbook.md) for installation, workflow import, troubleshooting, OAuth, activation, and verification. Follow only the sections relevant to the current request.

Keep secrets out of repositories, logs, workflow JSON, and skill files. Creating OAuth credentials, deleting cloud variables, activating a workflow, submitting a real form, or changing a production deployment still requires the authorization appropriate to that action; this skill does not grant it.
