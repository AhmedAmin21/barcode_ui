import frappe

from erpnext.accounts.report.general_ledger import general_ledger as gl

from barcode_ui.payroll.mask import mask_rows


_original_execute = gl.execute


def execute(filters=None):
    columns, data = _original_execute(filters)

    data = mask_rows(data)

    return columns, data
