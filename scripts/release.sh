#!/bin/bash

# MentiQ SDK Release Script
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log_error "package.json not found. Please run this script from the SDK root directory."
    exit 1
fi

# Get version type (default to patch)
VERSION_TYPE=${1:-patch}

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    log_error "Invalid version type. Use: patch, minor, or major"
    exit 1
fi

log_info "Starting MentiQ SDK release process..."
log_info "Version type: $VERSION_TYPE"

# Check if git working directory is clean
if [[ -n $(git status --porcelain) ]]; then
    log_error "Working directory is not clean. Please commit or stash your changes."
    git status --short
    exit 1
fi

log_success "Working directory is clean"

# Check if we're on main/master branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" && "$CURRENT_BRANCH" != "alpha" ]]; then
    log_warning "You're not on main/master/alpha branch (currently on: $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Release cancelled"
        exit 1
    fi
fi

# Run validation steps
log_info "Running validation checks..."

# Type checking
log_info "🔍 Type checking..."
if ! npm run type-check; then
    log_error "Type checking failed"
    exit 1
fi
log_success "Type checking passed"

# Linting
log_info "🧹 Linting..."
if ! npm run lint; then
    log_error "Linting failed"
    exit 1
fi
log_success "Linting passed"

# Testing
log_info "🧪 Running tests..."
if ! npm test; then
    log_error "Tests failed"
    exit 1
fi
log_success "Tests passed"

# Build
log_info "🏗️  Building..."
if ! npm run build; then
    log_error "Build failed"
    exit 1
fi
log_success "Build completed"

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
log_info "Current version: $CURRENT_VERSION"

# Bump version
log_info "📈 Bumping version..."
NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
log_success "Version bumped to: $NEW_VERSION"

# Update CHANGELOG
log_info "📝 Updating CHANGELOG..."
if [ ! -f "CHANGELOG.md" ]; then
    cat > CHANGELOG.md << EOF
# Changelog

All notable changes to this project will be documented in this file.

## [$NEW_VERSION] - $(date +%Y-%m-%d)

### Added
- Initial release of MentiQ Analytics SDK
- Dynamic loading for SSR compatibility
- Enhanced funnel tracking
- Session recording with rrweb
- Performance monitoring
- Error tracking
- TypeScript support

EOF
else
    # Add new version to existing changelog
    sed -i.bak "3i\\
## [$NEW_VERSION] - $(date +%Y-%m-%d)\\
\\
### Changed\\
- Version bump to $NEW_VERSION\\
\\
" CHANGELOG.md && rm CHANGELOG.md.bak
fi

log_success "CHANGELOG updated"

# Commit changes
log_info "📝 Committing changes..."
git add .
git commit -m "chore: release $NEW_VERSION

- Bump version to $NEW_VERSION
- Update CHANGELOG.md
- Build and validate all checks passing"

log_success "Changes committed"

# Create git tag
log_info "🏷️  Creating git tag..."
git tag -a "$NEW_VERSION" -m "Release $NEW_VERSION"
log_success "Tag $NEW_VERSION created"

# Ask for confirmation before publishing
echo
log_warning "Ready to publish $NEW_VERSION to npm registry"
log_info "This will:"
log_info "  • Push commits and tags to git remote"
log_info "  • Publish package to npm"
echo
read -p "Continue with publish? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warning "Publish cancelled. You can publish later with:"
    log_info "  git push origin $CURRENT_BRANCH --tags"
    log_info "  npm publish"
    exit 0
fi

# Push to git
log_info "📤 Pushing to git..."
git push origin $CURRENT_BRANCH
git push origin $NEW_VERSION
log_success "Pushed to git remote"

# Publish to npm
log_info "📦 Publishing to npm..."
if npm publish; then
    log_success "Successfully published $NEW_VERSION to npm!"
else
    log_error "npm publish failed"
    exit 1
fi

# Final success message
echo
log_success "🎉 Release $NEW_VERSION completed successfully!"
log_info "Package is now available at: https://www.npmjs.com/package/mentiq-sdk"
log_info "Git tag: $NEW_VERSION"

# Show next steps
echo
log_info "📋 Next steps:"
log_info "  • Update documentation if needed"
log_info "  • Announce the release"
log_info "  • Monitor for any issues"

echo