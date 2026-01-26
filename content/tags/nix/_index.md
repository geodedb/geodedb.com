---
title: "Nix Package Manager Integration"
description: "Explore Geode documentation tagged with nix. Learn about nix features, best practices, and implementation details."
keywords:
  - nix
  - Geode
  - graph database
  - documentation
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/nix/"
    noindex: false
---

<!-- CANARY: REQ=REQ-DOCS-001; FEATURE="Docs"; ASPECT=Documentation; STATUS=TESTED; OWNER=docs; UPDATED=2026-01-15 -->

# Nix Package Manager Integration

Nix is a powerful package manager and build system that provides reproducible, declarative, and reliable software deployments. Geode offers first-class Nix integration, making it easy to install, configure, and deploy Geode in reproducible environments across development, staging, and production.

## Introduction to Nix

Nix differs from traditional package managers like apt, yum, or homebrew:

**Traditional Package Managers**:
- System-wide installations (conflicts possible)
- Imperative (install, upgrade, remove)
- State-dependent (different results on different machines)
- Difficult rollbacks

**Nix**:
- Isolated packages (no conflicts)
- Declarative (describe desired state)
- Reproducible (same inputs = same outputs)
- Atomic upgrades and easy rollbacks
- Per-project environments

**Key Concepts**:
- **Derivation**: Build recipe describing how to build a package
- **Store**: `/nix/store/` containing all packages with unique hashes
- **Profile**: User environment with selected packages
- **Flake**: Modern Nix project structure with locked dependencies

## Installing Geode with Nix

### Using Nix Flakes (Recommended)

Geode provides a `flake.nix` for modern Nix workflows:

```bash
# Install Nix with flakes enabled (if not already installed)
sh <(curl -L https://nixos.org/nix/install) --daemon

# Enable flakes (add to ~/.config/nix/nix.conf)
echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf

# Run Geode directly from the repository
nix run github:codeprosorg/geode -- serve --listen 0.0.0.0:3141

# Or install to your profile
nix profile install github:devnw/geode

# Then run
geode serve
```

### Using Traditional Nix

```bash
# Clone repository
git clone https://github.com/codeprosorg/geode
cd geode

# Build with Nix
nix-build

# Result symlink points to built package
./result/bin/geode --version

# Install to profile
nix-env -f . -i geode
```

### Using NixOS

Add Geode to your NixOS configuration:

```nix
# /etc/nixos/configuration.nix
{ config, pkgs, ... }:

{
  # Import Geode module
  imports = [
    (builtins.fetchGit {
      url = "https://github.com/codeprosorg/geode";
      ref = "main";
    } + "/nix/module.nix")
  ];

  # Enable Geode service
  services.geode = {
    enable = true;
    listen = "0.0.0.0:3141";
    dataDir = "/var/lib/geode";

    tls = {
      enable = true;
      certFile = "/etc/geode/cert.pem";
      keyFile = "/etc/geode/key.pem";
    };

    settings = {
      max_connections = 1000;
      log_level = "info";
      audit_logging = true;
    };
  };

  # Open firewall port
  networking.firewall.allowedTCPPorts = [ 3141 ];
}
```

Rebuild system:
```bash
sudo nixos-rebuild switch
```

## Development Environment with Nix

### Development Shell

Geode's `flake.nix` provides development shells with all dependencies:

```bash
# Enter development shell
nix develop

# Now you have:
# - Zig compiler (correct version)
# - Build tools (make, etc.)
# - Development utilities
# - Environment variables set

# Build Geode
make build

# Run tests
make test

# Exit shell
exit
```

### Custom Development Shell

Create project-specific shell:

```nix
# shell.nix
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    # Geode server
    geode

    # Client development
    python311
    python311Packages.geode-client
    go_1_21
    rustc
    cargo

    # Development tools
    jq
    curl
    postgresql  # For comparison/migration
  ];

  shellHook = ''
    echo "Geode development environment loaded"
    echo "Geode version: $(geode --version)"

    # Start Geode in background (development instance)
    export GEODE_DATA_DIR="$PWD/.geode-dev-data"
    mkdir -p "$GEODE_DATA_DIR"

    # Set environment variables
    export GEODE_HOST="localhost"
    export GEODE_PORT="3141"
  '';
}
```

Usage:
```bash
nix-shell shell.nix

# Or with flakes:
# nix develop -f shell.nix
```

## Reproducible Deployments

### Pinning Dependencies

Nix ensures reproducibility by pinning exact versions:

```nix
# flake.nix (simplified)
{
  description = "Geode Graph Database";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-23.11";
    zig.url = "github:mitchellh/zig-overlay";
  };

  outputs = { self, nixpkgs, zig }: {
    packages.x86_64-linux.default =
      # Build recipe with exact input versions locked in flake.lock
      nixpkgs.legacyPackages.x86_64-linux.callPackage ./default.nix {
        zig = zig.packages.x86_64-linux."0.12.0";
      };
  };
}
```

**Benefits**:
- Same build on any machine (bitwise reproducible)
- No "works on my machine" problems
- Safe rollbacks (old versions always available)
- Audit trail (flake.lock records exact dependencies)

### Multi-Stage Docker Build with Nix

Combine Nix reproducibility with Docker portability:

```dockerfile
# Dockerfile
FROM nixos/nix:latest AS builder

# Copy source
WORKDIR /build
COPY . .

# Build with Nix (reproducible)
RUN nix-build

# Minimal runtime image
FROM alpine:latest

# Copy only the built binary (no build dependencies)
COPY --from=builder /build/result/bin/geode /usr/local/bin/geode

# Runtime configuration
EXPOSE 3141
VOLUME /var/lib/geode

ENTRYPOINT ["geode"]
CMD ["serve", "--listen", "0.0.0.0:3141", "--data-dir", "/var/lib/geode"]
```

Build:
```bash
docker build -t geode:latest .
docker run -p 3141:3141 -v geode-data:/var/lib/geode geode:latest
```

## CI/CD with Nix

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: cachix/install-nix-action@v22
        with:
          nix_path: nixpkgs=channel:nixos-23.11
          extra_nix_config: |
            experimental-features = nix-command flakes

      - uses: cachix/cachix-action@v12
        with:
          name: geode
          authToken: '${{ secrets.CACHIX_AUTH_TOKEN }}'

      - name: Build
        run: nix build

      - name: Test
        run: nix develop --command make test

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: geode-binary
          path: result/bin/geode
```

### GitLab CI

```yaml
# .gitlab-ci.yml
image: nixos/nix:latest

build:
  script:
    - nix-build
  artifacts:
    paths:
      - result/

test:
  script:
    - nix develop --command make test
  dependencies:
    - build

deploy:
  stage: deploy
  script:
    - nix copy --to ssh://production result
    - ssh production "systemctl restart geode"
  only:
    - main
```

## Nix-based Configuration Management

### Declarative Service Configuration

```nix
# geode-config.nix
{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.services.geode;
in {
  options.services.geode = {
    enable = mkEnableOption "Geode graph database";

    package = mkOption {
      type = types.package;
      default = pkgs.geode;
      description = "Geode package to use";
    };

    listen = mkOption {
      type = types.str;
      default = "127.0.0.1:3141";
      description = "Address to listen on";
    };

    dataDir = mkOption {
      type = types.path;
      default = "/var/lib/geode";
      description = "Data directory";
    };

    settings = mkOption {
      type = types.attrs;
      default = {};
      description = "Additional settings";
    };
  };

  config = mkIf cfg.enable {
    systemd.services.geode = {
      description = "Geode Graph Database";
      wantedBy = [ "multi-user.target" ];
      after = [ "network.target" ];

      serviceConfig = {
        Type = "simple";
        User = "geode";
        Group = "geode";
        ExecStart = "${cfg.package}/bin/geode serve --listen ${cfg.listen} --data-dir ${cfg.dataDir}";
        Restart = "on-failure";
        RestartSec = "5s";

        # Security hardening
        NoNewPrivileges = true;
        PrivateTmp = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        ReadWritePaths = [ cfg.dataDir ];
      };

      preStart = ''
        mkdir -p ${cfg.dataDir}
        chown geode:geode ${cfg.dataDir}
        chmod 750 ${cfg.dataDir}
      '';
    };

    users.users.geode = {
      description = "Geode database user";
      group = "geode";
      home = cfg.dataDir;
      createHome = true;
      isSystemUser = true;
    };

    users.groups.geode = {};
  };
}
```

## Cross-Platform Builds

Nix supports cross-compilation for multiple platforms:

```bash
# Build for Linux ARM64 (e.g., Raspberry Pi)
nix build .#packages.aarch64-linux.default

# Build for macOS (Darwin)
nix build .#packages.x86_64-darwin.default

# Build for Windows (via mingw)
nix build .#packages.x86_64-w64-mingw32.default

# Build matrix (all platforms)
nix flake show  # Lists all available outputs
```

Multi-platform `flake.nix`:

```nix
{
  description = "Geode Graph Database";

  outputs = { self, nixpkgs }: {
    packages = nixpkgs.lib.genAttrs [
      "x86_64-linux"
      "aarch64-linux"
      "x86_64-darwin"
      "aarch64-darwin"
    ] (system:
      let pkgs = nixpkgs.legacyPackages.${system};
      in {
        default = pkgs.callPackage ./default.nix {};
      }
    );
  };
}
```

## Best Practices

### 1. Use Flakes for New Projects

Flakes provide:
- Automatic dependency locking (`flake.lock`)
- Better performance (evaluation caching)
- Standard project structure
- Improved discoverability

```bash
# Initialize flake in existing project
nix flake init

# Update dependencies
nix flake update

# Show available outputs
nix flake show
```

### 2. Leverage Binary Caches

Avoid rebuilding by using binary caches:

```nix
# nix.conf or CLI flag
substituters = https://cache.nixos.org https://geode.cachix.org
trusted-public-keys = cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY= geode.cachix.org-1:...
```

### 3. Pin nixpkgs for Reproducibility

```nix
# flake.nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-23.11";
    # Locked in flake.lock with exact commit hash
  };
}
```

### 4. Test Builds in CI

Ensure builds work on clean systems:

```yaml
- name: Check flake
  run: nix flake check

- name: Build all outputs
  run: nix flake check --all-systems
```

## Troubleshooting

### Issue: Build Fails Due to Missing Dependencies

**Diagnosis**:
```bash
nix develop --command env
```

**Solution**: Update `buildInputs` in `default.nix`:
```nix
buildInputs = with pkgs; [
  zig
  zlib  # Add missing dependency
];
```

### Issue: Old Package Version

**Diagnosis**:
```bash
nix flake metadata
cat flake.lock  # Check locked versions
```

**Solution**:
```bash
# Update all inputs
nix flake update

# Update specific input
nix flake lock --update-input nixpkgs
```

### Issue: Build Not Reproducible

**Diagnosis**:
```bash
# Build twice and compare
nix build
mv result result1
nix build
diffoscope result1 result
```

**Solution**: Check for:
- Timestamps in build outputs
- Non-deterministic code execution
- Network fetches during build

## Related Topics

- **[Deployment](/tags/deployment/)**: Deployment strategies
- **[DevOps](/tags/devops/)**: DevOps practices
- **[Docker](/tags/docker/)**: Container deployments
- **[Configuration](/tags/configuration/)**: Configuration management
- **[Installation](/tags/installation/)**: Installation guides

## Further Reading

- **Nix Manual**: https://nixos.org/manual/nix/stable/
- **NixOS Manual**: https://nixos.org/manual/nixos/stable/
- **Nix Pills**: https://nixos.org/guides/nix-pills/
- **Geode Nix Module**: `/docs/deployment/nix-module/`
- **Reproducible Builds**: `/docs/development/reproducible-builds/`
