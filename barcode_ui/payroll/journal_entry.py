import frappe
from frappe.utils import getdate, today, formatdate, add_months, add_days, flt
from frappe import _

#from barcode_ui.payroll.utils import calculate_employee_stats
from barcode_ui.barcode_ui.page.employee_stats.employee_stats import calculate_employee_stats

PAYROLL_ACCESS_USER = "zim190493@gmail.com"
ACCESS_CONTROL_TABLE = "custom_access_control"   # adjust if your fieldname differs
USER_FIELD = "user"                               # adjust if your fieldname differs

def create_payroll_accrual_je(start_date, end_date, posting_date=None):
    """
    Creates Journal Entry for payroll accrual.
    Called manually from the 'Generate Payroll JEs' button on Journal Entry.
    """

    start_date = getdate(start_date)
    end_date = getdate(end_date)
    today_dt = getdate(posting_date) if posting_date else getdate(today())

    # --- Get all active employees ---
    employees = frappe.get_all("Employee",
        filters={"status": "Active"},
        fields=["name", "employee_name", "custom_salary", "company", "user_id", "custom_cost_center"],
        order_by="employee_name asc"
    )

    if not employees:
        return {"status": "error", "message": "No active employees found."}

    office_total = 0.0
    factory_total = 0.0
    employee_rows = []

    for emp_data in employees:
        # PASS the period dates explicitly!
        emp_stats = calculate_employee_stats(emp_data, start_date, end_date)

        if not emp_stats or emp_stats.get("total_salary", 0) <= 0:
            continue

        gross_salary = emp_stats["total_salary"]
        cost_center = emp_data.get("custom_cost_center", "")

        if cost_center == "المصنع - factory - C":
            factory_total += gross_salary
        elif cost_center == "المكتب- Office - C":
            office_total += gross_salary
        else:
            frappe.log_error(
                f"Employee {emp_data.name} has unknown cost center: {cost_center}. Skipped in JE.",
                "Payroll Accrual Warning"
            )
            continue

        employee_rows.append({
            "account": "2504 - Payroll Payable (رواتب مستحقة الدفع) - C",
            "party_type": "Employee",
            "party": emp_data.name,
            "cost_center": None,
            "credit_in_account_currency": gross_salary,
            "debit_in_account_currency": 0,
            "user_remark": f"Salary accrual for {emp_data.employee_name} | {emp_stats.get('period_label', '')}"
        })

    accounts = []

    if office_total > 0:
        accounts.append({
            "account": "5213 - Salary (الرواتب والاجور) - C",
            "cost_center": "المكتب- Office - C",
            "debit_in_account_currency": office_total,
            "credit_in_account_currency": 0,
            "user_remark": f"Office payroll accrual | {formatdate(start_date, 'dd MMM')} to {formatdate(end_date, 'dd MMM')}"
        })

    if factory_total > 0:
        accounts.append({
            "account": "5213 - Salary (الرواتب والاجور) - C",
            "cost_center": "المصنع - factory - C",
            "debit_in_account_currency": factory_total,
            "credit_in_account_currency": 0,
            "user_remark": f"Factory payroll accrual | {formatdate(start_date, 'dd MMM')} to {formatdate(end_date, 'dd MMM')}"
        })

    accounts.extend(employee_rows)

    total_debit = sum(flt(r.get("debit_in_account_currency", 0)) for r in accounts)
    total_credit = sum(flt(r.get("credit_in_account_currency", 0)) for r in accounts)

    if not accounts:
        return {"status": "error", "message": "No valid payroll data."}

    if abs(total_debit - total_credit) > 0.01:
        frappe.throw(f"Debit ({total_debit}) != Credit ({total_credit})!")

    # --- CREATE JE WITH COMMIT ---
    try:
        je = frappe.get_doc({
            "doctype": "Journal Entry",
            "voucher_type": "Journal Entry",
            "company": employees[0].company,
            "posting_date": today_dt,
            "title": f"قيد استحقاق رواتب موظفي الشركة - {getdate(end_date).strftime('%B %Y')}",
            "user_remark": f"Auto payroll accrual for cycle: {formatdate(start_date, 'dd MMM')} to {formatdate(end_date, 'dd MMM')}",
            "accounts": accounts,
            # >>> NEW LINES <<<
            "custom_confidential": 1,
            "custom_access_control": [
                {USER_FIELD: PAYROLL_ACCESS_USER}
            ]
        })

        je.insert()
        # Clear auto-populated cost centers
        for row in je.accounts:
            if "2504" in row.account or "Payroll Payable" in row.account:
                row.cost_center = None
        custom_title = f"قيد استحقاق رواتب موظفي الشركة - {getdate(end_date).strftime('%B %Y')}"
        je.title = custom_title

        je.save(ignore_permissions=True)
        frappe.db.commit()
        je.db_set("title", custom_title, update_modified=False)
        if not frappe.db.exists("Journal Entry", je.name):
            raise Exception(f"JE {je.name} not persisted!")

        return {
            "status": "success",
            "journal_entry": je.name,
            "total": total_debit,
            "office_total": office_total,
            "factory_total": factory_total,
            "employee_count": len(employee_rows),
            "period": f"{formatdate(start_date, 'dd MMM')} to {formatdate(end_date, 'dd MMM')}"
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(f"Payroll JE failed: {str(e)}", "Payroll Accrual Error")
        return {"status": "error", "message": str(e)}
