import frappe


def should_mask():
    """Return True if the current user should not see confidential payroll."""

    user = frappe.session.user

    if user == "Administrator":
        return False

    if "System Manager" in frappe.get_roles(user):
        return False

    return True


def mask_rows(rows):
    if not should_mask():
        return rows

    result = []
    confidential = {}
    inserted = set()

    for row in rows:

        if (
            row.get("custom_confidential")
            and row.get("party_type") == "Employee"
        ):

            key = (
                row.get("voucher_no"),
                row.get("account"),
                row.get("cost_center"),
            )

            if key not in confidential:
                new_row = row.copy()

                new_row["party"] = "Confidential"
                new_row["party_name"] = "Confidential"
                new_row["party_type"] = ""
                new_row["debit"] = 0
                new_row["credit"] = 0

                confidential[key] = new_row

            confidential[key]["debit"] += row.get("debit") or 0
            confidential[key]["credit"] += row.get("credit") or 0

            # Insert the summary at the position of the first employee row
            if key not in inserted:
                result.append(confidential[key])
                inserted.add(key)

        else:
            result.append(row)

    return result 
