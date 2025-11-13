# Bitmap Pixelator - Local Setup Guide

## Quick Start

### 1. Pull Latest Changes
```bash
cd ~/Desktop/bitmap
git fetch origin
git reset --hard origin/claude/bitmap-pixelator-app-011CV5srh1S7huqbYNngdCC3
```

### 2. Create Environment Files

**Backend:**
```bash
cd backend
cp .env.example .env
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
```

### 3. Install Dependencies (if needed)

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 4. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
✅ Should see: `Server running on port 5001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
✅ Should see: `Local: http://localhost:5173`

### 5. Test the Application

1. Open browser to **http://localhost:5173**
2. Open browser console (F12) to see debug logs
3. Upload an image
4. Watch console for:
   - `🔗 API Client initialized with URL: http://localhost:5001/api`
   - `📤 API: Converting image:` (when uploading)
   - `📥 API response received:` (when successful)

## Debugging

### Check Backend is Running
```bash
curl http://localhost:5001/api/auth/me
```
Should return: `{"message":"Authentication required"}` (this is normal)

### Check Frontend Environment
Open browser console and check:
```javascript
console.log(import.meta.env.VITE_API_URL)
```
Should show: `http://localhost:5001/api`

### Check Backend Logs
Watch the backend terminal for:
- `Processing conversion` - when image is being processed
- `Image processed in XXXms` - when complete
- Any error messages

### Common Issues

**Issue: Preview/download not working**
- Check browser console for error messages
- Verify backend is running on port 5001
- Check backend terminal for errors
- Look for `❌` emoji in console logs

**Issue: "Network Error"**
- Backend not running
- Wrong port (should be 5001)
- CORS issue (check backend logs)

**Issue: "Authentication required"**
- This is OK - auth is optional
- Conversion should still work

**Issue: Dithering not visible**
- Make sure preview is loading (not showing "Generating preview...")
- Try changing dithering method and wait 500ms
- Check console for successful preview generation

## Port Configuration

- **Backend:** http://localhost:5001
- **Frontend:** http://localhost:5173
- **Database:** Neon PostgreSQL (cloud)

## Features to Test

### B&W Mode:
1. Upload an image
2. Change dithering method (Floyd-Steinberg, Bayer 8×8, etc.)
3. See different patterns in preview
4. Adjust threshold slider
5. Click "Convert to PNG" and download

### Color Mode:
1. Switch to Color mode
2. Set palette size to 4-8 colors
3. Change dithering method
4. Adjust blur slider (0-10)
5. See color quantization in preview
6. Click "Convert to PNG" and download

## Console Logs Reference

| Emoji | Meaning |
|-------|---------|
| 🔗 | API client initialized |
| 📤 | Sending request to backend |
| 📥 | Received response from backend |
| ✅ | Success |
| ⚠️ | Warning |
| ❌ | Error |
| 🎨 | Preview generation |

## Need Help?

Check the console logs and look for error messages. The detailed logging will help identify where the issue is:

1. Frontend not connecting? Look for 🔗 and 📤 logs
2. Backend not responding? Check backend terminal
3. Preview not showing? Look for ✅ or ❌ after preview generation
4. Download failing? Check for error in handleConvert function
