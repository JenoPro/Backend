# Mobile App Connection Troubleshooting Guide

## Current Status
✅ Backend server is running on port 3001
✅ Server is configured to bind to all interfaces (0.0.0.0)
✅ Mobile endpoints are properly configured
✅ Test credentials are set up: username "25-23471", password "test123"

## The Issue
Your mobile app is getting "Network request failed" when trying to connect to http://192.168.8.38:3001

## Solutions to Try

### 1. Windows Firewall Configuration
```powershell
# Run these commands in PowerShell as Administrator

# Allow Node.js through Windows Firewall
New-NetFirewallRule -DisplayName "Node.js Server" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow

# Alternative: Add specific rule for your Node.js executable
New-NetFirewallRule -DisplayName "Node.js App" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow
```

### 2. Check Your Computer's IP Address
```bash
# Run this in command prompt to verify your current IP
ipconfig | findstr IPv4
```

### 3. Test Network Connectivity

#### From Your Computer (should work):
```bash
curl http://localhost:3001/api/health
curl http://127.0.0.1:3001/api/health
```

#### From Your Mobile Device Network (test this):
```bash
curl http://192.168.8.38:3001/api/health
```

### 4. Alternative IP Configuration
If 192.168.8.38 doesn't work, try these steps:

1. **Get your current IP address:**
   ```cmd
   ipconfig
   ```
   Look for "Wireless LAN adapter Wi-Fi" or "Ethernet adapter" IPv4 Address

2. **Update your mobile app config:**
   ```javascript
   // In networkConfig.js, update BASE_URL to your actual IP
   BASE_URL: 'http://YOUR_ACTUAL_IP:3001'
   ```

### 5. Test from Mobile Device
Try opening this URL in your mobile device's web browser:
```
http://192.168.8.38:3001/api/health
```

If it works in the browser, the mobile app should work too.

### 6. Network Requirements
- ✅ Both devices on same Wi-Fi network
- ✅ Computer's firewall allows Node.js
- ✅ Router doesn't block device-to-device communication
- ✅ Mobile device can reach computer's IP

## Quick Test Commands

### Test 1: Local connectivity
```bash
node test-health.js
```

### Test 2: Mobile login
```bash
node test-mobile-login.js
```

### Test 3: Manual firewall rule
```powershell
# Run as Administrator
netsh advfirewall firewall add rule name="Node.js Server Port 3001" dir=in action=allow protocol=TCP localport=3001
```

## Your Current Test Credentials
```
Username: 25-23471
Password: test123
Endpoint: POST http://192.168.8.38:3001/api/mobile/mobile-login
```

## Next Steps
1. Run the firewall commands above
2. Verify your computer's current IP address
3. Test the health endpoint from your mobile browser
4. Try the mobile app login again

The backend is fully functional - this is just a network connectivity issue!