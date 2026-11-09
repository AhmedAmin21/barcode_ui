#this is the file to generate all the payment JE
import frappe
from frappe import _
from frappe.utils import getdate, today, formatdate

from barcode_ui.payroll.journal_entry import create_payroll_accrual_je
from barcode_ui.payroll.advance_settlement import create_advance_settlement_je
from barcode_ui.payroll.cash_payment import create_cash_payment_je


@frappe.whitelist()
def generate_payroll_jes(start_date, end_date, posting_date=None):
    """
    Called from the 'Generate Payroll JEs' button on Journal Entry.
    System Manager / Administrator only.
    """
    # Hard permission gate — button is also hidden client-side
    if not ("System Manager" in frappe.get_roles() or frappe.session.user == "Administrator"):
        frappe.throw(_("Only System Manager can generate payroll JEs."), frappe.PermissionError)

    start_date = getdate(start_date)
    end_date = getdate(end_date)
    posting_date = getdate(posting_date) if posting_date else getdate(today())

    if end_date <= start_date:
        frappe.throw(_("End date must be after start date."))

    results = {}

    # Run in order: accrual -> advance settlement -> cash payment
    for key, fn in [
        ("accrual", create_payroll_accrual_je),
        ("advance", create_advance_settlement_je),
        ("cash", create_cash_payment_je),
    ]:
        try:
            results[key] = fn(start_date=start_date, end_date=end_date, posting_date=posting_date)
        except Exception as e:
            results[key] = {"status": "error", "message": str(e)}
            frappe.log_error(
                f"Payroll JE ({key}) failed for {start_date}→{end_date}: {str(e)}",
                "Payroll JE Batch Error"
            )

    period = f"{formatdate(start_date, 'dd MMM')} to {formatdate(end_date, 'dd MMM')}"
    failed = [k for k, v in results.items() if v.get("status") == "error"]

    return {
        "results": results,
        "period": period,
        "ok": not failed,
        "message": (
            _("All 3 JEs generated for {0}.").format(period)
            if not failed
            else _("JE(s) failed: {0}. Check Error Log.").format(", ".join(failed))
        ),
    }
