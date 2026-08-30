# Gemini Reflection & Journaling App

A user-authenticated web application built with **Firebase Authentication (Google Sign-In)**, **Cloud Firestore** for user-isolated and collaborative data storage, and **Google Gemini 3.6 Flash** for multi-turn reflective journaling, speech dictation, visual analytics, focus soundscapes, and weekly executive digests.

---

## 🔒 Security Architecture & Firestore Rules

User data isolation and role-based collaborative sharing are strictly enforced at the database level:
- Personal reflections are private to the user (`/users/{userId}/interactions/{interactionId}`)
- Weekly digests are private to the user (`/users/{userId}/weekly_digests/{digestId}`)
- Collaborative vaults enforce role-based access control (Owner, Editor, Viewer) via `/vaults/{vaultId}` and `/vaults/{vaultId}/interactions/{interactionId}`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // 1. Isolated User Sub-collections
    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /interactions/{interactionId} {
        allow read, write: if isOwner(userId);
      }

      match /weekly_digests/{digestId} {
        allow read, write: if isOwner(userId);
      }
    }

    // 2. Collaborative Reflection Vaults (RBAC)
    match /vaults/{vaultId} {
      function isVaultMember() {
        let vault = get(/databases/$(database)/documents/vaults/$(vaultId)).data;
        return isAuthenticated() && (
          vault.ownerId == request.auth.uid ||
          (vault.memberEmails != null && request.auth.token.email != null &&
           request.auth.token.email in vault.memberEmails) ||
          (vault.members != null && request.auth.uid in vault.members)
        );
      }

      allow read: if isAuthenticated() && (
        resource.data.ownerId == request.auth.uid ||
        (resource.data.memberEmails != null && request.auth.token.email != null &&
         request.auth.token.email in resource.data.memberEmails) ||
        (resource.data.members != null && request.auth.uid in resource.data.members)
      );

      allow create: if isAuthenticated() && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if isAuthenticated() && resource.data.ownerId == request.auth.uid;

      match /interactions/{interactionId} {
        allow read: if isVaultMember();
        allow create, update: if isVaultMember();
        allow delete: if isVaultMember();
      }
    }
  }
}
```

---

## 🛡️ Secret Management & Environment Variables

All Gemini API interactions are proxied securely on the backend server (`/api/*`). The API key is never exposed to the client or browser network logs.

### Setting up Secret Manager in Google Cloud

```bash
# 1. Create and populate the secret in Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Cloud Run runtime service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🚀 Google Cloud Run Deployment & Campaign Verification

### 1. Build and Deploy Container to Cloud Run

```bash
# Build & deploy the application container
gcloud run deploy gemini-reflection-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

### 2. Mandatory Campaign Verification Label

Apply the mandatory verification resource label:

```bash
gcloud run services update gemini-reflection-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🧪 Comprehensive Walkthrough & Test Suite

Every user-facing feature has a corresponding step-by-step test verification case:

### Test Case 1: Landing Page & Google Sign-In Authentication
- **Action**: Navigate to `/` and click "Continue with Google Sign-In".
- **Expected Outcome**:
  - Modal prompts for Google Authentication.
  - Upon sign-in, user lands on authenticated dashboard showing their avatar, email, and Firestore user path.

### Test Case 2: Multi-Turn Journaling & Gemini 3.6 Flash
- **Action**: Select reflection mode ("Reflect", "Brainstorm", "Summarize", or "Socratic") and send a prompt.
- **Expected Outcome**:
  - Gemini response is rendered with formatted markdown and empathetic guidance.
  - Session auto-extracts psycholinguistic sentiment, clarity, energy score, and recurring keywords.

### Test Case 3: Voice-to-Text Stream-of-Consciousness Dictation
- **Action**: Click the "Dictate" microphone button in the reflection composer and speak.
- **Expected Outcome**:
  - Browser speech recognition activates with active listening pulse and interim preview pill.
  - Transcribed speech is appended directly to the input box in real-time.

### Test Case 4: Ambient Audio Soundscapes Dock
- **Action**: Click the Soundscape pill in the top header, choose a preset (Lofi Pulse, Rain & Thunder, Forest Canopy, Ocean Waves, or Binaural Alpha 10Hz), and press Play.
- **Expected Outcome**:
  - Web Audio API synthesizes a procedural ambient loop in real time with zero external network downloads.
  - User can adjust volume slider or select a focus timer (15 min, 25 min Pomodoro, 45 min).

### Test Case 5: Interactive Reflection Analytics Dashboard
- **Action**: Click "Analytics" in the sidebar navigation tab and toggle timeframes (Past 7 Days, Past 30 Days, All Time).
- **Expected Outcome**:
  - Area charts display daily Emotional & Energy Trajectories (Clarity, Calm, Energy).
  - Bar charts display emotional spectrum averages (Clarity, Focus, Joy, Calm, Tension).
  - Recurring keyword frequency chips display key ideas with count badges.

### Test Case 6: Automated Weekly Synthesis Digests
- **Action**: Click "Digests" in the sidebar navigation and press "Generate This Week's Synthesis".
- **Expected Outcome**:
  - Gemini 3.6 Flash synthesizes the past 7 days of reflections into an editorial digest with executive takeaways, core recurring themes, and next week's growth actions.
  - Digest is persisted to `/users/{userId}/weekly_digests/{digestId}` and stored in the historical archive.

### Test Case 7: Collaborative Reflection Vaults (RBAC)
- **Action**: Click "Collaborative Vaults" in the sidebar, create a new vault (e.g. "Mentorship Circle"), invite a peer email as "Editor", and click "Enter Vault".
- **Expected Outcome**:
  - Workspace switches context to the collaborative vault with shared retrospective timeline.
  - Co-authors can submit retrospectives with author attribution badges.
  - Only invited members can read or write to `/vaults/{vaultId}`.

### Test Case 8: Google Maps Location-Aware Pinning & Geo-Filtering
- **Action**: In the reflection composer, click "Pin Location" (or select a preset like San Francisco/Kyoto, or use GPS Geolocation), save, and submit a reflection.
- **Expected Outcome**:
  - Pinned place name and coordinates are bound to the interaction document in Firestore.
  - Interactive location badge renders on the reflection header.
  - Pinned city/place appears in the sidebar history filter and allows instantaneous location-based filtering.

### Test Case 9: External Notification Webhook Dispatch (Slack / Discord / Webhook)
- **Action**: Click the Bell icon in the sidebar footer, add a Slack/Discord webhook URL, select triggers ("All Reflections", "High Clarity", "High Energy"), and click "Test Ping".
- **Expected Outcome**:
  - Server proxies the outbound notification through `/api/notifications/dispatch` with strict SSRF defense.
  - Real-time Slack Block Kit or Discord rich embed message arrives with reflection summary, energy score, and pinned location.

### Test Case 10: System Admin Console & Immutable Audit Trail
- **Action**: Click "Admin" in the sidebar (for admin role or owner account).
- **Expected Outcome**:
  - Displays real-time aggregate telemetry (total reflections, collaborative vaults, system users, weekly digests).
  - Allows managing user roles (`admin`, `member`) with dynamic Firestore security rule checks.
  - Provides a live, chronological Security Audit Trail (`/audit_logs`) tracking administrative actions, role updates, and authentication events.
