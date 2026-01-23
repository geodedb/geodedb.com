# Makefile for Geode documentation site

BUILDER_NAME := $(if $(BUILDER_NAME),$(BUILDER_NAME),$(shell git config user.name))
ifndef BUILDER_NAME
$(error "You must set environment variable BUILDER_NAME or set a user.name in your git configuration.")
endif

EMAIL := $(if $(BUILDER_EMAIL),$(BUILDER_EMAIL),$(shell git config user.email))
ifndef EMAIL
$(error "You must set environment variable BUILDER_EMAIL or set a user.email in your git configuration.")
endif

.PHONY: help build serve clean deploy update

help:
	@echo "Geode Documentation - Available targets:"
	@echo "  make build   - Build production site"
	@echo "  make serve   - Serve locally for development"
	@echo "  make clean   - Clean build artifacts"
	@echo "  make update  - Update theme submodule"
	@echo "  make deploy  - Deploy to GitLab Pages"

build:
	@echo "Building production site..."
	hugo --minify --gc -b https://geodedb.com

serve:
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
