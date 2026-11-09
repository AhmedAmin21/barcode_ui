import frappe
import requests
import base64
from frappe.utils.pdf import get_pdf
from frappe import _

@frappe.whitelist()
def custom_scan_barcode(search_value: str):
    if not search_value or "|" not in search_value:
        return {}

    parts = search_value.split("|")
    
    if len(parts) == 2:
        item_code, batch_no = parts
        type = "with_overlay"
    elif len(parts) == 3:
        item_code, warehouse, batch_no = parts
        type = "direct"
    else:
        return {}

    if not frappe.db.exists("Item", item_code):
        frappe.throw(_("Item {0} not found in this QR code").format(item_code))
    
    if not frappe.db.exists("Batch", batch_no):
        frappe.throw(_("Batch {0} not found in this QR code").format(batch_no))

    return {
        "item_code": item_code,
        "batch_no": batch_no,
        "warehouse": warehouse if len(parts) == 3 else None,
        "type": type
    }

@frappe.whitelist()
def get_batch_stock(item_code: str, batch_no: str):
    """
    Fetch warehouses that have quantity > 0 for a specific batch.
    Uses the standard ERPNext get_batch_qty function for reliability.
    """
    from erpnext.stock.doctype.batch.batch import get_batch_qty

    warehouses = get_batch_qty(batch_no=batch_no, item_code=item_code)

    return warehouses
