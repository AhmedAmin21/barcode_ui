import frappe
from frappe import _

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    return [
        {
            "label": _("Posting Date"),
            "fieldname": "posting_date",
            "fieldtype": "Date",
            "width": 120
        },
        {
            "label": _("Voucher Type"),
            "fieldname": "voucher_type",
            "fieldtype": "Data",
            "width": 150
        },
        {
            "label": _("Voucher No"),
            "fieldname": "voucher_no",
            "fieldtype": "Dynamic Link",
            "options": "voucher_type",
            "width": 180
        },
        {
            "label": _("Debit"),
            "fieldname": "debit",
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "label": _("Credit"),
            "fieldname": "credit",
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "label": _("Balance"),
            "fieldname": "balance",
            "fieldtype": "Currency",
            "width": 120
        },
        {
            "label": _("Remarks"),
            "fieldname": "remarks",
            "fieldtype": "Data",
            "width": 300
        }
    ]

def get_data(filters):
    conditions = get_conditions(filters)
    params = get_params(filters)
    
    # Auto-restrict party for Distributor role
    party = get_restricted_party(filters)
    if party:
        params["party"] = party
    
    gl_entries = frappe.db.sql("""
        SELECT 
            posting_date,
            voucher_type,
            voucher_no,
            debit,
            credit,
            remarks
        FROM `tabGL Entry`
        WHERE party_type = 'Customer'
            AND is_cancelled = 0
            {conditions}
        ORDER BY posting_date ASC, creation ASC
    """.format(conditions=conditions), params, as_dict=1)
    
    # Calculate running balance
    data = []
    balance = 0
    
    # Optional: Add opening balance row
    opening_balance = get_opening_balance(filters, party)
    if opening_balance != 0:
        balance = opening_balance
        data.append({
            "posting_date": filters.get("from_date") if filters.get("from_date") else "",
            "voucher_type": _("Opening Balance"),
            "voucher_no": "",
            "debit": opening_balance if opening_balance > 0 else 0,
            "credit": abs(opening_balance) if opening_balance < 0 else 0,
            "balance": balance,
            "remarks": _("Opening Balance")
        })
    
    for row in gl_entries:
        balance += (row.debit or 0) - (row.credit or 0)
        row["balance"] = balance
        data.append(row)
    
    return data

def get_conditions(filters):
    conditions = []
    
    # Party filter (auto-set for Distributors)
    party = get_restricted_party(filters)
    if party:
        conditions.append("AND party = %(party)s")
    elif filters.get("party"):
        conditions.append("AND party = %(party)s")
    
    if filters.get("company"):
        conditions.append("AND company = %(company)s")
    
    if filters.get("from_date"):
        conditions.append("AND posting_date >= %(from_date)s")
    
    if filters.get("to_date"):
        conditions.append("AND posting_date <= %(to_date)s")
    
    return " ".join(conditions)

def get_params(filters):
    return {
        "company": filters.get("company"),
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date"),
        "party": filters.get("party")
    }

def get_restricted_party(filters):
    """
    If user has Distributor role, auto-restrict to their linked Customer.
    Admins/Accounting Managers can see all (party from filter).
    """
    user = frappe.session.user
    
    # Bypass for admin roles
    user_roles = frappe.get_roles(user)
    bypass_roles = ["System Manager", "Administrator", "Accounting Manager"]
    
    if any(role in user_roles for role in bypass_roles):
        return filters.get("party")  # Use filter value (can be any or empty)
    
    # For Distributor role: auto-detect linked Customer from User Permissions
    if "Distributor" in user_roles:
        user_permissions = frappe.defaults.get_user_permissions(user)
        
        if user_permissions and "Customer" in user_permissions:
            # Get the first (and should be only) allowed Customer
            allowed_customers = [p.doc for p in user_permissions["Customer"]]
            if allowed_customers:
                return allowed_customers[0]
        
        # Fallback: check if user is linked to a Contact/Customer
        customer = frappe.db.get_value("Contact", {"user": user}, "link_name")
        if not customer:
            customer = frappe.db.get_value("Customer", {"portal_users.user": user}, "name")
        
        if customer:
            return customer
        
        frappe.throw(_("No Customer account linked to your user. Please contact admin."))
    
    return filters.get("party")

def get_opening_balance(filters, party):
    """Calculate balance before from_date"""
    if not filters.get("from_date") or not party:
        return 0
    
    result = frappe.db.sql("""
        SELECT SUM(debit - credit) as balance
        FROM `tabGL Entry`
        WHERE party_type = 'Customer'
            AND party = %s
            AND is_cancelled = 0
            AND posting_date < %s
    """, (party, filters.get("from_date")), as_dict=1)
    
    return result[0].balance or 0 if result else 0
