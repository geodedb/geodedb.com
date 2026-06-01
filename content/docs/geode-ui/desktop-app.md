---
title: "Desktop Application"
description: "Install, launch, and secure the geode-ui-desktop Electron app: the geode:// privileged scheme, context isolation, CSP, saved-password handling, and code signing."
summary: "How to install, launch, and configure the geode-ui-desktop Electron application and understand its security model."
slug: "desktop-app"
url: "/docs/geode-ui/desktop-app/"
date: 2026-06-01
lastmod: 2026-06-01
draft: false
weight: 100
keywords: ["geode-ui-desktop", "electron", "desktop app", "context isolation", "geode protocol", "saved passwords", "code signing", "csp"]
tags: ["geode-ui", "desktop", "electron", "security"]
categories: ["Geode UI"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/geode-ui/desktop-app/"
---

Geode UI ({{< version "clients.ui" >}}) ships as a packaged desktop application, `geode-ui-desktop`, built with [Electron](https://www.electronjs.org/) and [electron-builder](https://www.electron.build/). The desktop build wraps the same React SPA that the headless `geode-ui` service serves, so there is no separate build of the front end, no second Content-Security-Policy, and no second authentication flow.

## Overview

The desktop application is a native window around the existing Geode UI front end. The Electron renderer loads the SPA bundle through a custom `geode://app/` privileged protocol rather than over HTTP, which gives the packaged window the same `'self'` origin semantics a browser tab would see.

Key characteristics:

- **Same React tree as the service.** The desktop app reuses the SPA bundle that is embedded in the headless `geode-ui` binary; there is no second front-end build to maintain.
- **Offline-first asset loading.** All JS, CSS, fonts, icons, and favicons are served from `geode://app/` — no CDN dependency.
- **Hardened by default.** The window runs with context isolation, a sandboxed preload, no Node integration, no `<webview>` tags, and deny-by-default permission handlers.
- **OS integration.** Window position and size are persisted, external links open in the OS default browser, and the renderer's theme tracks the OS light/dark setting in real time.

{{< callout type="note" >}}
The desktop app renders the same UI surfaces documented elsewhere in this suite — the [Query Editor & Visualization](/docs/geode-ui/query-editor/), [Cluster Monitoring](/docs/geode-ui/cluster-monitoring/), and [Administration](/docs/geode-ui/administration/) pages all apply unchanged when running under Electron.
{{< /callout >}}

## How it differs from the headless service

Geode UI ships in two packages, and they serve different audiences:

| Package | What it is | Recommended for |
|---|---|---|
| `geode-ui` | Headless, systemd-managed Go service that serves the SPA over HTTP/WebSocket | Servers and shared deployments |
| `geode-ui-desktop` | Electron GUI that wraps the same SPA in a native window | Workstations |

The headless service is documented across the rest of this suite — see [Installation](/docs/geode-ui/installation/) and [Configuration](/docs/geode-ui/configuration/). The desktop application is the recommended option on individual workstations.

The most important architectural difference is how the front end is loaded:

- The **headless service** serves the SPA over HTTP at `/` from the embedded `dist/` bundle.
- The **desktop app** loads the SPA from `geode://app/index.html` via Electron's `protocol.handle`, mapping `geode://app/<path>` to the bundled `dist/<path>`. Any unknown path returns `index.html` so client-side routes survive a hard reload, and any request that resolves outside the bundle directory returns `403`.

## Installation

On Debian-based systems the desktop app is installed from the Geode UI apt repository:

```bash
sudo apt install geode-ui-desktop      # electron GUI (recommended on workstations)
```

The headless service is a separate package:

```bash
sudo apt install geode-ui              # headless service (systemd-managed)
```

The release pipeline also publishes desktop installers as GitLab Release assets for each tagged release. The desktop installer formats are:

- macOS: `.dmg`
- Linux: `.AppImage` and `.deb`
- Windows: `.exe`

{{< callout type="info" >}}
Off-tag (main-branch snapshot) builds do not publish desktop installers — only tagged releases ship `geode-ui-desktop` artifacts.
{{< /callout >}}

For the full set of install paths (apt repo bootstrap, direct `dpkg`, and co-resident setup alongside the `geode` server and the headless `geode-ui` service), see the [Installation](/docs/geode-ui/installation/) page.

## Connecting to a Geode UI server

The desktop app is a renderer for the Geode UI front end; the actual graph traffic flows from the SPA to a Geode UI server's API origin. The renderer in a packaged build must be configured to target the operator-supplied API origin, because the SPA's `'self'` origin under Electron is `geode://app` — and the WebSocket query channel (`/ws/query`) goes to the backend server, not back to `geode://`.

### `GEODE_SERVER_URL` and auto-connect

The packaged build determines its API origin as follows:

- Set the `GEODE_SERVER_URL` environment variable to point the app at a specific Geode UI server.
- When `GEODE_SERVER_URL` is not set, the app auto-connects to a Geode UI server on `localhost:8080`.

{{< tabs >}}
{{< tab "Point at a specific server" >}}

```bash
GEODE_SERVER_URL="https://geode-ui.internal:8080" geode-ui-desktop
```

{{< /tab >}}
{{< tab "Auto-connect to localhost" >}}

```bash
# With GEODE_SERVER_URL unset, the app connects to localhost:8080
geode-ui-desktop
```

{{< /tab >}}
{{< /tabs >}}

{{< callout type="warning" >}}
The Content-Security-Policy's `connect-src` boundary means the API origin is an operator-configuration concern, not something the CSP wording can relax. If the renderer is not pointed at the correct API origin, the `/ws/query` WebSocket handshake is blocked because `'self'` under Electron resolves to `geode://app`.
{{< /callout >}}

The Geode UI server you connect to is a normal headless `geode-ui` instance — start one as described in [Configuration](/docs/geode-ui/configuration/) (for example, listening on `:8080`). Sign in with your Geode credentials exactly as you would in a browser; see [Authentication & Security](/docs/geode-ui/authentication-and-security/).

## Security model

The desktop window is hardened to keep the renderer — which is the primary attack surface in the desktop threat model — tightly contained.

### Window and process baseline

The packaged window enforces the following:

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. The renderer cannot reach Node directly.
- No `<webview>` tags.
- `setWindowOpenHandler` denies every opener and routes the URL to the OS default browser via `shell.openExternal`. An `<a target="_blank">` cannot spawn another Electron window.
- `will-navigate` blocks navigation outside the `geode://` origin.

### The `window.geode` bridge

The preload runs with context isolation and the sandbox enabled, and exposes a deliberately small surface to the renderer through `contextBridge.exposeInMainWorld`:

```ts
interface GeodeBridge {
  isElectron: true
  getVersion(): Promise<string>
  openExternal(url: string): Promise<boolean>      // https / mailto only
  getSystemTheme(): Promise<'light' | 'dark'>
  onSystemThemeChange(handler): () => void
}
```

The renderer detects Electron at runtime via `window.geode?.isElectron` and falls back to web-native equivalents (`window.open`, `window.matchMedia('(prefers-color-scheme: dark)')`) when running in a browser tab. The same React tree therefore runs unchanged in both the desktop app and a browser.

IPC handlers are explicit and validate input. The `geode:open-external` handler whitelists `https:` and `mailto:` URLs only — `file://` and custom schemes cannot be launched.

### Content-Security-Policy under `geode://`

The SPA emits its CSP on HTML responses, and it reads:

```text
default-src 'self';
script-src  'self' 'wasm-unsafe-eval';
style-src   'self' 'unsafe-inline';
worker-src  'self' blob:;
connect-src 'self' wss:;
img-src     'self' data:;
font-src    'self' data:;
frame-ancestors 'none';
base-uri 'none';
form-action 'self';
object-src 'none'
```

Under Electron the SPA loads from `geode://app/index.html`, and Chromium resolves `'self'` to the origin of the document — `geode://app` — not to a synthesised "Electron" pseudo-origin. As a result the existing CSP works unchanged under `geode://`:

- All bundle JS, CSS, fonts, images, and favicons load from `geode://app/*` and are same-origin, so `script-src 'self'`, `style-src 'self'`, `img-src 'self'`, and `font-src 'self'` all permit them.
- `script-src 'wasm-unsafe-eval'` is required by Monaco's tokenizer and is tied to the Chromium feature, not the origin, so it works under Electron unchanged.
- `worker-src 'self' blob:` permits Monaco's worker, which bootstraps from a `blob:` URL on first edit.
- `frame-ancestors 'none'` is honored even under the custom protocol; the packaged window is the only legitimate frame container.

The one boundary that is **not** a CSP-wording concern is `connect-src 'self' wss:` — the WebSocket query channel targets the backend server, so the API origin must be configured (via `GEODE_SERVER_URL` as described above), otherwise the handshake is blocked.

### Permission policy

Electron's privileged `geode://` scheme would otherwise inherit Chromium's default permission handlers for OS-integration APIs (media, clipboard-write, notifications, geolocation, and others). The desktop app installs **deny-by-default** handlers when the app is ready: the set of allowed permissions is empty, so every prompt (media, geolocation, notifications, clipboard, and so on) is denied. Both the request and check paths are bound, so `navigator.permissions.query({name: '…'})` reports `denied` without firing a user-facing prompt. The SPA does not request any OS-integration permissions today.

## Saved-password handling

The desktop app can remember connection passwords as a UX convenience, comparable to a browser password manager. This is a deliberate trust boundary, not a privileged credential vault.

### How saved passwords are stored

The preload exposes saved-password IPC channels on `window.geode`:

- `getStoredPassword(profile, username): Promise<string | null>`
- `storeSavedPassword(profile, username, password): Promise<boolean>`
- `clearStoredPassword(profile, username): Promise<boolean>`

The on-disk file, `<userData>/secure-store.json`, is encrypted via Electron's `safeStorage` under the OS keyring entry for the current user and app. Each payload is wrapped in a `{ v: 2, ciphertext, hmac }` envelope, and the HMAC key is a 32-byte random value persisted to a sibling file, `<userData>/secure-store.mackey` (wrapped via `safeStorage`, mode `0o600`):

```text
<userData>/
  secure-store.json     # connections + saved passwords (encrypted via safeStorage)
  secure-store.mackey   # HMAC key (32 random bytes wrapped via safeStorage), mode 0o600
```

Deleting `secure-store.mackey` forces the next launch to generate a fresh key. The prior `secure-store.json` then fails its HMAC and the read returns an empty document — an explicit, recoverable wipe that surfaces as a clean re-login flow rather than a silently broken UI.

### The trust boundary

At-rest encryption gates the file against another OS user reading it directly. It does **not** gate the IPC channels against a renderer running in the same OS user's process — and the renderer is the attack surface in the desktop threat model.

{{< callout type="warning" title="Accepted risk" >}}
Saved passwords are a UX convenience, not a privileged credential vault. A compromised renderer (for example, DOM-XSS that survives the CSP, a malicious npm transitive dependency in the SPA bundle, or an operator who opens developer tools and pastes attacker code) can enumerate visible `(profile, username)` pairs and read each stored password. Treat a renderer compromise as exposing every stored credential.
{{< /callout >}}

### Defense in depth

The desktop build adds two layers on top of at-rest encryption:

- **Unlock-token gate.** The main process tracks a per-session unlock token issued at sign-in and expires it after roughly 30 seconds. The IPC handler requires a matching token before returning a password, so a renderer compromise that lacks the freshly issued token receives `null` from every `getStoredPassword` call.
- **OS-native re-authentication (opt-in).** Controlled by the `savedPasswordRequireBiometric` preference, persisted in `secure-store.json` and toggled via the `geode:get-saved-password-biometric-pref` / `geode:set-saved-password-biometric-pref` IPC channels. When the preference is on:
  - **macOS** prompts via Touch ID (`systemPreferences.canPromptTouchID()` plus `promptTouchID('Unlock saved password')`). A rejected prompt returns `null` from `getStoredPassword`. A successful prompt within the last 60 seconds satisfies the gate without re-prompting and also obviates the unlock-token requirement for that read.
  - **Windows** is currently a fail-closed stub: turning the preference on returns `null` until Windows Hello is wired up via a native module. Opting in on Windows today disables saved passwords until that integration lands.
  - **Linux** is currently a fail-closed stub with the same semantics, pending polkit / pkexec integration.

For the broader authentication model — JWT issuance, credentials, and rate limiting — see [Authentication & Security](/docs/geode-ui/authentication-and-security/).

## Window state and external links

- **Window state.** The app persists window position, size, and maximized state to `<userData>/window-state.json`, so it reopens at the same dimensions.
- **External links.** Any URL outside the `geode://` origin is forced into the OS default browser via `shell.openExternal`. The application menu's "Help → Geode documentation" item opens `https://geodedb.com/docs/`.
- **Theme.** The renderer's theme tracks the OS light/dark setting. The main process pushes a theme-changed event when the OS theme flips, so the UI reacts in real time without polling.

## Code signing and packaging notes

Desktop installers are signed in the release pipeline where the corresponding certificates are provisioned. The signing behavior that is relevant to end users:

| Platform | Signing | Notes |
|---|---|---|
| Windows `.exe` | Signed with an EV Authenticode certificate via ssl.com's eSigner cloud HSM | EV certs are recommended for SmartScreen reputation. |
| macOS `.dmg` | Signed via electron-builder with an Apple Developer ID; hardened runtime is enabled, and builds are notarized via `notarytool` | Signing and notarization apply when the Apple Developer ID cert is provisioned. |
| Linux `.AppImage` / `.deb` | Unsigned by default | Provenance comes from the signed GitLab release tag; GPG signing can be layered on at the apt-repository level. |

{{< callout type="note" >}}
The signing jobs are configured to allow failure until the corresponding certificates are provisioned, so an unconfigured pipeline still ships unsigned bits. On a given platform, the installer you download may therefore be signed or unsigned depending on which certs were available when it was built.
{{< /callout >}}

App icons are produced from a single 512×512 PNG, from which electron-builder builds the `.icns` and `.ico` variants automatically.

## Related pages

- [Installation](/docs/geode-ui/installation/) — apt repo bootstrap, direct `dpkg`, and co-resident setup
- [Configuration](/docs/geode-ui/configuration/) — running a headless `geode-ui` server for the desktop app to connect to
- [Authentication & Security](/docs/geode-ui/authentication-and-security/) — sign-in, JWT, and rate limiting
- [Query Editor & Visualization](/docs/geode-ui/query-editor/) — the editor and graph surfaces the desktop app renders
