#!/bin/bash
# check-links.sh - Validate internal links in markdown files
#
# This script checks for broken internal links in the content directory
# by parsing markdown files and verifying that link targets exist.
#
# Usage: ./scripts/check-links.sh [--fix]
#   --fix: Suggest fixes for broken links (doesn't modify files)

set -e

CONTENT_DIR="${CONTENT_DIR:-content}"
FIX_MODE=false

# Colors for output
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Temp file to store errors
ERROR_FILE=$(mktemp)
trap "rm -f $ERROR_FILE" EXIT

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fix)
            FIX_MODE=true
            shift
            ;;
        --content-dir)
            CONTENT_DIR="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}Checking internal links in ${CONTENT_DIR}...${NC}"
echo ""

# Function to check if a link target exists
check_link() {
    local source_file="$1"
    local link="$2"

    # Remove anchor fragments
    link="${link%%#*}"

    # Remove query strings
    link="${link%%\?*}"

    # Skip empty links
    [[ -z "$link" ]] && return 0

    # Skip external links
    [[ "$link" =~ ^https?:// ]] && return 0
    [[ "$link" =~ ^mailto: ]] && return 0
    [[ "$link" =~ ^tel: ]] && return 0
    [[ "$link" =~ ^geode:// ]] && return 0

    # Skip special protocols
    [[ "$link" =~ ^[a-z]+:// ]] && return 0

    # Handle absolute paths (starting with /)
    if [[ "$link" =~ ^/ ]]; then
        # Convert URL path to file path
        local path="${CONTENT_DIR}${link}"
        path="${path%/}"  # Remove trailing slash

        # Check for various file patterns
        [[ -f "${path}.md" ]] && return 0
        [[ -f "${path}/_index.md" ]] && return 0
        [[ -f "${path}/index.md" ]] && return 0
        [[ -d "${path}" && ( -f "${path}/_index.md" || -f "${path}/index.md" ) ]] && return 0

        # Link is broken
        return 1
    fi

    # Handle relative paths
    local source_dir=$(dirname "$source_file")
    local resolved="${source_dir}/${link}"

    [[ -f "$resolved" ]] && return 0
    [[ -f "${resolved}.md" ]] && return 0
    [[ -f "${resolved}/_index.md" ]] && return 0

    return 1
}

# Function to find similar files for suggestions
find_similar() {
    local link="$1"
    local basename=$(basename "$link" | sed 's/\/$//;s/\.md$//')

    find "$CONTENT_DIR" -name "*.md" -type f 2>/dev/null | while read -r file; do
        local fname=$(basename "$file" .md)
        if [[ "$fname" == "$basename" ]] || [[ "$fname" == "_index" && $(dirname "$file") == *"$basename"* ]]; then
            local url_path="${file#$CONTENT_DIR}"
            url_path="${url_path%.md}"
            url_path="${url_path%/_index}"
            url_path="${url_path%/index}"
            echo "    ${BLUE}Suggestion:${NC} ${url_path}/"
        fi
    done
}

# Process each markdown file
find "$CONTENT_DIR" -name "*.md" -type f | sort | while read -r file; do
    # Extract markdown links: [text](url)
    links=$(grep -oP '\]\([^)]+\)' "$file" 2>/dev/null | sed 's/](\([^)]*\))/\1/' | grep -v '^#' || true)

    for link in $links; do
        if ! check_link "$file" "$link"; then
            echo "$file|$link" >> "$ERROR_FILE"
        fi
    done
done

# Count errors
ERROR_COUNT=$(wc -l < "$ERROR_FILE" 2>/dev/null | tr -d ' ')

# Report results
if [[ "$ERROR_COUNT" -gt 0 ]]; then
    echo -e "${RED}Found $ERROR_COUNT broken internal link(s):${NC}"
    echo ""

    current_file=""
    while IFS='|' read -r file link; do
        if [[ "$file" != "$current_file" ]]; then
            current_file="$file"
            echo -e "${YELLOW}${file}:${NC}"
        fi
        echo -e "  ${RED}✗${NC} $link"

        if $FIX_MODE; then
            find_similar "$link"
        fi
    done < "$ERROR_FILE"

    echo ""
    echo -e "${RED}Link check failed with $ERROR_COUNT error(s).${NC}"

    if ! $FIX_MODE; then
        echo -e "${BLUE}Tip: Run with --fix to see suggestions for broken links.${NC}"
    fi

    exit 1
else
    echo -e "${GREEN}✓ All internal links are valid!${NC}"
    exit 0
fi
