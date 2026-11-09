frappe.ui.form.on('Stock Entry', {

    // Scan barcode function
    scan_barcode: function(frm) {
        // Only execute for Material Transfer
        if (frm.doc.purpose !== 'Material Transfer') {
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
            if (row.item_code || row.qty || row.custom_purchase_receipt) {
                has_real_data = true;
                if (row.custom_purchase_receipt && !loaded_prs.includes(row.custom_purchase_receipt)) {
                    loaded_prs.push(row.custom_purchase_receipt);
                }
            }
        });

        // Check for duplicates (PR only)
        let existing_pr = loaded_prs.some(pr => pr === barcode);
        if (existing_pr) {
            frappe.msgprint(__('Purchase Receipt {0} is already loaded in this Stock Entry', [barcode]));
            frm.set_value('scan_barcode', '');
            return;
        }

        frappe.show_alert({
            message: __('Fetching data...'),
            indicator: 'blue'
        });

        // Step 1: Try to fetch as Purchase Receipt
        frappe.call({
            method: 'barcode_ui.api.stock_entry_api.fetch_pr_items_for_transfer',
            args: {
                purchase_receipt: barcode,
                loaded_prs: loaded_prs.join(',')
            },
            callback: function(r) {
                if (r.message && r.message.items && r.message.items.length > 0) {
                    // It's a Purchase Receipt — process normally
                    processItems(frm, r.message, has_real_data, barcode, 'PR');
                } else {
                    // Step 2: Not a PR — try to fetch as a normal Item
                    fetchItemByBarcode(frm, barcode, has_real_data);
                }
            },
            error: function() {
                // Step 2 fallback on error too
                fetchItemByBarcode(frm, barcode, has_real_data);
            }
        });
    }
});

// Fetch a normal item by barcode/item code
function fetchItemByBarcode(frm, barcode, has_real_data) {
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Item',
            filters: [
                ['barcode', '=', barcode],
                ['disabled', '=', 0]
            ],
            fields: ['name as item_code', 'item_name', 'description', 'stock_uom']
        },
        callback: function(r) {
            let items = r.message || [];

            // If no match by barcode, try by item_code
            if (items.length === 0) {
                frappe.call({
                    method: 'frappe.client.get',
                    args: {
                        doctype: 'Item',
                        name: barcode
                    },
                    callback: function(r2) {
                        if (r2.message) {
                            let item = r2.message;
                            addItemRow(frm, {
                                item_code: item.name,
                                item_name: item.item_name,
                                description: item.description,
                                qty: 1,
                                uom: item.stock_uom,
                                stock_uom: item.stock_uom,
                                conversion_factor: 1,
                                custom_supplier: '',
                                custom_purchase_receipt: ''
                            }, has_real_data, barcode, 'Item');
                        } else {
                            frappe.msgprint(__('No Purchase Receipt or Item found for barcode: {0}', [barcode]));
                            frm.set_value('scan_barcode', '');
                        }
                    },
                    error: function() {
                        frappe.msgprint(__('No Purchase Receipt or Item found for barcode: {0}', [barcode]));
                        frm.set_value('scan_barcode', '');
                    }
                });
                return;
            }

            // Found by barcode
            let item = items[0];
            addItemRow(frm, {
                item_code: item.item_code,
                item_name: item.item_name,
                description: item.description,
                qty: 1,
                uom: item.stock_uom,
                stock_uom: item.stock_uom,
                conversion_factor: 1,
                custom_supplier: '',
                custom_purchase_receipt: ''
            }, has_real_data, barcode, 'Item');
        },
        error: function() {
            frappe.msgprint(__('Error fetching item for barcode: {0}', [barcode]));
            frm.set_value('scan_barcode', '');
        }
    });
}

// Process PR items
function processItems(frm, data, has_real_data, barcode, source) {
    if (!has_real_data) {
        frm.doc.items = [];
    }

    let start_idx = (frm.doc.items || []).length;

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

        // Set warehouse fields for each new row
        row.s_warehouse = 'مخزن السن بالمصنع - C';
        row.t_warehouse = 'مخزن السن بالمكتب - C';

        row.idx = start_idx + index + 1;
    });

    frm.refresh_field('items');
    frm.set_value('scan_barcode', '');

    let action = has_real_data ? 'Appended' : 'Loaded';
    let label = source === 'PR' ? data.purchase_receipt : barcode;
    frappe.show_alert({
        message: __('{0} {1} items from {2} (Total rows: {3})',
            [action, data.items.length, label, frm.doc.items.length]),
        indicator: 'green'
    });
}

// Add a single item row (for normal items)
function addItemRow(frm, item, has_real_data, barcode, source) {
    if (!has_real_data) {
        frm.doc.items = [];
    }

    let start_idx = (frm.doc.items || []).length;
    let row = frm.add_child('items');

    row.item_code = item.item_code;
    row.item_name = item.item_name;
    row.description = item.description;
    row.qty = item.qty;
    row.uom = item.uom;
    row.stock_uom = item.stock_uom;
    row.conversion_factor = item.conversion_factor;
    row.custom_supplier = item.custom_supplier || '';
    row.custom_purchase_receipt = item.custom_purchase_receipt || '';

    // Set warehouse fields for each new row
    row.s_warehouse = 'مخزن السن بالمصنع - C';
    row.t_warehouse = 'مخزن السن بالمكتب - C';

    row.idx = start_idx + 1;

    frm.refresh_field('items');
    frm.set_value('scan_barcode', '');

    let action = has_real_data ? 'Appended' : 'Loaded';
    frappe.show_alert({
        message: __('{0} item {1} (Total rows: {2})',
            [action, item.item_code, frm.doc.items.length]),
        indicator: 'green'
    });
}
