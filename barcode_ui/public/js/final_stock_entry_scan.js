// barcode_ui/public/js/stock_entry.js

frappe.ui.form.on("Stock Entry", {

    scan_barcode: function(frm) {

        // Only for Material Transfer
        if (frm.doc.stock_entry_type !== "Material Transfer") return;

        var scanned = (frm.doc.scan_barcode || "").trim();
        if (!scanned) return;

        // ── Extract doc name from plain name or full URL ──────────────────────
        // Handles: "MAT-PRE-2026-00109"
        //      or: "https://site.com/app/purchase-receipt/MAT-PRE-2026-00109"
        var pr_name = scanned.includes("/")
            ? scanned.split("/").filter(Boolean).pop()
            : scanned;

        // Only handle Purchase Receipt barcodes — item barcodes fall through
        if (!pr_name.startsWith("MAT-PRE-")) return;

        // Clear scan field immediately so ERPNext doesn't treat it as an item barcode
        frappe.model.set_value(frm.doctype, frm.docname, "scan_barcode", "");

        frappe.call({
            method: "barcode_ui.api.stock_entry.get_purchase_receipt_data",
            args: { purchase_receipt: pr_name },
            freeze: true,
            freeze_message: __("جارٍ تحميل إذن الاستلام..."),
            callback: function(r) {

                if (!r.message) {
                    frappe.show_alert({
                        message: __("Purchase Receipt not found or not submitted: {0}", [pr_name]),
                        indicator: "red"
                    });
                    return;
                }

                var data = r.message;

                if (!data.items || data.items.length === 0) {
                    frappe.show_alert({
                        message: __("No items in {0}", [pr_name]),
                        indicator: "orange"
                    });
                    return;
                }

                // ── Fix: remove the empty row ERPNext auto-adds on form load ──
                // It adds a blank row with no item_code — delete it before appending
                var existing = frm.doc.items || [];
                existing.forEach(function(row) {
                    if (!row.item_code) {
                        frappe.model.clear_doc("Stock Entry Detail", row.name);
                    }
                });

                // ── Append PR items ───────────────────────────────────────────
                // s_warehouse is hardcoded as requested — not taken from PR
                var target_warehouse = "مخزن السن بالمصنع - C";

                data.items.forEach(function(item) {
                    var row = frappe.model.add_child(frm.doc, "Stock Entry Detail", "items");
                    row.item_code         = item.item_code;
                    row.item_name         = item.item_name;
                    row.qty               = item.qty;
                    row.uom               = item.uom;
                    row.conversion_factor = item.conversion_factor;
                    row.basic_rate        = item.basic_rate;
                    row.s_warehouse       = target_warehouse;
                    row.custom_supplier   = data.supplier;
                });

                frm.refresh_field("items");

                frappe.show_alert({
                    message: __("✓ {0} items added from {1}", [data.items.length, pr_name]),
                    indicator: "green"
                });
            }
        });
    }
});
