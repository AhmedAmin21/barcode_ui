import frappe
from frappe.model.document import Document
from frappe.utils import nowdate, flt, getdate, add_months, add_days

# --- CONFIG: Employees who ALWAYS work 7-hour days (non-Ramadan too) ---
ALWAYS_7HR_EMPLOYEES = {"HR-EMP-00005"}
# Add more IDs here as needed, e.g.: {"HR-EMP-00005", "HR-EMP-00012"}


class EmployeeAttendanceSummary(Document):
    def validate(self):
        # Set the Month/Year label based on the cycle
        ref = getdate(self.reference_date or nowdate())
        # If we are in the new cycle (26th+), the summary is for the next month
        label_date = add_months(ref, 1) if ref.day >= 26 else ref
        self.month_year = label_date.strftime("%B %Y")

    @frappe.whitelist()
    def fetch_employee_stats(self):
        self.employees = []  # Clear the table

        # Determine the 26th-to-25th range
        ref_dt = getdate(self.reference_date)
        if ref_dt.day >= 26:
            start_date = ref_dt.replace(day=26)
            end_date = add_days(add_months(start_date, 1), -1)
        else:
            start_date = add_months(ref_dt.replace(day=26), -1)
            end_date = ref_dt.replace(day=25)

        # Debug log — remove after confirming
        frappe.log_error(f"Fetching stats: {start_date} → {end_date}", "Attendance Summary Debug")

        employees = frappe.get_all("Employee", 
            filters={"status": "Active"},
            fields=["name", "employee_name", "custom_salary", "company"])

        for emp in employees:
            stats = self.calculate_individual_stats(emp, start_date, end_date)
            self.append("employees", {
                "employee": emp.name,
                "employee_name": emp.employee_name,
                "main_salary": stats['main_salary'],
                "total_hours": stats['total_hours'],
                "overtime_hours": stats['overtime_hours'],
                "total_salary": stats['total_salary'],
                "total_advance": stats['total_advance'],
                "net_remaining": stats['net_remaining']
            })

        # Save AFTER all rows are appended
        self.save()
        return "Updated"

    def calculate_individual_stats(self, emp, start_date, end_date):
        # 1. Capacity & Ramadan Logic (7h vs 8h) + Fixed 7h employees
        holiday_list = frappe.db.get_value("Company", emp.company, "default_holiday_list")
        ramadan = frappe.db.get_value("Holiday List", holiday_list, ["custom_from", "custom_to"], as_dict=True) if holiday_list else None

        capacity_hours = 0
        h_list = frappe.get_all("Holiday", 
            filters={"parent": holiday_list, "holiday_date": ["between", [start_date, end_date]]},
            fields=["holiday_date", "description"]) if holiday_list else []

        holidays = {h.holiday_date: (h.description or "").lower() for h in h_list}

        curr = getdate(start_date)
        while curr <= getdate(end_date):
            if curr not in holidays or not any(x in holidays[curr] for x in ["friday", "fitr", "adha"]):
                # Check if this employee ALWAYS works 7 hours (override Ramadan logic)
                if emp.name in ALWAYS_7HR_EMPLOYEES:
                    capacity_hours += 7
                else:
                    # Normal logic: 7h during Ramadan, 8h otherwise
                    is_ramadan = False
                    if ramadan and ramadan.custom_from and ramadan.custom_to:
                        if ramadan.custom_from <= curr <= ramadan.custom_to:
                            is_ramadan = True
                    capacity_hours += 7 if is_ramadan else 8
            curr = add_days(curr, 1)

        hourly_rate = flt(emp.custom_salary) / capacity_hours if capacity_hours > 0 else 0

        # 2. Attendance
        logs = frappe.get_all("Attendance",
            filters={"employee": emp.name, "attendance_date": ["between", [start_date, end_date]], "docstatus": 1},
            fields=["working_hours"])

        total_hours = sum(flt(l.working_hours) for l in logs)

        # 3. Overtime (NEW)
        overtime_records = frappe.get_all("Over Time",
            filters={
                "employee": emp.name,
                "checkin_datetime": ["between", [start_date, end_date]],
                "docstatus": 1
            },
            fields=["total_overtime"])
        total_overtime = sum(flt(ot.total_overtime) for ot in overtime_records) or 0

        # Total hours = attendance hours + overtime hours
        total_hours_with_overtime = total_hours + total_overtime

        # 4. Salary & Advances
        total_salary = round(total_hours_with_overtime * hourly_rate, 2)

        advances = frappe.get_all("Employee Advance",
            filters={"employee": emp.name, "docstatus": 1, "posting_date": ["between", [start_date, end_date]], "status": ["in", ["Paid", "Partially Unclaimed", "Claimed"]]},
            fields=["paid_amount"])

        total_advance = sum(flt(a.paid_amount) for a in advances)

        return {
            "main_salary": flt(emp.custom_salary),
            "total_hours": round(total_hours_with_overtime, 2),
            "overtime_hours": round(total_overtime, 2),
            "total_salary": total_salary,
            "total_advance": round(total_advance, 2),
            "net_remaining": round(total_salary - total_advance, 2)
        }


@frappe.whitelist()
def generate_monthly_summary_automatically():
    """Triggered by Scheduler at 8am on the 26th"""

    today = getdate(nowdate())  # e.g. 2026-04-26

    # Subtract 1 month: scheduler runs on 26/4 but the cycle that just
    # completed started on 26/3, so reference date should be 26/3
    ref_dt = add_months(today.replace(day=26), -1)  # 2026-03-26
    ref_date = str(ref_dt)

    # 26/3 → April 2026
    label_dt = add_months(ref_dt, 1)
    target_month_name = label_dt.strftime("%B %Y")  # "April 2026"

    # Check for existing doc to avoid duplicates
    if frappe.db.exists("Employee Attendance Summary", target_month_name):
        frappe.log_error(f"Summary for {target_month_name} already exists.", "Auto-Gen Skip")
        return

    # Create the doc
    new_summary = frappe.new_doc("Employee Attendance Summary")
    new_summary.reference_date = ref_date        # "2026-03-26"
    new_summary.month_year = target_month_name   # "April 2026"
    new_summary.insert()
    frappe.db.commit()

    # Reload to ensure all fields are fresh from DB before calculating
    new_summary.reload()
    new_summary.fetch_employee_stats()
    frappe.db.commit()
