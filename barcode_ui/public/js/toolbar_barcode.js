frappe.ready(() => {
    // Prevent adding multiple times
    if (window.__barcode_added) return;

    // Add a new dropdown button in the top toolbar
    frappe.ui.toolbar.add_dropdown_button("Scan Barcode", () => {
        frappe.prompt(
            [
                {
                    fieldname: "barcode",
                    fieldtype: "Data",
                    label: "Scan Barcode",
                    reqd: 1
                }
            ],
            (values) => {
                // values.barcode contains the scanned code
                frappe.show_alert({
                    message: "Scanned: " + values.barcode,
                    indicator: "green"
                });
            },
            "Scan Barcode" // title of prompt
        );
    });

    window.__barcode_added = true;
});
