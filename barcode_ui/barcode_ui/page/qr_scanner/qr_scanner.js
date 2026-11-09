frappe.pages['qr-scanner'].on_page_load = function(wrapper) {
    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __('Instant Redirect Scanner'),
        single_column: true
    });

    let current_scanner = null;

    const start_scan = () => {
        // Destroy previous instance if exists
        if (current_scanner) {
            try {
                current_scanner.stop();
            } catch(e) {}
        }

        current_scanner = new frappe.ui.Scanner({
            dialog: true,
            multiple: false, // Stop after first scan
            constraints: {
                facingMode: "environment" // Prefer back camera on mobile
            },
            on_scan: (data) => {
                if (!data || !data.decodedText) return;
                
                let scanned_text = data.decodedText.trim();
                console.log("Scanned:", scanned_text);
                
                // Better URL validation
                if (isValidUrl(scanned_text)) {
                    // Success feedback
                    frappe.show_alert({
                        message: __('Valid URL detected! Redirecting...'), 
                        indicator: 'green'
                    }, 3);
                    
                    // Optional: Play beep sound
                    playBeep();
                    
                    // Close scanner dialog properly
                    closeScannerDialog();
                    
                    // Small delay so user sees the success message
                    setTimeout(() => {
                        // Option 1: Same tab (current behavior)
                        window.location.href = scanned_text;
                        
                        // Option 2: New tab (uncomment below line if preferred)
                        // window.open(scanned_text, '_blank');
                    }, 800);
                } else {
                    // Not a URL - show error but don't close dialog
                    frappe.show_alert({
                        message: __('Not a valid URL: ') + frappe.ellipsis(scanned_text, 50), 
                        indicator: 'orange'
                    }, 5);
                    
                    // Optional: Vibrate on error (mobile)
                    if (navigator.vibrate) navigator.vibrate(200);
                }
            },
            on_error: (error) => {
                // Handle permission denied or camera errors
                if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    frappe.msgprint({
                        title: __('Camera Access Denied'),
                        message: __('Please allow camera access in your browser settings to use the scanner.'),
                        indicator: 'red'
                    });
                    closeScannerDialog();
                }
            }
        });
    };

    // Helper: Proper URL validation
    function isValidUrl(string) {
        try {
            // Check if it starts with http/https/ftp or is a valid relative URL
            if (!/^https?:\/\//i.test(string)) {
                // If no protocol, assume https but also allow internal frappe routes
                if (string.startsWith('/app/') || string.startsWith('/desk#')) {
                    return true; // Internal ERPNext route
                }
                // Try adding https:// to check if it's a valid URL
                new URL('https://' + string);
            } else {
                new URL(string);
            }
            return true;
        } catch (_) {
            return false;
        }
    }

    // Helper: Close dialog safely
    function closeScannerDialog() {
        // Find the scanner modal and close it
        let $modal = $('.modal:has(.barcode-scanner)').last();
        if ($modal.length) {
            $modal.modal('hide');
        }
        // Also try standard dialog close methods
        if (cur_dialog && cur_dialog.hide) {
            cur_dialog.hide();
        }
    }

    // Helper: Audio feedback
    function playBeep() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 1200;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch(e) {
            // Audio not critical, ignore errors
        }
    }

    // Add custom content to page
    $(page.body).append(`
        <div class="scanner-intro text-center" style="padding: 50px 20px;">
            <div class="icon-container mb-4">
                <i class="fa fa-qrcode fa-4x text-muted"></i>
            </div>
            <h3 class="text-muted">${__('Ready to Scan')}</h3>
            <p class="text-muted lead">${__('Point your camera at a QR code to redirect instantly')}</p>
            <div class="mt-4">
                <button class="btn btn-primary btn-lg start-scan-btn">
                    <i class="fa fa-camera mr-2"></i> ${__('Open Scanner')}
                </button>
            </div>
            <div class="mt-4 text-muted small">
                <p>${__('Auto-scan enabled')} • ${__('HTTPS required')} • ${__('Camera permission needed')}</p>
            </div>
        </div>
    `);

    // Bind click to manual button
    $(page.body).find('.start-scan-btn').on('click', start_scan);

    // Set primary action in header
    page.set_primary_action(__('New Scan'), () => start_scan(), 'fa fa-camera');

    // Auto-start after short delay to allow page render
    setTimeout(() => {
        // Check if we're on mobile - auto-start is better there
        if (frappe.is_mobile()) {
            start_scan();
        }
    }, 500);
};
