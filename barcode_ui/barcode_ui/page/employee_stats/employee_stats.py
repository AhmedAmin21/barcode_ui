import frappe
from frappe.utils import nowdate, flt, getdate, formatdate, add_months, add_days
import calendar

@frappe.whitelist()
def get_attendance_summary():
    user = frappe.session.user

    # Check if user has Administrator or System Manager role
    user_roles = frappe.get_roles(user)
    is_admin = "Administrator" in user_roles or "System Manager" in user_roles

    if is_admin:
        employees = frappe.get_all("Employee",
            filters={"status": "Active"},
            fields=["name", "employee_name", "custom_salary", "company", "user_id"],
            order_by="employee_name asc")

        if not employees:
            return {"error": "No active employees found.", "is_admin": True, "employees": []}

        results = []
        for emp_data in employees:
            emp_stats = calculate_employee_stats(emp_data)
            if emp_stats:
                results.append(emp_stats)

        return {
            "is_admin": True,
            "employees": results
        }
    else:
        employee_data = frappe.db.get_value("Employee", {"user_id": user},
            ["name", "employee_name", "custom_salary", "company"], as_dict=True)

        if not employee_data:
            return {"error": "No Employee record linked to your user account.", "is_admin": False}

        emp_stats = calculate_employee_stats(employee_data)

        return {
            "is_admin": False,
            "employees": [emp_stats] if emp_stats else []
        }

def calculate_employee_stats(employee_data, start_date=None, end_date=None):
    """Calculate attendance and salary stats for a custom cycle (26th to 25th)"""
    if not employee_data:
        return None
    
    ALWAYS_7HR_EMPLOYEES = {"HR-EMP-00005"}
    
    # --- Date Logic ---
    if start_date and end_date:
        # Use provided dates (from journal_entry.py or other callers)
        start_date = getdate(start_date)
        end_date = getdate(end_date)
    else:
        # Calculate from today (for dashboard page)
        today_dt = getdate(nowdate())
        
        if today_dt.day >= 26:
            start_date = today_dt.replace(day=26)
            end_date = add_days(add_months(start_date, 1), -1)
        else:
            start_date = add_months(today_dt.replace(day=26), -1)
            end_date = today_dt.replace(day=25)

    # Total days in this specific period
    total_days_in_period = (getdate(end_date) - getdate(start_date)).days + 1

    # --- Holiday & Working Days Logic ---
    holiday_list = frappe.db.get_value("Company", employee_data.company, "default_holiday_list")

    ramadan_start = None
    ramadan_end = None

    if holiday_list:
        ramadan_data = frappe.db.get_value("Holiday List", holiday_list,
            ["custom_from", "custom_to"], as_dict=True)
        if ramadan_data:
            ramadan_start = ramadan_data.custom_from
            ramadan_end = ramadan_data.custom_to

    capacity_hours = 0
    fridays_in_range = []
    eid_days_in_range = []

    # Cache holidays for the period
    period_holidays = {}
    if holiday_list:
        h_list = frappe.get_all("Holiday",
            filters={"parent": holiday_list, "holiday_date": ["between", [start_date, end_date]]},
            fields=["holiday_date", "description"])
        period_holidays = {h.holiday_date: (h.description or "").lower() for h in h_list}

    # Iterate through days to calculate mixed capacity
    curr_date = getdate(start_date)
    while curr_date <= getdate(end_date):
        if curr_date in period_holidays:
            desc = period_holidays[curr_date]
            if "friday" in desc:
                fridays_in_range.append(curr_date)
            elif "fitr" in desc or "adha" in desc:
                eid_days_in_range.append(curr_date)
        else:
            # Check if working day is during Ramadan
            is_ramadan = False
            if ramadan_start and ramadan_end:
                if getdate(ramadan_start) <= getdate(curr_date) <= getdate(ramadan_end):
                    is_ramadan = True

            if employee_data.name in ALWAYS_7HR_EMPLOYEES:
                capacity_hours += 7
            else:
                capacity_hours += 7 if is_ramadan else 8
        curr_date = add_days(curr_date, 1)
    # Final Calculation
    working_days = total_days_in_period - len(fridays_in_range) - len(eid_days_in_range)
    hourly_rate = flt(employee_data.custom_salary) / capacity_hours if capacity_hours > 0 else 0

    # UI Display Logic for Eids
    if holiday_list:
        all_year_holidays = frappe.get_all("Holiday",
            filters={"parent": holiday_list, "holiday_date": ["between", [f"{start_date.year}-01-01", f"{start_date.year}-12-31"]]},
            fields=["holiday_date", "description"], order_by="holiday_date asc")
    else:
        all_year_holidays = []

    def get_holiday_range(search_term):
        dates = [h.holiday_date for h in all_year_holidays if search_term.lower() in (h.description or "").lower()]
        if not dates: return "Not Scheduled"
        if len(dates) == 1: return formatdate(dates[0], "dd MMM")
        return f"{formatdate(min(dates), 'dd')} - {formatdate(max(dates), 'dd MMM')}"

    # Attendance & Advance Logic
    logs = frappe.get_all("Attendance",
        filters={
            "employee": employee_data.name,
            "attendance_date": ["between", [start_date, end_date]],
            "docstatus": 1
        },
        fields=["status", "working_hours"])

    total_hours = sum(flt(log.working_hours) for log in logs)
    total_days_worked = sum(1.0 if log.status in ["Present", "Work From Home"] else 0.5 if log.status == "Half Day" else 0 for log in logs)

    advances = frappe.get_all("Employee Advance",
        filters={
            "employee": employee_data.name,
            "docstatus": 1,
            "posting_date": ["between", [start_date, end_date]],
            "status": ["in", ["Paid", "Partially Unclaimed", "Claimed"]]
        },
        fields=["paid_amount"])
    total_advance = sum(flt(adv.paid_amount) for adv in advances)

    # Overtime Logic
    overtime_records = frappe.get_all("Over Time",
        filters={
            "employee": employee_data.name,
            "checkin_datetime": ["between", [start_date, end_date]],
            "docstatus": 1
        },
        fields=["total_overtime"])
    total_overtime = sum(flt(ot.total_overtime) for ot in overtime_records) or 0
    
    total_hours_with_overtime = total_hours + total_overtime
    total_salary = round(total_hours_with_overtime * hourly_rate, 2)

    return {
        "employee_name": employee_data.employee_name,
        "employee_id": employee_data.name,
        "total_days": total_days_worked,
        "total_hours": round(total_hours_with_overtime, 2),
        "total_overtime_hours": round(total_overtime, 2),
        "total_salary": total_salary,
        "hourly_rate": round(hourly_rate, 2),
        "total_advance": round(total_advance, 2),
        "net_remaining": round(total_salary - total_advance, 2),
        "month": getdate(end_date).strftime("%B %Y"),
        "eid_fitr": get_holiday_range("Fitr"),
        "eid_adha": get_holiday_range("Adha"),
        "period_label": f"{formatdate(start_date, 'dd MMM')} to {formatdate(end_date, 'dd MMM')}",
        "reduced_days_info": f"Deducted {len(fridays_in_range)} Fridays and {len(eid_days_in_range)} Eid days"
    }
