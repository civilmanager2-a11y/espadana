# Render + Neon n8n runbook

## Contents

- Architecture and version choice
- Required configuration
- First deployment
- Reliable workflow import
- Known failures and fixes
- Google credentials and activation
- End-to-end verification
- Free-plan operating notes

## Architecture and version choice

- Run the official `docker.io/n8nio/n8n:<pinned-version>` image as a Render Web Service.
- Store n8n state in Neon Postgres. Render's free filesystem is ephemeral.
- Start with the newest version demonstrated to fit the selected instance. On the 512 MB Render free instance used for the Espadana deployment, `2.35.7` repeatedly exceeded memory while `1.123.65` ran successfully. Re-evaluate this observation for other dates or instance sizes; do not universalize it.
- Avoid migrating a production database forward and then casually downgrading. Inspect migration compatibility and use a Neon branch or backup before risky version changes.
- Set the Docker command explicitly to `n8n start`. A missing or accidentally restored command can leave the process responding with `Cannot GET /` even though the port is open.

## Required configuration

Use Render secret environment variables. Do not commit values.

```text
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=<Neon host>
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=<database>
DB_POSTGRESDB_USER=<role>
DB_POSTGRESDB_PASSWORD=<secret>
DB_POSTGRESDB_SCHEMA=public
DB_POSTGRESDB_SSL_ENABLED=true
DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED=false
DB_POSTGRESDB_CONNECTION_TIMEOUT=60000

N8N_HOST=<service>.onrender.com
N8N_PROTOCOL=https
N8N_EDITOR_BASE_URL=https://<service>.onrender.com
WEBHOOK_URL=https://<service>.onrender.com/
N8N_PROXY_HOPS=1
N8N_PUSH_BACKEND=websocket
N8N_SECURE_COOKIE=true
N8N_ENCRYPTION_KEY=<stable random secret>
PORT=5678
GENERIC_TIMEZONE=Asia/Tehran
TZ=Asia/Tehran
```

Keep `N8N_ENCRYPTION_KEY` stable. Losing or changing it can make stored credentials unreadable.

Render supports public WebSockets. Prefer `websocket` over `sse` for production n8n unless the network explicitly blocks WebSocket upgrades.

## First deployment

1. Create or select the Neon project, database, and role.
2. Create the Render Web Service from an existing public image.
3. Enter the complete image URL and wait for Render to validate it before pressing Connect.
4. Pin the version and set Docker Command to `n8n start`.
5. Add all database and public URL variables before the first production deploy.
6. Wait for both `n8n ready on ::, port 5678` and Render's `Your service is live` marker.
7. Open the service, create the owner account, and confirm that `/projects/<projectId>/workflows` loads.

Do not interpret Render's intermediate `No open ports detected` message as a final failure while n8n is still starting. The free instance can need more than a minute.

## Reliable workflow import

Prefer the n8n UI import when the editor is healthy. For headless recovery, use the n8n CLI against the same database.

The non-separate import path can fail with:

```text
null value in column "id" of relation "workflow_entity" violates not-null constraint
```

Use a directory plus `--separate`, add a stable workflow ID, and import inactive:

```js
const fs = require('fs');
const cp = require('child_process');
const dir = '/tmp/n8n-import';
fs.mkdirSync(dir, { recursive: true });
const workflow = JSON.parse(Buffer.from(process.env.N8N_IMPORT_PAYLOAD_B64, 'base64').toString());
workflow.id ||= 'importedWorkflow01';
workflow.active = false;
fs.writeFileSync(`${dir}/workflow.json`, JSON.stringify(workflow));
const result = cp.spawnSync(
  'n8n',
  ['import:workflow', '--separate', `--input=${dir}`, `--projectId=${process.env.N8N_IMPORT_PROJECT_ID}`],
  { stdio: 'inherit' },
);
console.log(`__N8N_IMPORT_DONE__:${result.status}`);
process.exit(result.status ?? 1);
```

Render's Docker Command field is an executable command, not a dependable shell pipeline. Pipes, `&&`, and nested quoting caused status 127 or printed Base64 instead of executing it. For a temporary one-shot import on the free plan:

1. Base64-encode the Node import script and workflow JSON locally.
2. Store them in temporary Render secret variables.
3. Use a quote-free wrapper such as `node -e eval(Buffer.from(process.env.N8N_IMPORT_SCRIPT_B64,process.env.N8N_IMPORT_ENCODING).toString())` with `N8N_IMPORT_ENCODING=base64`.
4. Reveal and verify the updated script value in Render before deploying; an earlier attempt appeared saved but retained the old secret.
5. Confirm the log contains `Successfully imported 1 workflow.` and `__N8N_IMPORT_DONE__:0`.
6. Immediately restore Docker Command to `n8n start` and deploy the pinned stable image.
7. Remove temporary import secrets after approval, or leave them inert until cleanup is authorized.

If Render One-Off Jobs or a shell is available, prefer that surface over temporarily replacing the production start command.

## Known failures and fixes

### Out of memory on free Render

Symptom: the instance repeatedly exits after using more than 512 MB.

Fix: pin a demonstrated lower-memory n8n version or increase the instance size. Disable auto-deploy while recovering so a failed desired deployment cannot replace the healthy one. After recovery, update the Image source itself; relying indefinitely on a rollback leaves future manual deploys pointed at the bad version.

### `Connection lost` and `Invalid origin!`

Symptom: the UI loads, but the editor shows `Connection lost`; logs show an undefined Origin on `/rest/push`.

Fix:

- Set `N8N_PUSH_BACKEND=websocket`.
- Confirm `N8N_HOST`, `N8N_PROTOCOL=https`, `N8N_EDITOR_BASE_URL`, `WEBHOOK_URL`, and `N8N_PROXY_HOPS=1`.
- Redeploy the pinned image; a simple restart may not apply the desired configuration reliably.
- Reload the editor and verify both that the banner disappears and that no new `Invalid origin!` line appears.

### `Cannot GET /`

Symptom: Render reports the port live, but the root and workflow routes return `Cannot GET`.

Fix: verify that the service is running the main process, set Docker Command to `n8n start`, and deploy the pinned image instead of only restarting an old rollback.

### Rollback is live but desired source is still broken

Symptom: the dashboard shows a healthy old deployment, while the service header still points to a newer image that fails.

Fix: update Settings → Image to the healthy pinned version. A rollback protects availability but does not necessarily repair the desired source used by the next deployment.

### Workflow imports but credentials are missing

Imported workflow JSON may contain credential IDs from another n8n instance. These IDs are references, not portable OAuth sessions. Create fresh credentials in the target instance and assign them to each node.

## Google credentials and activation

1. Verify the editor connection before opening nodes.
2. Create or select a Google Sheets OAuth2 credential for the intended Google account and grant only the needed Sheet access.
3. Assign it to the Google Sheets node and verify the document and sheet names.
4. Create or select a Gmail OAuth2 credential and grant send permission.
5. Assign it to the Gmail node and save the workflow.
6. Keep the workflow inactive until every required credential is valid.
7. Activate only after confirming the production webhook path and expected response mode.

OAuth is persistent access. Obtain action-time approval and let the user handle passwords, CAPTCHA, or two-factor authentication.

## End-to-end verification

Verify the complete path, not only the editor:

1. Service root and editor load without `Connection lost`.
2. Workflow appears in the intended personal or team project.
3. Production webhook URL matches `WEBHOOK_URL` and the website proxy target.
4. A controlled test payload receives a 2xx response within the website's timeout.
5. The expected row appears in the target Google Sheet.
6. If an email address is present, exactly one confirmation email is sent.
7. An empty email follows the no-email branch without failing the workflow.
8. n8n Executions shows success and logs contain no credential, origin, or database errors.

Submitting a real customer form or sending a test email is an external action; obtain action-time approval immediately before the test.

## Free-plan operating notes

- Render free services sleep after inactivity. Expect a cold start that can exceed 50 seconds.
- Website proxies should allow a timeout longer than the cold-start window; 75 seconds was used for the Espadana contact proxy.
- Use immediate webhook acknowledgement when downstream Google operations can be slow.
- Retain only the execution history needed for diagnosis; pruning reduces database growth.
- Monitor memory after adding community nodes or enabling task runners.
- Keep a healthy pinned deployment and a Neon branch or backup before upgrades.
