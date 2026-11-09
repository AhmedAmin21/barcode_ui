// ============================================
// Pricing Rule - Excel-Style Filter Builder
// File: apps/barcode_ui/barcode_ui/public/js/pricing_rule_filter.js
// ============================================

frappe.ui.form.on('Pricing Rule', {
    onload: function(frm) {
        // Initialize empty filter JSON if not set
        if (!frm.doc.custom_filter_json || frm.doc.custom_filter_json === '[]') {
            frm.set_value('custom_filter_json', JSON.stringify([]));
        }
    },

    refresh: function(frm) {
        // Render the filter builder UI
        render_filter_builder(frm);
    },

    custom_apply_filter: function(frm) {
        apply_filters(frm);
    },

    custom_clear_filter: function(frm) {
        clear_filters(frm);
    }
});

// ============================================
// RENDER FILTER BUILDER UI
// ============================================
function render_filter_builder(frm) {
    setTimeout(() => {
        let wrapper = frm.fields_dict.custom_filter_html?.$wrapper;
        if (!wrapper) return;

        wrapper.empty();

        // Build the visual filter container
        let html = `
            <div class="barcode-filter-builder" style="
                border: 1px solid #d1d8dd;
                border-radius: 6px;
                padding: 14px;
                background: #ffffff;
                min-height: 50px;
            ">
                <div class="filter-rows-container" style="margin-bottom: 12px;">
                    <!-- Filter rows injected here -->
                </div>

                <div class="filter-actions" style="
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    flex-wrap: wrap;
                ">
                    <button class="btn btn-xs btn-default btn-add-filter" style="
                        color: #5e64ff;
                        border-color: #5e64ff;
                    ">
                        <i class="fa fa-plus"></i> Add a Filter
                    </button>

                    <button class="btn btn-xs btn-default btn-clear-filters">
                        <i class="fa fa-eraser"></i> Clear Filters
                    </button>

                    <button class="btn btn-xs btn-primary btn-apply-filters" style="
                        background: #5e64ff;
                        border-color: #5e64ff;
                    ">
                        <i class="fa fa-filter"></i> Apply Filters
                    </button>

                    <span class="filter-count-badge" style="
                        margin-left: auto;
                        font-size: 12px;
                        color: #8d99a6;
                        font-weight: 500;
                    "></span>
                </div>
            </div>
        `;

        wrapper.html(html);

        // Load existing filters from JSON field
        let existing_filters = [];
        try {
            existing_filters = JSON.parse(frm.doc.custom_filter_json || '[]');
        } catch(e) {
            existing_filters = [];
        }

        // Render each saved filter row
        if (existing_filters.length > 0) {
            existing_filters.forEach((filter, index) => {
                add_filter_row(wrapper, filter, index);
            });
        } else {
            // Add one empty row by default
            add_filter_row(wrapper, {}, 0);
        }

        // --- Event Bindings ---
        wrapper.find('.btn-add-filter').on('click', function() {
            let currentCount = wrapper.find('.filter-row').length;
            add_filter_row(wrapper, {}, currentCount);
            save_filters_to_field(frm, wrapper);
        });

        wrapper.find('.btn-clear-filters').on('click', function() {
            clear_filters(frm);
        });

        wrapper.find('.btn-apply-filters').on('click', function() {
            apply_filters(frm);
        });

        // Auto-save on any input change
        wrapper.on('change', 'select.filter-field, select.filter-condition, input.filter-value', function() {
            save_filters_to_field(frm, wrapper);
        });

    }, 200);
}

// ============================================
// ADD SINGLE FILTER ROW
// ============================================
function add_filter_row(wrapper, filter = {}, index) {
    let container = wrapper.find('.filter-rows-container');

    // Available Item fields for filtering
    let fieldOptions = [
        { value: 'item_group', label: 'Item Group', type: 'link' },
        { value: 'brand', label: 'Brand', type: 'link' },
        { value: 'item_name', label: 'Item Name', type: 'data' },
        { value: 'stock_uom', label: 'Stock UOM', type: 'link' },
        { value: 'is_stock_item', label: 'Is Stock Item', type: 'check' },
        { value: 'is_sales_item', label: 'Is Sales Item', type: 'check' },
        { value: 'is_purchase_item', label: 'Is Purchase Item', type: 'check' },
        { value: 'standard_rate', label: 'Standard Rate', type: 'currency' },
        { value: 'valuation_rate', label: 'Valuation Rate', type: 'currency' },
        { value: 'description', label: 'Description', type: 'text' },
        { value: 'disabled', label: 'Disabled', type: 'check' },
        { value: 'name', label: 'Item Code', type: 'data' }
    ];

    // Condition options
    let conditionOptions = [
        { value: '=', label: 'Equals' },
        { value: '!=', label: 'Not Equals' },
        { value: 'like', label: 'Like' },
        { value: 'not like', label: 'Not Like' },
        { value: 'in', label: 'In' },
        { value: 'not in', label: 'Not In' },
        { value: 'is', label: 'Is' },
        { value: '>', label: 'Greater Than' },
        { value: '<', label: 'Less Than' },
        { value: '>=', label: 'Greater Than or Equal' },
        { value: '<=', label: 'Less Than or Equal' }
    ];

    let fieldSelectHtml = fieldOptions.map(opt =>
        `<option value="${opt.value}" ${filter.field === opt.value ? 'selected' : ''} data-type="${opt.type}">${opt.label}</option>`
    ).join('');

    let conditionSelectHtml = conditionOptions.map(opt =>
        `<option value="${opt.value}" ${filter.condition === opt.value ? 'selected' : ''}>${opt.label}</option>`
    ).join('');

    let rowHtml = `
        <div class="filter-row" data-index="${index}" style="
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
        ">
            <!-- Field Selector -->
            <select class="form-control filter-field" style="
                width: 160px;
                height: 32px;
                font-size: 13px;
            ">
                <option value="">Select Field...</option>
                ${fieldSelectHtml}
            </select>

            <!-- Condition Selector -->
            <select class="form-control filter-condition" style="
                width: 140px;
                height: 32px;
                font-size: 13px;
            ">
                <option value="">Condition...</option>
                ${conditionSelectHtml}
            </select>

            <!-- Value Input -->
            <input type="text" class="form-control filter-value"
                placeholder="Enter value..."
                value="${filter.value || ''}"
                style="
                    width: 200px;
                    height: 32px;
                    font-size: 13px;
                "
            >

            <!-- Remove Button -->
            <button class="btn btn-xs btn-default btn-remove-filter" title="Remove Filter" style="
                color: #ff5858;
                border: none;
                background: transparent;
                padding: 4px 8px;
            ">
                <i class="fa fa-times"></i>
            </button>
        </div>
    `;

    container.append(rowHtml);

    // Bind remove event
    container.find(`.filter-row[data-index="${index}"] .btn-remove-filter`).on('click', function() {
        $(this).closest('.filter-row').remove();
        reindex_rows(container);
        save_filters_to_field(frm, wrapper);
    });
}

// ============================================
// REINDEX ROWS AFTER REMOVAL
// ============================================
function reindex_rows(container) {
    container.find('.filter-row').each(function(i) {
        $(this).attr('data-index', i);
    });
}

// ============================================
// GET CURRENT FILTERS FROM UI
// ============================================
function get_current_filters(wrapper) {
    let filters = [];
    wrapper.find('.filter-row').each(function() {
        let field = $(this).find('.filter-field').val();
        let condition = $(this).find('.filter-condition').val();
        let value = $(this).find('.filter-value').val().trim();

        if (field && condition && (value !== '' || condition === 'is')) {
            filters.push({ field, condition, value });
        }
    });
    return filters;
}

// ============================================
// SAVE FILTERS TO JSON FIELD
// ============================================
function save_filters_to_field(frm, wrapper) {
    let filters = get_current_filters(wrapper);
    frm.set_value('custom_filter_json', JSON.stringify(filters));
    frm.refresh_field('custom_filter_json');
}

// ============================================
// CLEAR ALL FILTERS
// ============================================
function clear_filters(frm) {
    frm.set_value('custom_filter_json', JSON.stringify([]));
    frm.refresh_field('custom_filter_json');

    // Clear the child table (items)
    frm.clear_table('items');
    frm.refresh_field('items');

    // Re-render empty builder
    render_filter_builder(frm);

    frappe.show_alert({
        message: __('Filters cleared'),
        indicator: 'green'
    });
}

// ============================================
// APPLY FILTERS & POPULATE CHILD TABLE
// ============================================
function apply_filters(frm) {
    let filters = [];
    try {
        filters = JSON.parse(frm.doc.custom_filter_json || '[]');
    } catch(e) {
        filters = [];
    }

    if (filters.length === 0) {
        frappe.msgprint(__('Please add at least one filter condition.'));
        return;
    }

    // Show loading indicator
    frappe.dom.freeze(__('Applying filters...'));

    frappe.call({
        method: 'barcode_ui.api.pricing_rule_filter.get_filtered_items',
        args: {
            filters: JSON.stringify(filters)
        },
        callback: function(r) {
            frappe.dom.unfreeze();

            if (r.exc) {
                frappe.msgprint(__('Error applying filters. Please check console.'));
                console.error(r.exc);
                return;
            }

            let items = r.message || [];

            if (items.length === 0) {
                frappe.show_alert({
                    message: __('No items match the filter conditions.'),
                    indicator: 'orange'
                });
                return;
            }

            // Clear existing child table
            frm.clear_table('items');

            // Get existing item codes to avoid duplicates
            let existingCodes = new Set();
            (frm.doc.items || []).forEach(row => {
                if (row.item_code) existingCodes.add(row.item_code);
            });

            // Populate child table with new items
            let addedCount = 0;
            let duplicateCount = 0;

            items.forEach(item => {
                if (existingCodes.has(item.name)) {
                    duplicateCount++;
                    return;
                }

                let row = frm.add_child('items');
                row.item_code = item.name;
                row.item_name = item.item_name;
                row.uom = item.stock_uom;
                // Add any other fields you need in the child table
                addedCount++;
            });

            frm.refresh_field('items');

            // Update badge
            let wrapper = frm.fields_dict.custom_filter_html?.$wrapper;
            if (wrapper) {
                wrapper.find('.filter-count-badge').text(
                    `${addedCount} item(s) added${duplicateCount > 0 ? ` (${duplicateCount} duplicates skipped)` : ''}`
                );
            }

            frappe.show_alert({
                message: __(`{0} items added to the pricing rule.`, [addedCount]),
                indicator: 'green'
            });
        },
        error: function(err) {
            frappe.dom.unfreeze();
            frappe.msgprint(__('Failed to apply filters. Please try again.'));
            console.error(err);
        }
    });
}
