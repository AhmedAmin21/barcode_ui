import frappe
from frappe.model.document import Document
from frappe.utils import get_datetime, time_diff_in_hours, flt


class OverTime(Document):
        def validate(self):
                self.validate_dates()
                self.calculate_overtime()

        def validate_dates(self):
                if self.checkin_datetime and self.checkout_datetime:
                        if get_datetime(self.checkout_datetime) <= get_datetime(self.checkin_datetime):
                                frappe.throw("Check-out must be after Check-in")

        def calculate_overtime(self):
                if self.checkin_datetime and self.checkout_datetime:
                        hours = time_diff_in_hours(
                                get_datetime(self.checkout_datetime),
                                get_datetime(self.checkin_datetime)
                        )
                        self.total_overtime = flt(hours, 2)


@frappe.whitelist()
def get_permission_query_conditions(user=None):
        if not user:
                user = frappe.session.user

        if "System Manager" in frappe.get_roles(user):
                return ""

        employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
        if employee:
                return f"`tabOver Time`.employee = {frappe.db.escape(employee)}"

        return "1=0"


def has_permission(doc, user=None):
        if not user:
                user = frappe.session.user

        if "System Manager" in frappe.get_roles(user):
                return True

        employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
        if employee:
                return doc.employee == employee

        return False
