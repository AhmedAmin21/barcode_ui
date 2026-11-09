import frappe
from frappe.utils import cint

def reset_priority_if_completed_or_cancelled(doc, method=None):
    """
    Reset custom_priority to '0' when Work Order status is Completed, Closed, or Cancelled,
    while keeping it unchanged when In Process or Not Started.
    """
    status = (doc.status or "").strip()
    is_cancelled = doc.docstatus == 2 or status == "Cancelled"
    is_completed = status in ["Completed", "Closed"]

    if is_completed or is_cancelled:
        priority = cint(doc.get("custom_priority") or 0)
        if priority > 0:
            doc.custom_priority = "0"
            if doc.name and frappe.db.exists("Work Order", doc.name):
                frappe.db.set_value(
                    "Work Order",
                    doc.name,
                    "custom_priority",
                    "0",
                    update_modified=False,
                )
