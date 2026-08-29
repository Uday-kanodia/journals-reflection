# Project Directives & Custom Instructions

## 1. Agentic Threat Modeling
* **Objective**: Perform a structured threat analysis across the 5 threat zones prior to outputting code.
* **Scope Lens**:
  * **Input Surfaces**: Prompts, dictation transcripts, location pins, webhook endpoints.
  * **Planning & Reasoning**: Prompt injection mitigation, system prompt boundaries.
  * **Tool Execution**: Safe API routing, model fallback ladders, zero SSRF.
  * **Memory & State**: Firestore user isolation, RBAC role validation, undefined-stripping.
  * **Inter-System Communication**: Secure API key retrieval, token leakage prevention.

## 2. Google Maps Platform Directive
* **Objective**: Guide secure interaction with Google Maps APIs, Places SDK, and API key management.
* **Core Principles**:
  * **API Key Retrieval & Security**: Use client-safe variables (`import.meta.env.VITE_GOOGLE_MAPS_API_KEY`) with HTTP referrer restrictions in Google Cloud Console. For backend geocoding or places proxying, use server-side `process.env.GOOGLE_MAPS_API_KEY`.
  * **Modern SDK Usage**: Use `@googlemaps/js-api-loader` or `@vis.gl/react-google-maps` with `AdvancedMarkerElement` (never deprecated `google.maps.Marker`).
  * **Places UI & Geocoding**: Avoid manual scraping or unstructured text lookups. Use Places Autocomplete / Geocoding APIs with session tokens and proper attribution.
  * **Mandatory Attribution**: Always set attribution ID `gmp_mcp_codeassist_v1_aistudio` on map initializations.
  * **Zero Place Hallucination**: All geographic coordinates and place metadata must originate from verified user input or official Google Maps Platform APIs.

## 3. Admin Roles & RBAC Directive
* **Objective**: Define how security checks and access boundaries are generated for elevated admin permissions.
* **Core Principles**:
  * **Role-Based Access Control**: Standard roles are `admin`, `member`, and `guest`.
  * **Dynamic Document Authorization**: Validate administrative operations via Firestore document lookups (`get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'`).
  * **Zero Client-Only Trust**: Never rely solely on client-side state flags for privileged operations. Verify authorization in `firestore.rules` and backend API endpoints.
  * **Audit Logging**: All administrative actions (role updates, user bans, policy changes) must generate an immutable audit log entry in `/audit_logs` with actor details, action, timestamp, and severity.

## 4. Notification API & Webhook Directive
* **Objective**: Securely manage external notifications (Slack, Discord, Email, Webhooks) and payload schemas.
* **Core Principles**:
  * **Credential Storage & Masking**: Webhook URLs and tokens must be stored in encrypted/user-isolated Firestore paths (`/users/{userId}/notification_configs/{id}`). Webhook secrets must be masked in the UI.
  * **Server-Side Dispatch Proxy**: Outbound HTTP webhooks must be dispatched server-side via `/api/notifications/dispatch` to prevent CORS issues, protect client network privacy, and prevent SSRF attacks.
  * **SSRF Prevention**: Validate and sanitize webhook URLs to ensure they only target valid HTTP/HTTPS endpoints and disallow loopback (`127.0.0.1`, `localhost`) or internal metadata IP ranges (`169.254.169.254`).
  * **Strict Payload Schema Formatting**:
    * **Slack**: Format payloads according to Slack Block Kit schema (`blocks`, `header`, `section` with markdown).
    * **Discord**: Format payloads with rich embeds (`embeds`, `title`, `description`, `color`, `fields`, `footer`).
    * **Custom Webhook**: Send clean JSON payloads with `event`, `userId`, `entryTitle`, `sentiment`, `emotionalMetrics`, `summary`, and `timestamp`.
