// ─────────────────────────────────────────────────────────────────────────────
// Stock Entry — Barcode Scan (barcode_ui custom app)
//
// Behaviour:
//   • Material Transfer only.
//   • If scanned value matches a Purchase Receipt name → fetch its items,
//     supplier, and set_warehouse, then APPEND rows (never replace).
//   • If scanned value is a raw item barcode → fall through to ERPNext default.
// ─────────────────────────────────────────────────────────────────────────────

frappe.ui.form.on("Stock Entry", {

    // ── Wire up the custom scan handler as soon as the form loads ────────────
    onload: function (frm) {
        frm._barcode_ui_hooked = false; // reset hook flag on each load
    },

    refresh: function (frm) {
        // Only hook for Material Transfer
        if (frm.doc.stock_entry_type !== "Material Transfer") return;

        // Avoid double-hooking if refresh fires multiple times
        if (frm._barcode_ui_hooked) return;
        frm._barcode_ui_hooked = true;

        // ── Override the scan_barcode field's onchange ───────────────────────
        // Frappe triggers scan_barcode events through the field object.
        // We intercept by wrapping the field's set_value so we always get
        // control before any default handler runs.
        var original_scan_fn = frm.fields_dict["scan_barcode"]
            ? frm.fields_dict["scan_barcode"].df.onchange
            : null;

        frm.fields_dict["scan_barcode"].df.onchange = function () {
            barcode_ui.stock_entry.handle_scan(frm, original_scan_fn);
        };
    },

    // ── Also hook the standard scan_barcode trigger ──────────────────────────
    scan_barcode: function (frm) {
        if (frm.doc.stock_entry_type !== "Material Transfer") return;

        var scanned = frm.doc.scan_barcode;
        if (!scanned) return;

        barcode_ui.stock_entry.handle_scan(frm, null);
    }
});

// ── Namespace ────────────────────────────────────────────────────────────────
var barcode_ui = barcode_ui || {};
barcode_ui.stock_entry = barcode_ui.stock_entry || {};

/**
 * Main entry point called on every barcode scan for Material Transfer.
 *
 * Strategy:
 *   1. Call the whitelisted server method to check if the scanned value is
 *      a valid Purchase Receipt name.
 *   2. If yes → append PR rows.
 *   3. If no  → let ERPNext handle it as a raw item/barcode scan.
 */
barcode_ui.stock_entry.handle_scan = function (frm, fallback_fn) {
    var scanned = (frm.doc.scan_barcode || "").trim();
    if (!scanned) return;

    frappe.call({
        method: "barcode_ui.api.stock_entry.get_purchase_receipt_data",
        args: { purchase_receipt: scanned },
        freeze: true,
        freeze_message: __("Fetching Purchase Receipt …"),
        callback: function (r) {
            if (r.exc || !r.message) {
                // Not a PR barcode — fall through to default ERPNext behaviour
                barcode_ui.stock_entry.fallback_to_default(frm, scanned, fallback_fn);
                return;
            }

            var data = r.message; // { supplier, set_warehouse, items: [...] }
            barcode_ui.stock_entry.append_pr_items(frm, data);
        }
    });
};

/**
 * Appends rows from a Purchase Receipt into the items child table.
 * Never clears existing rows.
 *
 * data = {
 *   supplier      : "Supplier Name",
 *   set_warehouse : "Target Warehouse",   // used as s_warehouse per row
 *   items         : [
 *     { item_code, item_name, qty, uom, conversion_factor, basic_rate }
 *   ]
 * }
 */
barcode_ui.stock_entry.append_pr_items = function (frm, data) {
    if (!data.items || data.items.length === 0) {
        frappe.msgprint(__("No items found in this Purchase Receipt."));
        barcode_ui.stock_entry.clear_scan(frm);
        return;
    }

    $.each(data.items, function (_, item) {
        var row = frappe.model.add_child(frm.doc, "Stock Entry Detail", "items");
        frappe.model.set_value(row.doctype, row.name, "item_code",          item.item_code);
        frappe.model.set_value(row.doctype, row.name, "item_name",          item.item_name   || "");
        frappe.model.set_value(row.doctype, row.name, "qty",                item.qty         || 1);
        frappe.model.set_value(row.doctype, row.name, "uom",                item.uom         || "Nos");
        frappe.model.set_value(row.doctype, row.name, "conversion_factor",  item.conversion_factor || 1);
        frappe.model.set_value(row.doctype, row.name, "basic_rate",         item.basic_rate  || 0);

        // ── Custom fields ────────────────────────────────────────────────────
        frappe.model.set_value(row.doctype, row.name, "custom_supplier",    data.supplier    || "");
        frappe.model.set_value(row.doctype, row.name, "s_warehouse",        data.set_warehouse || "");
    });

    frm.refresh_field("items");

    frappe.show_alert({
        message: __("Added {0} item(s) from Purchase Receipt {1}",
                    [data.items.length, data.purchase_receipt]),
        indicator: "green"
    });

    barcode_ui.stock_entry.clear_scan(frm);
};

/**
 * Let ERPNext handle the scan as a normal item / barcode lookup.
 * We clear our field so ERPNext can re-trigger its own handler if needed.
 */
barcode_ui.stock_entry.fallback_to_default = function (frm, scanned, fallback_fn) {
    // ERPNext's built-in scan handler lives in:
    //   erpnext/public/js/controllers/transaction.js  → scan_barcode()
    // It reads frm.doc.scan_barcode and calls erpnext.utils.scan_barcode().
    // Because our trigger fires INSTEAD of the default, we call the utility
    // directly so duplicate rows are avoided.
    if (typeof erpnext !== "undefined" && erpnext.utils && erpnext.utils.scan_barcode) {
        erpnext.utils.scan_barcode(frm);
    } else if (typeof fallback_fn === "function") {
        fallback_fn.call(frm.fields_dict["scan_barcode"]);
    }
    // Note: do NOT clear the scan field here — ERPNext's handler does that.
};

/** Clears the scan_barcode field after a successful PR import. */
barcode_ui.stock_entry.clear_scan = function (frm) {
    frappe.model.set_value(frm.doctype, frm.docname, "scan_barcode", "");
    frm.refresh_field("scan_barcode");
};
