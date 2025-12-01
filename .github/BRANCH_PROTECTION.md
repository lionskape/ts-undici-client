# Branch Protection Configuration Guide

## Setting up branch protection for `main`

To protect the `main` branch and ensure changes can only be made through pull requests, follow these steps:

### Via GitHub UI

1. Go to repository **Settings** → **Branches**
2. Click **Add branch protection rule** (or **Add rule** / **Add branch ruleset** depending on your GitHub version)
3. Set **Branch name pattern** to: `main`
4. Enable the following settings:
   - ✅ **Require a pull request before merging**
     - ✅ Require approvals (set to 1 or more)
     - ✅ Dismiss stale pull request approvals when new commits are pushed
     - ✅ Require review from Code Owners
   - ✅ **Require status checks to pass before merging**
     - ✅ Require branches to be up to date before merging
     - Add required status check: `check` (from CI workflow)
   - ✅ **Do not allow bypassing the above settings** (optional, for strict enforcement)
   - ✅ **Restrict who can push to matching branches** (optional)

5. Click **Create** / **Save changes**

### Via GitHub CLI

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Login to GitHub
gh auth login

# Create branch protection rule
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --header "Accept: application/vnd.github+json" \
  --field required_status_checks='{"strict":true,"contexts":["check"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

## What is protected

Once configured, the `main` branch will have the following protections:

- ❌ Direct pushes to `main` are blocked
- ❌ Force pushes to `main` are blocked
- ❌ Branch deletion is blocked
- ✅ Changes must go through a pull request
- ✅ Pull requests must be approved before merging
- ✅ CI checks must pass before merging

## Files in this repository that support branch protection

- **`.github/CODEOWNERS`** - Defines who must review changes to specific files
- **`.github/workflows/ci.yml`** - CI workflow that runs checks on pull requests

## Additional Resources

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [About Code Owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
