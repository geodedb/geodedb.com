---
title: "Installing Geode UI"
description: "Install Geode UI on Debian/Ubuntu via the apt repository, direct dpkg, or build from source. Covers the headless service, desktop app, and co-resident setup."
summary: "How to install Geode UI as a headless systemd service, as an Electron desktop app, or by building from source."
slug: "installation"
url: "/docs/geode-ui/installation/"
date: 2026-06-01
lastmod: 2026-06-01
draft: false
weight: 10
keywords: ["geode-ui install", "apt repository", "dpkg", "systemd service", "geode-ui-desktop", "build from source", "co-resident", "local-geode profile"]
tags: ["geode-ui", "installation", "deployment", "systemd"]
categories: ["Geode UI"]
toc: true
params:
  seo:
    canonical: "https://geodedb.com/docs/geode-ui/installation/"
---

Geode UI ({{< version "clients.ui" >}}) ships as two complementary packages: a headless systemd service and an Electron desktop application. This page walks through every supported install method on Debian and Ubuntu, plus building from source.

## Overview

Geode UI is distributed in two packages so you can run the API server and the GUI independently:

| Package | Audience | Install |
|---|---|---|
| `geode-ui` | Headless service (run alongside `geode` on a server or workstation). systemd-managed; listens on `127.0.0.1:8080` by default. | `sudo apt install geode-ui` |
| `geode-ui-desktop` | Electron desktop wrapper. Talks to any reachable `geode-ui` HTTP origin. | `sudo apt install ./geode-ui-desktop_<version>_<arch>.deb` |

Most operators install both: `geode-ui` runs the API server, and `geode-ui-desktop` is the GUI that connects to it.

{{< callout type="tip" >}}
The recommended setup pairs `geode` and `geode-ui` on the same host so the connection picker is populated automatically on first launch. See [Co-resident with geode](#co-resident-with-geode) below.
{{< /callout >}}

## Headless service via apt (Debian/Ubuntu)

The apt repository is the recommended way to install and keep `geode-ui` up to date. Add the repository once, then install the package.

```bash
# Add the Geode apt repository (one-time).
curl -fsSL https://gitlab.com/devnw/codepros/geode/geode-ui/-/raw/main/deployment/apt-key.gpg \
  | sudo gpg --dearmor -o /usr/share/keyrings/geode-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/geode-archive-keyring.gpg] https://apt.geodedb.com stable main" \
  | sudo tee /etc/apt/sources.list.d/geode.list

# Install the service.
sudo apt update
sudo apt install geode-ui
```

### What the postinstall does

When you install the `geode-ui` package, the postinstall script:

1. Creates the `geode-ui` system user.
2. Drops `/lib/systemd/system/geode-ui.service` and enables it.
3. If `geode` is installed on the same host, writes `/etc/geode-ui/seed-profiles.d/10-local-geode.json` pointing at `quic://localhost:3141`. On first launch the server seeds this as a `scope=system` profile so the SPA shows it in the connection picker out of the box.
4. Starts `geode-ui.service`.

### Verify the install

Confirm the service is running and the health endpoint responds:

```bash
systemctl status geode-ui.service
curl http://127.0.0.1:8080/api/v1/healthz
```

## Headless service via direct dpkg

If you prefer to install a specific release artifact without configuring the apt repository, download the `.deb` from the GitLab release page and install it with `dpkg`:

```bash
curl -fLO https://gitlab.com/devnw/codepros/geode/geode-ui/-/releases/v<version>/downloads/geode-ui_<version>_Linux_x86_64.deb
sudo dpkg -i geode-ui_<version>_Linux_x86_64.deb
```

{{< callout type="note" >}}
Replace `<version>` with the release you want to install. Direct `dpkg` installs do not configure automatic updates; use the apt repository if you want `geode-ui` to upgrade with `apt update && apt upgrade`.
{{< /callout >}}

## Desktop app via apt

The desktop package wraps the SPA in an Electron window and connects to a running `geode-ui` HTTP origin.

```bash
sudo apt install geode-ui-desktop
geode-ui-desktop  # launches the electron window
```

If `geode-ui` is also installed locally, the desktop app auto-connects to `http://127.0.0.1:8080`. To point at a remote host, set the `GEODE_SERVER_URL` environment variable (for example, via a `.desktop` file or a wrapper script).

### Headless service vs. desktop package

These two packages serve different roles:

- **`geode-ui`** is the headless API server. It runs as a systemd-managed service under the `geode-ui` system user, embeds the React SPA, and exposes the HTTP/WebSocket API. This is what you install on a server.
- **`geode-ui-desktop`** is the Electron GUI. It does not run a server; it is a desktop window that talks to a `geode-ui` HTTP origin (local or remote). This is recommended on workstations.

For more on the desktop client, see [Desktop Application](/docs/geode-ui/desktop-app/).

## Co-resident with geode

The intended pairing is to install `geode` and `geode-ui` on the same host:

```bash
sudo apt install geode geode-ui
```

apt installs both binaries, starts both systemd services, and the `geode-ui` postinstall seeds the local-geode profile (see [What the postinstall does](#what-the-postinstall-does)). Open the SPA at `http://127.0.0.1:8080` and the connection picker already shows `local-geode`.

{{< callout type="info" title="Why the seed profile matters" >}}
Without a seeded profile, the SPA's connection picker would be empty on first launch and you would have to add a connection manually before running any query. The co-resident postinstall seeds a `scope=system` profile pointing at `quic://localhost:3141` so the picker is non-empty out of the box. See [Connections & Profiles](/docs/geode-ui/connections-and-profiles/) for managing profiles.
{{< /callout >}}

## Building from source

You can build the single self-contained binary from source. The build produces `./bin/geode-ui` (the SPA is compiled and embedded into the Go binary).

**Prerequisites:** Go 1.26.3 and Node.js 22.14+.

```bash
# Build (Go 1.26.3 + Node 22.14+)
make build
```

Once built, run the binary directly. Generate a JWT secret and point it at a local Geode instance:

```bash
# Generate a JWT secret
SECRET=$(openssl rand -hex 32)

# Run, pointing at a local Geode at quic://127.0.0.1:3141
./bin/geode-ui -listen :8080 -jwt-secret-hex "$SECRET"

# Open http://localhost:8080 and sign in with your Geode credentials
```

Useful additional `make` targets for source builds:

```bash
make help            # list all targets
make generate        # regenerate gen/ from geode.json (sentinel-aware)
make build           # production build (SPA + Go binary)
make test            # all tests (Go + JS)
make lint            # all linters
make web-dev         # webpack dev server (port 3000, proxies to :8080)
```

{{< callout type="note" >}}
The default listen address is `:8080`. The `-jwt-secret-hex` flag is required; it expects a hex-encoded HS256 secret of at least 32 bytes, which you can generate with `openssl rand -hex 32`. See [Configuration](/docs/geode-ui/configuration/) for the full flag reference.
{{< /callout >}}

## Systemd service behavior

When installed from a package, `geode-ui` runs as a systemd-managed service:

- The unit file is installed at `/lib/systemd/system/geode-ui.service` and enabled by the postinstall.
- The service runs as the `geode-ui` system user.
- The default listen address is `127.0.0.1:8080`.

Manage the service with the usual `systemctl` commands:

```bash
systemctl status geode-ui.service        # check status
sudo systemctl restart geode-ui.service  # restart after config changes
```

### Editing service configuration

Package installs read configuration from `/etc/geode-ui/geode-ui.conf`. Edit the file and restart the service to apply changes:

```bash
sudo systemctl restart geode-ui.service
```

The conf file documents every knob inline. Common overrides include:

- `GEODE_UI_LISTEN=0.0.0.0:8080` to expose on the LAN.
- `GEODE_UI_PROFILE_SEED_DIR=` to disable the drop-in profile scanner.

For the complete set of configuration options, see [Configuration](/docs/geode-ui/configuration/).

## Removal

To remove the headless service:

```bash
sudo apt remove geode-ui        # stops + removes the service; keeps /var/lib/geode-ui
sudo apt purge geode-ui         # also wipes profile store + uploads
```

`apt remove` stops and removes the service but keeps `/var/lib/geode-ui`. Use `apt purge` to additionally wipe the profile store and uploads.

## Next steps

- [Quick Start](/docs/geode-ui/quick-start/) — sign in and run your first query.
- [Configuration](/docs/geode-ui/configuration/) — flags, environment variables, and the conf file.
- [Connections & Profiles](/docs/geode-ui/connections-and-profiles/) — manage seeded and user-defined profiles.
- [Desktop Application](/docs/geode-ui/desktop-app/) — the Electron GUI in depth.
