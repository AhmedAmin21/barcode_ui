import frappe


def update_gl_confidential_flag(doc, method):
    """
    Sync Journal Entry.custom_confidential
    -> GL Entry.custom_confidential
    """

    confidential = 1 if doc.custom_confidential else 0

    frappe.db.sql(
        """
        UPDATE `tabGL Entry`
        SET custom_confidential = %s
        WHERE voucher_type = 'Journal Entry'
          AND voucher_no = %s
        """,
        (confidential, doc.name),
    )
