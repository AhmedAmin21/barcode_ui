
/**
 * Sales Invoice custom script to integrate the Custom Barcode Scanner.
 */
frappe.ui.form.on('Sales Invoice', {
    refresh: function(frm) {
        console.log("BarcodeUI: Refresh event triggered for Sales Invoice");
        
        // Use a clean polling mechanism to handle initialization of the base controller
        const checkScannerInterval = setInterval(() => {
            // Target frm.cscript as that is where TransactionController's barcode_scanner resides
            if (frm.cscript && frm.cscript.barcode_scanner && typeof barcode_ui !== 'undefined') {
                console.log("BarcodeUI: Base scanner and Custom class detected. Injecting now...");
                
                frm.cscript.barcode_scanner = new barcode_ui.CustomBarcodeScanner({
                    frm: frm,
                    scan_field_name: "scan_barcode",
                    items_table_name: "items"
                });
                
                console.log("BarcodeUI: CustomBarcodeScanner successfully injected.");
                clearInterval(checkScannerInterval);
            }
        }, 200);

        // Stop polling after 10 seconds to prevent infinite loop
        setTimeout(() => {
            clearInterval(checkScannerInterval);
        }, 10000);
    }
});
