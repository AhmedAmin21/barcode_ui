frappe.ui.form.on("Stock Entry", {

    // ============================================
    // EXISTING: Barcode Scanning for Purchase Receipt
    // ============================================
    scan_barcode: function(frm) {

        if (frm.doc.stock_entry_type !== "Material Transfer") return;

        var scanned = (frm.doc.scan_barcode || "").trim();
        if (!scanned) return;

        var pr_name = scanned.includes("/")
            ? scanned.split("/").filter(Boolean).pop()
            : scanned;

        if (!pr_name.startsWith("MAT-PRE-")) return;

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

                // Remove empty rows ERPNext auto-adds on form load
                (frm.doc.items || []).forEach(function(row) {
                    if (!row.item_code) {
                        frappe.model.clear_doc("Stock Entry Detail", row.name);
                    }
                });

                data.items.forEach(function(item) {
                    var row = frappe.model.add_child(frm.doc, "Stock Entry Detail", "items");
                    row.item_code              = item.item_code;
                    row.item_name              = item.item_name;
                    row.qty                    = item.qty;
                    row.transfer_qty           = item.qty * (item.conversion_factor || 1);
                    row.uom                    = item.uom;
                    row.conversion_factor      = item.conversion_factor;
                    row.basic_rate             = item.basic_rate;
                    row.s_warehouse            = "مخزن السن بالمصنع - C";
                    row.t_warehouse            = "مخزن السن بالمكتب - C";
                    row.custom_supplier        = data.supplier;
                    row.custom_purchase_receipt = pr_name;
                });

                frm.refresh_field("items");

                frappe.show_alert({
                    message: __("✓ {0} items added from {1}", [data.items.length, pr_name]),
                    indicator: "green"
                });
            }
        });
    },

    // ============================================
    // NEW: Create Button with Dropdown (Primary Style, LEFT)
    // ============================================
    refresh: function(frm) {
        // Only show for submitted (docstatus == 1) outgoing stock entries
        if (frm.doc.docstatus == 1 && 
            ['Material Issue', 'Material Transfer', 'Material Transfer for Manufacture', 'Send to Subcontractor']
            .includes(frm.doc.purpose)) {

            add_create_dropdown_button(frm);
        }
    }
});

// ============================================
// CREATE DROPDOWN BUTTON (Primary Style, FIRST LEFT)
// ============================================

function add_create_dropdown_button(frm) {
    // Remove existing to prevent duplicates on refresh
    frm.page.remove_inner_button(__('Create'));
    $('#create-dropdown-group').remove();

    // Add standalone dropdown button with PRIMARY style
    const dropdown_button = $(`
        <div class="btn-group" id="create-dropdown-group" style="margin-right: 5px;">
            <button type="button" class="btn btn-primary dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                <span class="hidden-xs">${__('Create')}</span>
                <span class="visible-xs">${__('Create')}</span>
                <span class="caret"></span>
            </button>
            <ul class="dropdown-menu" role="menu" style="min-width: 180px;">
                <li><a class="dropdown-item" data-action="delivery_note" style="padding: 8px 15px; cursor: pointer;">
                    <i class="fa fa-truck" style="margin-right: 8px;"></i>${__('Delivery Note')}
                </a></li>
                <li class="divider"></li>
                <li><a class="dropdown-item" data-action="sales_invoice" style="padding: 8px 15px; cursor: pointer;">
                    <i class="fa fa-file-text-o" style="margin-right: 8px;"></i>${__('Sales Invoice')}
                </a></li>
            </ul>
        </div>
    `);

    // INSERT AS FIRST BUTTON (leftmost)
    const $page_actions = frm.page.wrapper.find('.page-actions');
    const $first_btn_group = $page_actions.find('.btn-group').first();

    if ($first_btn_group.length) {
        $first_btn_group.before(dropdown_button);
    } else {
        $page_actions.prepend(dropdown_button);
    }

    // Handle dropdown item clicks
    dropdown_button.find('.dropdown-item').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const action = $(this).data('action');
        dropdown_button.find('.dropdown-toggle').dropdown('toggle');

        if (action === 'delivery_note') {
            create_delivery_note_dialog(frm);
        } else if (action === 'sales_invoice') {
            create_sales_invoice_dialog(frm);
        }
    });
}

// ============================================
// DELIVERY NOTE DIALOG (with Qty Control)
// ============================================

function create_delivery_note_dialog(frm) {
    let items_data = [];
    frm.doc.items.forEach((item, idx) => {
        if (item.t_warehouse) {
            items_data.push({
                idx: idx + 1,
                item_code: item.item_code,
                item_name: item.item_name || item.item_code,
                qty: item.qty,
                max_qty: item.qty,
                t_warehouse: item.t_warehouse,
                selected: 1,
                stock_entry_detail_name: item.name
            });
        }
    });

    if (items_data.length === 0) {
        frappe.msgprint(__('No items with target warehouse found.'));
        return;
    }

    const dialog = new frappe.ui.Dialog({
        title: __('Create Delivery Note from Stock Entry'),
        size: 'large',
        fields: [
            {
                fieldtype: 'Link',
                fieldname: 'customer',
                label: __('Customer'),
                options: 'Customer',
                reqd: 1,
                get_query: function() {
                    return { filters: { disabled: 0 } };
                }
            },
            {
                fieldtype: 'Column Break',
                fieldname: 'col_break_1'
            },
            {
                fieldtype: 'Data',
                fieldname: 'stock_entry_ref',
                label: __('From Stock Entry'),
                read_only: 1,
                default: frm.doc.name
            },
            {
                fieldtype: 'Section Break',
                fieldname: 'items_section',
                label: __('Select Items & Quantities')
            },
            {
                fieldtype: 'HTML',
                fieldname: 'items_table_html',
                options: get_items_table_html(items_data)
            }
        ],
        primary_action_label: __('Create Delivery Note'),
        primary_action: function(values) {
            if (!values.customer) {
                frappe.msgprint(__('Please select a Customer'));
                return;
            }

            const selected_items = get_selected_items_with_qty(items_data, dialog);
            if (selected_items.length === 0) {
                frappe.msgprint(__('Please select at least one item'));
                return;
            }

            // Validate quantities
            for (let item of selected_items) {
                if (item.qty <= 0) {
                    frappe.msgprint(__('Quantity must be greater than 0 for item {0}', [item.item_code]));
                    return;
                }
                if (item.qty > item.max_qty) {
                    frappe.msgprint(__('Quantity cannot exceed {0} for item {1}', [item.max_qty, item.item_code]));
                    return;
                }
            }

            dialog.hide();
            frappe.show_progress(__('Creating Delivery Note'), 0, 100, __('Please wait...'));

            frappe.call({
                method: "barcode_ui.delivery_note_and_sales_invoice_from_stock_entry.stock_entry_utils.create_delivery_note_from_stock_entry",
                args: {
                    stock_entry_name: frm.doc.name,
                    customer: values.customer,
                    selected_items: JSON.stringify(selected_items)
                },
                callback: function(r) {
                    frappe.hide_progress();
                    if (r.message && r.message.success) {
                        frappe.show_alert({
                            message: __('Delivery Note {0} created', [r.message.delivery_note]),
                            indicator: 'green'
                        });
                        frappe.set_route('Form', 'Delivery Note', r.message.delivery_note);
                    } else {
                        frappe.msgprint(__('Error: {0}', [r.message?.error || 'Unknown error']));
                    }
                },
                error: function() {
                    frappe.hide_progress();
                    frappe.msgprint(__('Failed to create Delivery Note'));
                }
            });
        },
        secondary_action_label: __('Cancel'),
        secondary_action: function() {
            dialog.hide();
        }
    });

    dialog.show();
    setup_items_table_handlers(dialog, items_data);
}

// ============================================
// SALES INVOICE DIALOG (with Qty Control)
// ============================================

function create_sales_invoice_dialog(frm) {
    let items_data = [];
    frm.doc.items.forEach((item, idx) => {
        if (item.t_warehouse) {
            items_data.push({
                idx: idx + 1,
                item_code: item.item_code,
                item_name: item.item_name || item.item_code,
                qty: item.qty,
                max_qty: item.qty,
                t_warehouse: item.t_warehouse,
                selected: 1,
                stock_entry_detail_name: item.name
            });
        }
    });

    if (items_data.length === 0) {
        frappe.msgprint(__('No items with target warehouse found.'));
        return;
    }

    const dialog = new frappe.ui.Dialog({
        title: __('Create Sales Invoice from Stock Entry'),
        size: 'large',
        fields: [
            {
                fieldtype: 'Link',
                fieldname: 'customer',
                label: __('Customer'),
                options: 'Customer',
                reqd: 1,
                get_query: function() {
                    return { filters: { disabled: 0 } };
                }
            },
            {
                fieldtype: 'Column Break',
                fieldname: 'col_break_1'
            },
            {
                fieldtype: 'Data',
                fieldname: 'stock_entry_ref',
                label: __('From Stock Entry'),
                read_only: 1,
                default: frm.doc.name
            },
            {
                fieldtype: 'Section Break',
                fieldname: 'items_section',
                label: __('Select Items & Quantities')
            },
            {
                fieldtype: 'HTML',
                fieldname: 'items_table_html',
                options: get_items_table_html(items_data)
            }
        ],
        primary_action_label: __('Create Sales Invoice'),
        primary_action: function(values) {
            if (!values.customer) {
                frappe.msgprint(__('Please select a Customer'));
                return;
            }

            const selected_items = get_selected_items_with_qty(items_data, dialog);
            if (selected_items.length === 0) {
                frappe.msgprint(__('Please select at least one item'));
                return;
            }

            // Validate quantities
            for (let item of selected_items) {
                if (item.qty <= 0) {
                    frappe.msgprint(__('Quantity must be greater than 0 for item {0}', [item.item_code]));
                    return;
                }
                if (item.qty > item.max_qty) {
                    frappe.msgprint(__('Quantity cannot exceed {0} for item {1}', [item.max_qty, item.item_code]));
                    return;
                }
            }

            dialog.hide();
            frappe.show_progress(__('Creating Sales Invoice'), 0, 100, __('Please wait...'));

            frappe.call({
                method: "barcode_ui.delivery_note_and_sales_invoice_from_stock_entry.stock_entry_utils.create_sales_invoice_from_stock_entry",
                args: {
                    stock_entry_name: frm.doc.name,
                    customer: values.customer,
                    selected_items: JSON.stringify(selected_items)
                },
                callback: function(r) {
                    frappe.hide_progress();
                    if (r.message && r.message.success) {
                        frappe.show_alert({
                            message: __('Sales Invoice {0} created', [r.message.sales_invoice]),
                            indicator: 'green'
                        });
                        frappe.set_route('Form', 'Sales Invoice', r.message.sales_invoice);
                    } else {
                        frappe.msgprint(__('Error: {0}', [r.message?.error || 'Unknown error']));
                    }
                },
                error: function() {
                    frappe.hide_progress();
                    frappe.msgprint(__('Failed to create Sales Invoice'));
                }
            });
        },
        secondary_action_label: __('Cancel'),
        secondary_action: function() {
            dialog.hide();
        }
    });

    dialog.show();
    setup_items_table_handlers(dialog, items_data);
}

// ============================================
// SHARED HELPERS (with Qty Input)
// ============================================

function get_items_table_html(items_data) {
    let rows = items_data.map(item => `
        <tr data-idx="${item.idx}">
            <td style="text-align:center;"><input type="checkbox" class="item-checkbox" checked data-idx="${item.idx}"></td>
            <td>${item.item_code}</td>
            <td>${item.item_name}</td>
            <td style="text-align:center;">
                <input type="number" class="form-control item-qty" 
                       data-idx="${item.idx}" 
                       value="${item.qty}" 
                       min="0.01" 
                       max="${item.max_qty}"
                       step="0.01"
                       style="width: 80px; text-align: center; padding: 4px; height: 28px;">
            </td>
            <td style="text-align:center; color: #888;">${item.max_qty}</td>
            <td>${item.t_warehouse}</td>
        </tr>
    `).join('');

    return `
        <div style="margin-bottom:10px;">
            <label class="checkbox">
                <input type="checkbox" id="select_all_items" checked>
                <span class="label-area"><strong>${__('Select All Items')}</strong></span>
            </label>
        </div>
        <div style="max-height:350px; overflow-y:auto; border: 1px solid #d1d8dd; border-radius: 4px;">
            <table class="table table-bordered table-hover" style="margin:0;">
                <thead style="background-color: #f7fafc;">
                    <tr>
                        <th style="width:40px; text-align:center;"><input type="checkbox" id="header_checkbox" checked></th>
                        <th>${__('Item Code')}</th>
                        <th>${__('Item Name')}</th>
                        <th style="width:100px; text-align:center;">${__('Qty to Send')}</th>
                        <th style="width:80px; text-align:center;">${__('Available')}</th>
                        <th>${__('Target Warehouse')}</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: #888;">
            <i class="fa fa-info-circle"></i> ${__('You can edit the quantity for each item. Maximum is the available quantity from Stock Entry.')}
        </div>
    `;
}

function setup_items_table_handlers(dialog, items_data) {
    const $wrapper = dialog.$wrapper;

    // Select all via label checkbox
    $wrapper.find('#select_all_items').on('change', function() {
        const checked = $(this).is(':checked');
        $wrapper.find('.item-checkbox, #header_checkbox').prop('checked', checked);
    });

    // Header checkbox
    $wrapper.find('#header_checkbox').on('change', function() {
        const checked = $(this).is(':checked');
        $wrapper.find('.item-checkbox').prop('checked', checked);
        $wrapper.find('#select_all_items').prop('checked', checked);
    });

    // Individual checkboxes
    $wrapper.on('change', '.item-checkbox', function() {
        const total = $wrapper.find('.item-checkbox').length;
        const checked = $wrapper.find('.item-checkbox:checked').length;
        $wrapper.find('#header_checkbox, #select_all_items').prop('checked', total === checked);
    });

    // Quantity input validation
    $wrapper.on('input', '.item-qty', function() {
        const $input = $(this);
        const val = parseFloat($input.val());
        const max = parseFloat($input.attr('max'));

        if (val > max) {
            $input.css('border-color', '#ff5858');
        } else if (val <= 0) {
            $input.css('border-color', '#ff5858');
        } else {
            $input.css('border-color', '#d1d8dd');
        }
    });

    // Prevent negative values
    $wrapper.on('keydown', '.item-qty', function(e) {
        if (e.key === '-') {
            e.preventDefault();
        }
    });
}

function get_selected_items_with_qty(items_data, dialog) {
    const selected = [];
    dialog.$wrapper.find('.item-checkbox:checked').each(function() {
        const idx = parseInt($(this).data('idx'));
        const item = items_data.find(i => i.idx === idx);
        if (item) {
            // Get the edited quantity from the input
            const $qty_input = dialog.$wrapper.find(`.item-qty[data-idx="${idx}"]`);
            const edited_qty = parseFloat($qty_input.val()) || item.qty;

            selected.push({
                ...item,
                qty: edited_qty
            });
        }
    });
    return selected;
}
