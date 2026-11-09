frappe.ui.form.on('Stock Entry', {
    scan_barcode: function(frm) {
        // Only execute for Material Transfer
        if (frm.doc.stock_entry_type !== 'Material Transfer') {
            return;
        }

        let barcode = frm.doc.scan_barcode;
        if (!barcode) return;

        // Clean the barcode value
        barcode = barcode.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, '');

        // Get list of already loaded PRs from existing items
        let loaded_prs = [];
        let has_real_data = false;

        (frm.doc.items || []).forEach(row => {
            // Check if row has actual data (not just empty default row)
            if (row.item_code || row.qty || row.custom_purchase_receipt) {
                has_real_data = true;
                if (row.custom_purchase_receipt && !loaded_prs.includes(row.custom_purchase_receipt)) {
                    loaded_prs.push(row.custom_purchase_receipt);
                }
            }
        });

        // Check for duplicates
        let existing_pr = loaded_prs.some(pr => pr === barcode);
        if (existing_pr) {
            frappe.msgprint(__('Purchase Receipt {0} is already loaded in this Stock Entry', [barcode]));
            frm.set_value('scan_barcode', '');
            return;
        }

        // Show loading
        frappe.show_alert({
            message: __('Fetching Purchase Receipt...'),
            indicator: 'blue'
        });

        // Call API with loaded PRs list
        frappe.call({
            method: 'barcode_ui.api.stock_entry_api.fetch_pr_items_for_transfer',
            args: {
                purchase_receipt: barcode,
                loaded_prs: loaded_prs.join(',')
            },
            callback: function(r) {
                if (r.exc) {
                    frm.set_value('scan_barcode', '');
                    return;
                }

                if (!r.message || !r.message.items) {
                    frappe.msgprint(__('No items found in Purchase Receipt'));
                    frm.set_value('scan_barcode', '');
                    return;
                }

                let data = r.message;

                // If table is empty or only has blank rows, clear it first
                // Otherwise append to existing data
                if (!has_real_data) {
                    frm.doc.items = []; // Clear empty default row
                }

                let start_idx = (frm.doc.items || []).length;

                // Add/append items
                data.items.forEach(function(item, index) {
                    let row = frm.add_child('items');
                    row.item_code = item.item_code;
                    row.item_name = item.item_name;
                    row.description = item.description;
                    row.qty = item.qty;
                    row.uom = item.uom;
                    row.stock_uom = item.stock_uom;
                    row.conversion_factor = item.conversion_factor;
                    row.custom_supplier = item.custom_supplier;
                    row.custom_purchase_receipt = item.custom_purchase_receipt;
                    row.idx = start_idx + index + 1;
                });

                frm.refresh_field('items');
                frm.set_value('scan_barcode', '');

                let action = has_real_data ? 'Appended' : 'Loaded';
                frappe.show_alert({
                    message: __('{0} {1} items from {2} (Total rows: {3})',
                        [action, data.items.length, data.purchase_receipt, frm.doc.items.length]),
                    indicator: 'green'
                });
            },
            error: function(err) {
                let message = err.message || 'Error fetching Purchase Receipt';
                frappe.msgprint(__(message));
                frm.set_value('scan_barcode', '');
            }
        });
    }
});
