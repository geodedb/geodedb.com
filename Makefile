# Makefile for Geode documentation site

HUGO_VERSION ?= 0.139.4
DART_SASS_VERSION ?= 1.80.7
HUGO_BIN ?= /usr/local/bin/hugo
SASS_BIN ?= /usr/local/bin/sass

.PHONY: help deps deps-check npm build serve clean deploy update

help:
	@echo "Geode Documentation - Available targets:"
	@echo "  make deps        - Install Hugo Extended, Dart Sass, and Node.js"
	@echo "  make deps-check  - Check if dependencies are installed"
	@echo "  make npm         - Install npm dependencies (PostCSS, etc.)"
	@echo "  make build       - Build production site"
	@echo "  make serve       - Serve locally for development"
	@echo "  make clean       - Clean build artifacts"
	@echo "  make update      - Update theme submodule"
	@echo "  make deploy      - Deploy to GitLab Pages"

deps-check:
	@echo "Checking dependencies..."
	@which hugo >/dev/null 2>&1 && echo "✓ Hugo found: $$(hugo version)" || echo "✗ Hugo not found"
	@which sass >/dev/null 2>&1 && echo "✓ Dart Sass found: $$(sass --version)" || echo "✗ Dart Sass not found"
	@which node >/dev/null 2>&1 && echo "✓ Node.js found: $$(node --version)" || echo "✗ Node.js not found"
	@which npm >/dev/null 2>&1 && echo "✓ npm found: $$(npm --version)" || echo "✗ npm not found"
	@which npx >/dev/null 2>&1 && echo "✓ npx found" || echo "✗ npx not found"
	@[ -d node_modules ] && echo "✓ npm packages installed" || echo "✗ npm packages not installed (run 'make npm')"
	@echo ""
	@echo "Run 'make deps' to install system dependencies"
	@echo "Run 'make npm' to install npm packages"

deps:
	@echo "Installing dependencies..."
	@# Determine if we need sudo (skip in CI)
	@if [ -z "$(CI)" ]; then \
		SUDO="sudo"; \
	else \
		SUDO=""; \
	fi; \
	if ! command -v hugo >/dev/null 2>&1; then \
		echo "Installing Hugo Extended $(HUGO_VERSION)..."; \
		wget -q https://github.com/gohugoio/hugo/releases/download/v$(HUGO_VERSION)/hugo_extended_$(HUGO_VERSION)_linux-amd64.tar.gz -O /tmp/hugo.tar.gz; \
		tar -xzf /tmp/hugo.tar.gz -C /tmp/; \
		$$SUDO mv /tmp/hugo $(HUGO_BIN); \
		$$SUDO chmod +x $(HUGO_BIN); \
		rm -f /tmp/hugo.tar.gz; \
		echo "✓ Hugo Extended $(HUGO_VERSION) installed"; \
	else \
		echo "✓ Hugo already installed: $$(hugo version)"; \
	fi; \
	if ! command -v sass >/dev/null 2>&1; then \
		echo "Installing Dart Sass $(DART_SASS_VERSION)..."; \
		wget -q https://github.com/sass/dart-sass/releases/download/$(DART_SASS_VERSION)/dart-sass-$(DART_SASS_VERSION)-linux-x64.tar.gz -O /tmp/dart-sass.tar.gz; \
		tar -xzf /tmp/dart-sass.tar.gz -C /tmp/; \
		$$SUDO mkdir -p /usr/local/lib/dart-sass; \
		$$SUDO cp -r /tmp/dart-sass/* /usr/local/lib/dart-sass/; \
		$$SUDO ln -sf /usr/local/lib/dart-sass/sass $(SASS_BIN); \
		$$SUDO chmod +x /usr/local/lib/dart-sass/sass; \
		rm -rf /tmp/dart-sass /tmp/dart-sass.tar.gz; \
		echo "✓ Dart Sass $(DART_SASS_VERSION) installed"; \
	else \
		echo "✓ Dart Sass already installed: $$(sass --version)"; \
	fi
	@echo ""
	@echo "All system dependencies installed!"
	@hugo version
	@sass --version
	@echo ""
	@echo "Now run 'make npm' to install npm packages (PostCSS, etc.)"

npm:
	@echo "Installing npm dependencies..."
	@if ! command -v npm >/dev/null 2>&1; then \
		echo "Error: npm not found. Please install Node.js first."; \
		echo "  Ubuntu/Debian: sudo apt-get install nodejs npm"; \
		echo "  Or download from: https://nodejs.org/"; \
		exit 1; \
	fi
	@npm install
	@echo "✓ npm dependencies installed"

build: npm
	@echo "Building production site..."
	hugo --minify --gc -b https://geodedb.com

serve: npm
	@echo "Starting development server at http://localhost:1313"
	hugo server -D --bind 0.0.0.0

clean:
	@echo "Cleaning build artifacts..."
	rm -rf public/ resources/_gen/ hugo_stats.json

update:
	@echo "Updating theme submodule..."
	git submodule update --init --recursive
	git submodule update --remote themes/ultra

deploy: build
	@echo "Site built. Push to main branch to deploy via GitLab CI/CD"
	@echo "Run: git push origin main"
