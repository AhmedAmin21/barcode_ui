
/**
 * Custom Barcode Scanner for ERPNext.
 * Handles specialized barcode formats: item_code|batch_no and item_code|warehouse|batch_no.
 * This script extends the base erpnext.utils.BarcodeScanner to provide a custom
 * dialog for quantity and warehouse selection.
 */

frappe.provide('barcode_ui');

barcode_ui.CustomBarcodeScanner = class CustomBarcodeScanner extends erpnext.utils.BarcodeScanner {
    constructor(opts) {
        super(opts);
        this.custom_error_msg = __("This QR code was not found or is in an invalid format");
        console.log("BarcodeUI: CustomBarcodeScanner instance created.");
    }

    /**
     * Overrides the default process_scan to handle custom pipe-delimited barcodes.
     */
    async process_scan() {
        console.log("BarcodeUI: process_scan triggered. Input value:", this.scan_barcode_field.value);
        
        const input = this.scan_barcode_field.value;
        this.scan_barcode_field.set_value("");

        if (!input) {
            console.log("BarcodeUI: No input found, exiting.");
            return;
        }

        if (input.includes('|')) {
            console.log("BarcodeUI: Pipe character detected. Using custom parsing logic.");
            try {
                const r = await frappe.call({
                    method: 'barcode_ui.api.main.custom_scan_barcode',
                    args: { search_value: input }
                });

                if (r.message && Object.keys(r.message).length > 0) {
                    console.log("BarcodeUI: Custom API returned data:", r.message);
                    const data = r.message;
                    await this.open_custom_dialog(data);
                    this.play_success_sound();
                    return;
                }
            } catch (e) {
                console.error("BarcodeUI: Error during custom scan call:", e);
                frappe.msgprint(this.custom_error_msg);
                this.play_fail_sound();
                this.clean_up();
                return;
            }
        }

        console.log("BarcodeUI: No pipe detected or fallback triggered. Using default ERPNext scanner.");
        return super.process_scan();
    }

    /**
     * Opens a dialog for Quantity and Warehouse selection.
     */
    async open_custom_dialog(data) {
        console.log("BarcodeUI: Opening custom dialog with data:", data);
        const { item_code, batch_no, warehouse, type } = data;
        let warehouses = [];

        if (type === "with_overlay" || type === "direct") {
            console.log(`BarcodeUI: Fetching stock for Item: ${item_code}, Batch: ${batch_no}`);
            const stock_r = await frappe.call({
                method: 'barcode_ui.api.main.get_batch_stock',
                args: { item_code: item_code, batch_no: batch_no }
            });
            warehouses = stock_r.message || [];
        }

        const warehouse_options = warehouses.map(w => ({
            label: `${w.warehouse} (Available: ${w.qty})`,
            value: w.warehouse
        }));

        const dialog = new frappe.ui.Dialog({
            title: __("Confirm Item Scan"),
            fields: [
                {
                    label: __("Item"),
                    fieldname: "item_code",
                    fieldtype: "Data",
                    read_only: 1,
                    default: item_code
                },
                {
                    label: __("Batch No"),
                    fieldname: "batch_no",
                    fieldtype: "Data",
                    read_only: 1,
                    default: batch_no
                },
                {
                    label: __("Quantity"),
                    fieldname: "qty",
                    fieldtype: "Float",
                    default: ""
                },
                {
                    label: __("Warehouse"),
                    fieldname: "warehouse",
                    fieldtype: "Select",
                    options: warehouse_options.map(o => o.label),
                    default: 
                        (type === "direct" && warehouse) 
                        ? warehouse_options.find(o => o.value === warehouse)?.label 
                        : (warehouse_options.length > 0 ? warehouse_options[0].label : ""),
                }
            ],
            primary_action: async (values) => {
                console.log("BarcodeUI: Dialog submitted with values:", values);
                if (!values.qty || values.qty <= 0) {
                    frappe.throw(__("Please enter a valid quantity"));
                }
                if (!values.warehouse) {
                    frappe.throw(__("Please select a warehouse"));
                }

                const selected_wh = values.warehouse.split(" (")[0];

                await this.add_new_item_row({
                    item_code: item_code,
                    batch_no: batch_no,
                    warehouse: selected_wh,
                    qty: values.qty
                });
                
                dialog.hide();
            }
        });

        dialog.show();
    }

    /**
     * Populates the child table by adding a new row.
     */
    async add_new_item_row(row_data) {
        console.log("BarcodeUI: Adding new item row with data:", row_data);
        const { item_code, batch_no, warehouse, qty } = row_data;
        
        const grid = this.frm.fields_dict[this.items_table_name].grid;
        
        // Check if there's an empty row (no item_code) to reuse
        let row = this.frm.doc[this.items_table_name].find(d => !d.item_code);

        if (!row) {
            // Add new row if no empty row exists
            row = frappe.model.add_child(this.frm.doc, grid.doctype, this.items_table_name);
        }
        
        // Step 1: Set item_code first. This triggers get_item_details for rates, etc.
        // We only set item_code and our flag to avoid the TransactionController
        // overwriting our custom warehouse/batch with its defaults.
        await frappe.model.set_value(row.doctype, row.name, {
            "item_code": item_code,
            "use_serial_batch_fields": 1
        });

        // Step 2: Wait briefly for the item_code trigger 
        // (which fetches item defaults like warehouse) to finish processing
        await new Promise(resolve => setTimeout(resolve, 100));

        // Step 3: Now explicitly set our custom warehouse, batch, and qty.
        // This ensures the user's selected warehouse is preserved.
        await frappe.model.set_value(row.doctype, row.name, {
            "warehouse": warehouse,
            "batch_no": batch_no,
            "qty": qty
        });
        
        frappe.show_alert(__("Item {0} added to table", [item_code]), "green");
    }
}
