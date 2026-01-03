# How to Push to GitHub

## The Problem
Git needs authentication to push to GitHub.

## Solution Options

### Option 1: Use GitHub Desktop (Easiest)
1. Download GitHub Desktop: https://desktop.github.com/
2. Sign in with your GitHub account
3. Add your repository
4. Click "Push origin" button

### Option 2: Use Personal Access Token

1. **Create a Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name it: "Stock Watch App"
   - Select scope: `repo` (check the box)
   - Click "Generate token"
   - **COPY THE TOKEN** (you won't see it again!)

2. **Push using the token:**
   ```bash
   cd /Users/sk/Desktop/Cursor1/stock-watch-clean
   git push https://YOUR_TOKEN@github.com/steponaskaciulis-max/STOCKAPPv3.git main
   ```
   (Replace YOUR_TOKEN with the token you copied)

### Option 3: Use SSH (More Secure)

1. **Generate SSH key (if you don't have one):**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```
   (Press Enter to accept defaults)

2. **Add SSH key to GitHub:**
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
   Copy the output, then:
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Paste the key and save

3. **Change remote to SSH:**
   ```bash
   cd /Users/sk/Desktop/Cursor1/stock-watch-clean
   git remote set-url origin git@github.com:steponaskaciulis-max/STOCKAPPv3.git
   git push -u origin main
   ```

### Option 4: Use GitHub CLI

If you have `gh` installed:
```bash
gh auth login
git push -u origin main
```

## Quick Test

After setting up authentication, try:
```bash
cd /Users/sk/Desktop/Cursor1/stock-watch-clean
git push -u origin main
```

## Recommended: GitHub Desktop

The easiest way is to use GitHub Desktop - it handles authentication automatically!

