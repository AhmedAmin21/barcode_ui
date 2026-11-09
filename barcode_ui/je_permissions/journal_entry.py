import frappe


def is_admin_or_system_manager(user):
    return (
        user == "Administrator"
        or "System Manager" in frappe.get_roles(user)
    )


def permission_query_conditions(user):
    # Administrator and System Managers can see everything
    if is_admin_or_system_manager(user):
        return ""

    user = frappe.db.escape(user)

    return f"""
    (
        NOT EXISTS (
            SELECT 1
            FROM `tabJournal Entry Access` ac
            WHERE ac.parent = `tabJournal Entry`.name
        )

        OR

        EXISTS (
            SELECT 1
            FROM `tabJournal Entry Access` ac
            WHERE ac.parent = `tabJournal Entry`.name
            AND ac.user = {user}
        )

        OR

        EXISTS (
            SELECT 1
            FROM `tabJournal Entry Access` ac
            INNER JOIN `tabHas Role` hr
                ON hr.role = ac.role
            WHERE ac.parent = `tabJournal Entry`.name
            AND hr.parent = {user}
        )
    )
    """


def has_permission(doc, user=None, permission_type=None):
    user = user or frappe.session.user

    # Administrator and System Managers bypass all restrictions
    if is_admin_or_system_manager(user):
        return True

    # Read access rules directly from the database.
    # Replace "Journal Entry Access" with YOUR CHILD DOCTYPE NAME.
    rows = frappe.get_all(
        "Journal Entry Access",
        filters={"parent": doc.name},
        fields=["user", "role"],
    )

    # No access rules -> normal ERPNext permissions apply
    if not rows:
        return True

    roles = frappe.get_roles(user)

    for row in rows:
        if row.get("user") == user:
            return True

        if row.get("role") and row["role"] in roles:
            return True

    return False
