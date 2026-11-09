# barcode_ui/api/stock_entry.py

import frappe


@frappe.whitelist()
def get_purchase_receipt_data(purchase_receipt):
    """
    Returns PR data if the given name is a valid submitted Purchase Receipt.
    Returns None otherwise (client falls through to default barcode handling).
    """

    # Must be a submitted PR
    if not frappe.db.exists("Purchase Receipt", {
        "name": purchase_receipt,
        "docstatus": 1
    }):
        return None

    pr = frappe.db.get_value(
        "Purchase Receipt",
        purchase_receipt,
        ["supplier", "set_warehouse"],
        as_dict=True
    )

    if not pr:
        return None

    items = frappe.db.get_all(
        "Purchase Receipt Item",
        filters={"parent": purchase_receipt},
        fields=[
            "item_code",
            "item_name",
            "qty",
            "uom",
            "conversion_factor",
            "base_rate as basic_rate",
        ],
        order_by="idx asc"
    )

    return {
        "purchase_receipt": purchase_receipt,
        "supplier":         pr.supplier or "",
        "set_warehouse":    pr.set_warehouse or "",
        "items":            items,
    }
