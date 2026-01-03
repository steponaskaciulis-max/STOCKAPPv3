# How to Add Files to Your GitHub Repository

## Option 1: If You Already Have a GitHub Repository

### Step 1: Find Your Repository URL
1. Go to your GitHub repository (the one connected to Vercel)
2. Click the green "Code" button
3. Copy the HTTPS URL (e.g., `https://github.com/yourusername/your-repo.git`)

### Step 2: Initialize Git and Connect
```bash
cd /Users/sk/Desktop/Cursor1/stock-watch-clean
git init
git add .
git commit -m "Add working stock API integration with real data"
git branch -M main
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

**Note:** If you already have files in your GitHub repo, you might need to pull first:
```bash
git pull origin main --allow-unrelated-histories
```

## Option 2: Create a New Repository

### Step 1: Create Repository on GitHub
1. Go to https://github.com/new
2. Repository name: `stock-watch-website` (or your choice)
3. Make it **Public** or **Private**
4. **Don't** initialize with README
5. Click "Create repository"

### Step 2: Push Your Files
```bash
cd /Users/sk/Desktop/Cursor1/stock-watch-clean
git init
git add .
git commit -m "Initial commit: Stock Watch Website with working API"
git branch -M main
git remote add origin https://github.com/yourusername/stock-watch-website.git
git push -u origin main
```

## Option 3: Update Existing Repository (If Files Are Already There)

If your repository already exists and has files:

### Step 1: Clone Your Repository
```bash
cd /Users/sk/Desktop/Cursor1
git clone https://github.com/yourusername/your-repo.git
cd your-repo
```

### Step 2: Copy Updated Files
```bash
cp ../stock-watch-clean/app.js .
cp ../stock-watch-clean/index.html .
cp ../stock-watch-clean/styles.css .
# Copy any other updated files
```

### Step 3: Commit and Push
```bash
git add .
git commit -m "Update with working stock API"
git push origin main
```

## Quick Commands Summary

**If starting fresh:**
```bash
cd /Users/sk/Desktop/Cursor1/stock-watch-clean
git init
git add .
git commit -m "Stock Watch Website with working API"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

**If updating existing:**
```bash
cd /Users/sk/Desktop/Cursor1/stock-watch-clean
git init
git add .
git commit -m "Update with working API"
git remote add origin YOUR_GITHUB_REPO_URL
git pull origin main --allow-unrelated-histories  # If needed
git push -u origin main
```

## After Pushing

1. Vercel will automatically detect the push and redeploy
2. Wait 1-2 minutes
3. Your site will have the working API!

## Need Help?

If you get errors:
- "remote origin already exists" → Use: `git remote set-url origin YOUR_URL`
- "fatal: refusing to merge unrelated histories" → Use: `git pull origin main --allow-unrelated-histories`
- Authentication issues → Make sure you're logged into GitHub

