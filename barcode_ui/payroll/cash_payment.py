import frappe
from frappe.utils import getdate, today, formatdate, add_months, add_days, flt
from frappe import _

#from barcode_ui.payroll.utils import calculate_employee_stats
from barcode_ui.barcode_ui.page.employee_stats.employee_stats import calculate_employee_stats

PAYROLL_ACCESS_USER = "zim190493@gmail.com"
ACCESS_CONTROL_TABLE = "custom_access_control"   # adjust if your fieldname differs
USER_FIELD = "user"                               # adjust if your fieldname differs

def create_cash_payment_je(start_date, end_date, posting_date=None):
    """
    Creates Journal Entry for cash payment of net remaining salary.
    Called manually from the 'Generate Payroll JEs' button on Journal Entry.
    """

    start_date = getdate(start_date)
    end_date = getdate(end_date)
    today_dt = getdate(posting_date) if posting_date else getdate(today())

    # --- Get all active employees ---
    employees = frappe.get_all("Employee",
        filters={"status": "Active"},
        fields=["name", "employee_name", "custom_salary", "company", "user_id"],
        order_by="employee_name asc"
    )

    if not employees:
        return {"status": "error", "message": "No active employees found."}

    accounts = []
    total_net = 0.0
    employees_with_payment = 0

    for emp_data in employees:
        # Calculate stats for the selected period
        emp_stats = calculate_employee_stats(emp_data, start_date, end_date)

        if not emp_stats:
            continue

        net_remaining = emp_stats.get("net_remaining", 0)

        # Skip employees with zero or negative net remaining
        if net_remaining <= 0:
            continue

        employees_with_payment += 1
        total_net += net_remaining

        # Debit row: 2504 - Payroll Payable (reducing payable)
        accounts.append({
            "account": "2504 - Payroll Payable (رواتب مستحقة الدفع) - C",
            "party_type": "Employee",
            "party": emp_data.name,
            "debit_in_account_currency": net_remaining,
            "credit_in_account_currency": 0,
            "user_remark": f"Cash payment for {emp_data.employee_name} | Net: {net_remaining} | {emp_stats.get('period_label', '')}"
        })

    # --- Validate we have data ---
    if not accounts:
        return {"status": "skipped", "reason": "No employees with net remaining payment in this period."}

    # Credit row: 1111 - Cash (single row for total)
    accounts.append({
        "account": "1111 - خزنة النقدية الرئيسية بالمكتب - C",
        "debit_in_account_currency": 0,
        "credit_in_account_currency": total_net,
        "user_remark": f"Cash payment for payroll | {formatdate(start_date, 'dd MMM')} to {formatdate(end_date, 'dd MMM')}"
    })

    # --- Validate totals ---
    total_debit = sum(flt(r.get("debit_in_account_currency", 0)) for r in accounts)
    total_credit = sum(flt(r.get("credit_in_account_currency", 0)) for r in accounts)

    if abs(total_debit - total_credit) > 0.01:
        frappe.throw(f"Debit ({total_debit}) != Credit ({total_credit})!")

    # --- CREATE JE WITH COMMIT ---
    try:
        je = frappe.get_doc({
            "doctype": "Journal Entry",
            "voucher_type": "Journal Entry",
            "company": employees[0].company,
            "posting_date": today_dt,
            "title": f"قيد دفع الرواتب لموظفي الشركة - {getdate(end_date).strftime('%B %Y')}",
            "user_remark": f"Cash payment for cycle: {formatdate(start_date, 'dd MMM')} to {formatdate(end_date, 'dd MMM')}",
            "accounts": accounts,
            # >>> NEW LINES <<<
            "custom_confidential": 1,
            "custom_access_control": [
                {USER_FIELD: PAYROLL_ACCESS_USER}
            ]
        })

        je.insert()
        for row in je.accounts:
            row.cost_center = None
        custom_title = f"قيد دفع الرواتب للموظفين - {getdate(end_date).strftime('%B %Y')}"
        je.title = custom_title

        je.save(ignore_permissions=True)
        frappe.db.commit()
        je.db_set("title", custom_title, update_modified=False)
        if not frappe.db.exists("Journal Entry", je.name):
            raise Exception(f"JE {je.name} not persisted!")

        return {
            "status": "success",
            "journal_entry": je.name,
            "total": total_net,
            "employee_count": employees_with_payment,
            "period": f"{formatdate(start_date, 'dd MMM')} to {formatdate(end_date, 'dd MMM')}"
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(f"Cash payment JE failed: {str(e)}", "Cash Payment Error")
        return {"status": "error", "message": str(e)}
