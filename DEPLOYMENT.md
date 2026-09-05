# Gemini Reflection & Journaling App - Deployment & Operations Runbook

A complete, production-grade guide for deploying, configuring, and verifying the **Gemini Reflection & Journaling App** on **Google Cloud Run** with **Cloud Firestore**, **Google Secret Manager**, and **Google Gemini 3.6 Flash**.

---

## 1. Architecture Overview & Threat Model

### Threat Summary Table

| Threat Zone | Identified Risk | Severity | Implemented Countermeasure |
| :--- | :--- | :--- | :--- |
| **Input Surfaces** | Speech dictation payload injection & unescaped Markdown XSS | Medium | Strict request schema typing, body limit capping (`10mb`), and ReactMarkdown rendering without raw HTML. |
| **Planning & Reasoning** | Prompt injection attempting system boundary escape | High | Enforced server-side system instructions treating journal logs as passive reflective text data. |
| **Tool & Query Execution** | Permission rejections from unconstrained Firestore scans | High | Queries strictly bounded by `where('ownerId', '==', user.uid)` and `where('memberEmails', 'array-contains', email)`. |
| **Memory & State** | Cross-tenant reflection leaks & driver crash on `undefined` | Critical | Recursive undefined-sanitization before writes; owner-bound path rules deployed to Cloud Firestore. |
| **Inter-System Communication** | Gemini API key leakage via client-side code or DevTools | Critical | Server-side Express API proxying with Google Secret Manager injection; zero frontend exposure. |

---

## 2. Prerequisites & Environment Setup

Ensure the `gcloud` CLI is installed, authenticated, and set to your target project:

```bash
# 1. Login to Google Cloud
gcloud auth login

# 2. Set environment variables
export PROJECT_ID="YOUR_PROJECT_ID"
export REGION="us-central1"
export SERVICE_NAME="gemini-reflection-app"

# 3. Set default gcloud project configuration
gcloud config set project $PROJECT_ID

# 4. Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

---

## 3. Database & Security Rules Configuration

### Step 3.1: Provision Cloud Firestore Database
```bash
gcloud firestore databases create --location=$REGION --type=firestore-native
```

### Step 3.2: Firestore Security Rules (`firestore.rules`)
Deploy these hardened owner-bound and role-based access control rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // 1. User Isolated Data (Personal reflections and weekly digests)
    match /users/{userId} {
      allow read, write: if isOwner(userId);

      match /interactions/{interactionId} {
        allow read, write: if isOwner(userId);
      }

      match /weekly_digests/{digestId} {
        allow read, write: if isOwner(userId);
      }
    }

    // 2. Collaborative Vaults (Role-Based Access Control)
    match /vaults/{vaultId} {
      function isVaultMember() {
        let vault = get(/databases/$(database)/documents/vaults/$(vaultId)).data;
        return isSignedIn() && (
          vault.ownerId == request.auth.uid ||
          (vault.members != null && vault.members[request.auth.uid] != null) ||
          (vault.memberEmails != null && request.auth.token.email != null && 
           (request.auth.token.email in vault.memberEmails || vault.memberEmails.hasAny([request.auth.token.email])))
        );
      }

      allow read: if isSignedIn() && (
        resource.data.ownerId == request.auth.uid ||
        (resource.data.members != null && resource.data.members[request.auth.uid] != null) ||
        (resource.data.memberEmails != null && request.auth.token.email != null && 
         (request.auth.token.email in resource.data.memberEmails || resource.data.memberEmails.hasAny([request.auth.token.email])))
      );

      allow create: if isSignedIn() && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if isSignedIn() && resource.data.ownerId == request.auth.uid;

      match /interactions/{interactionId} {
        allow read: if isVaultMember();
        allow create, update: if isVaultMember();
        allow delete: if isVaultMember();
      }
    }
  }
}
```

Deploy the rules using Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Secret Manager Configuration (Zero-Hardcoding Hygiene)

```bash
# 1. Create the secret in Google Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 2. Populate the secret version with your Gemini API key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Retrieve your Cloud project number
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# 4. Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 5. Build & Deploy to Google Cloud Run

Deploy directly from source to Cloud Run. The server automatically detects the Cloud Run environment and binds to the injected `$PORT` (default `8080`), while gracefully supporting custom port flags or standard container builds:

```bash
# Build and deploy container to Cloud Run from source
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

*(Note: The server automatically listens on Cloud Run's `$PORT` environment variable (default 8080) and uses 3000 in AI Studio sandbox environments).*

---

## 6. Mandatory Campaign Verification Resource Label

Apply the mandatory verification resource label:

```bash
gcloud run services update $SERVICE_NAME \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=$REGION
```

---

## 7. Comprehensive Walkthrough & Verification Test Suite

Every user-facing feature has an explicit test walkthrough step:

| Step ID | Feature / Component | Action | Expected Output |
| :--- | :--- | :--- | :--- |
| **TC-01** | **Google Authentication** | Navigate to service URL and click *Continue with Google Sign-In*. | Authenticates user via Firebase Auth, shows user avatar/email, and initializes `/users/{userId}` path. |
| **TC-02** | **Multi-Turn Reflection** | Type a reflection in the canvas, choose a mode (*Reflect*, *Brainstorm*, *Summarize*, or *Socratic*), and click *Send*. | Response generated via resilient Gemini model ladder; entry is stored to Cloud Firestore. |
| **TC-03** | **Voice Dictation** | Click the *Dictate* microphone button in the input bar and speak. | Real-time speech recognition transcribes voice into the input field with live visual pulsing indicator. |
| **TC-04** | **Focus Soundscapes** | Open the Soundscape dock in the top navigation and press *Play*. | Procedural Web Audio API sound generator produces ambient audio loops locally with zero external audio assets. |
| **TC-05** | **Interactive Analytics** | Switch to the *Analytics* tab. | Interactive Recharts area/bar charts display emotional trajectories (Clarity, Calm, Energy) and recurring keyword tags. |
| **TC-06** | **Weekly Synthesis Digest** | Switch to the *Digests* tab and click *Generate This Week's Synthesis*. | Gemini 3.6 Flash distills recent reflections into executive takeaways and saves to `/users/{userId}/weekly_digests/{id}`. |
| **TC-07** | **Collaborative Vaults** | Click *Collaborative Vaults*, create a shared workspace, and invite a collaborator email. | Scoped Firestore queries load shared retrospectives with role-based permissions and zero permission errors. |
