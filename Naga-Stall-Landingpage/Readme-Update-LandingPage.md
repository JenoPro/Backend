# Naga Stall Management System

A comprehensive stall management and public landing page system for managing rental spaces across multiple branches.

## Project Structure

```
Backend/
├── Naga-Stall-Management/          # Admin management system (protected)
├── Naga-Stall-Landingpage/         # Public landing page (no auth required)
├── server.js                       # Main server configuration
└── README.md
```

## Features

### Public Landing Page Features
- **Area Browsing**: View all available areas (Legazpi, Manila, Naga City)
- **Location Discovery**: Browse branches/locations within each area
- **Stall Listings**: View available stalls with detailed information
- **Filtering & Search**: Filter stalls by area, location, and other criteria
- **Real-time Data**: Live data from the management system database

### Management System Features
- **Secure Admin Access**: Authentication required for all management operations
- **Stall Management**: Create, update, and manage stall information
- **Branch Management**: Manage multiple branches and locations
- **User Management**: Handle staff and customer accounts
- **Reporting & Analytics**: Generate reports and track performance

## API Endpoints

### Public Endpoints (No Authentication Required)
| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/api/stalls/areas` | GET | Get all available areas | None |
| `/api/stalls/locations` | GET | Get locations by area | `?area=AreaName` |
| `/api/stalls/by-area` | GET | Get stalls in specific area | `?area=AreaName` |
| `/api/stalls/filter` | GET | Get filtered stalls | `?area=X&sortBy=Y` |

### Protected Endpoints (Authentication Required)
| Endpoint | Method | Description | Access Level |
|----------|--------|-------------|--------------|
| `/api/stalls/*` | All | Management system routes | Admin/Staff |
| `/api/auth/*` | All | Authentication routes | Public |
| `/api/users/*` | All | User management | Admin |

## Recent Fixes & Updates

### Problem Resolved
The landing page was experiencing **401 Unauthorized** errors when trying to access stall data, preventing public users from browsing available stalls.

### Root Causes Fixed

#### 1. **Authentication Issues**
- **Problem**: Public endpoints were being caught by protected route middleware
- **Solution**: Added dedicated public endpoints before protected routes in `server.js`

#### 2. **Database Query Issues**
- **Problem**: Multiple SQL queries contained errors due to database structure mismatches
- **Solution**: Fixed 5 controller files with corrected SQL queries

### Technical Changes Made

#### **Server Configuration (server.js)**
```javascript
// Added public endpoints BEFORE protected routes
app.get('/api/stalls/areas', getAvailableAreas);
app.get('/api/stalls/locations', getLocationsByArea);
app.get('/api/stalls/by-area', getStallsByArea);
app.get('/api/stalls/filter', getFilteredStalls);

// Protected routes (require authentication)
app.use('/api/stalls', stallRoutes);
```

#### **Database Query Fixes**
Fixed issues in 5 landing page controller files:

**Issues Resolved:**
- **Non-existent column**: Removed references to `section_code` (doesn't exist in database)
- **Wrong table references**: Changed `bm.area, bm.location` to `b.area, b.location`
- **Incorrect JOINs**: Fixed relationship between floor, branch, and branch_manager tables
- **Missing data**: Changed `INNER JOIN` to `LEFT JOIN` for optional branch managers

**Files Updated:**
- `getStallsByArea.js`
- `getStallsByLocation.js`
- `getStallById.js`
- `getFilteredStalls.js`
- `getAllStalls.js`

## Current Data Status

### Available Areas & Stalls
| Area | Locations | Available Stalls | Status |
|------|-----------|------------------|---------|
| **Legazpi** | SM Legazpi Branch | 11 stalls | Active |
| **Naga City** | Peoples Mall, Satellite Market | 15 stalls | Active |
| **Manila** | Robinson Branch | 0 stalls | No stalls created |

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL/MariaDB
- npm or yarn

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   ```bash
   # Import the provided SQL file
   mysql -u root -p naga_stall < naga_stall.sql
   ```

4. **Environment Configuration**
   ```bash
   # Create .env file with your database credentials
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=naga_stall
   PORT=3001
   ```

5. **Start the server**
   ```bash
   npm start
   ```

## Testing the APIs

### Test Public Endpoints
```bash
# Get all areas
curl http://localhost:3001/api/stalls/areas

# Get locations in Legazpi
curl http://localhost:3001/api/stalls/locations?area=Legazpi

# Get stalls in Naga City
curl http://localhost:3001/api/stalls/by-area?area=Naga%20City

# Filter stalls
curl http://localhost:3001/api/stalls/filter?area=Legazpi&sortBy=default
```

## Architecture

### Route Precedence (Important!)
Routes are processed in order, so public endpoints must come BEFORE protected routes:

```javascript
// CORRECT ORDER:
app.get('/api/stalls/areas', publicEndpoint);      // Processed first
app.use('/api/stalls', protectedRoutes);           // Processed second

// WRONG ORDER:
app.use('/api/stalls', protectedRoutes);           // Catches everything!
app.get('/api/stalls/areas', publicEndpoint);      // Never reached
```

## Security

- **Public Routes**: Landing page endpoints require no authentication
- **Protected Routes**: Management system requires valid JWT tokens
- **Data Validation**: All inputs validated and sanitized
- **SQL Injection Protection**: Prepared statements used throughout

## Future Enhancements

### Planned Features
- [ ] Add stalls to Manila/Robinson branch
- [ ] Real-time availability updates
- [ ] Advanced filtering options
- [ ] Mobile app API endpoints
- [ ] Email notifications
- [ ] Payment integration

## Troubleshooting

### Common Issues

**1. 401 Unauthorized on landing page**
- **Cause**: Public endpoints not properly configured
- **Solution**: Ensure public routes come before protected routes in `server.js`

**2. 500 Internal Server Error**
- **Cause**: Database query errors or missing columns
- **Solution**: Check SQL queries match actual database structure

**3. Empty results for certain areas**
- **Cause**: No stalls created for that area in database
- **Solution**: Add floors, sections, and stalls via management system

## Database Schema

### Key Tables
- **`branch`**: Stores area and location information
- **`floor`**: Floors within each branch
- **`section`**: Sections within each floor
- **`stall`**: Individual rental stalls
- **`branch_manager`**: Manager assignments (optional)

### Important Relationships
```sql
branch (1) -> (many) floor
floor (1) -> (many) section  
section (1) -> (many) stall
branch (1) -> (0..1) branch_manager
```

## Support

For technical issues or questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review the API documentation

---

**Last Updated**: September 29, 2025  
**Version**: 1.0.0  
**Status**: Production Ready