import frappe
import json
from frappe import _

@frappe.whitelist()
def get_dashboard_data(filters=None):
    """Fetch report data with live rates for the dashboard."""
    if not filters:
        filters = {}
    elif isinstance(filters, str):
        filters = json.loads(filters)

    # Import your existing report functions
    from erpnext.stock.report.stock_usa.stock_usa import (
        execute, get_today_egp_rate, get_rate_from_usd, 
        get_gold_price_gram_24k_cached
    )

    # Get report data
    columns, data = execute(filters)

    # Get live rates
    rates = {
        "gold": get_gold_price_gram_24k_cached(),
        "egp": get_today_egp_rate(),
        "cny": get_rate_from_usd("CNY") or 7.2,
        "eur": get_rate_from_usd("EUR") or 0.92,
        "timestamp": frappe.utils.now()
    }

    return {
        "success": True,
        "rates": rates,
        "columns": columns,
        "data": data,
        "record_count": len(data)
    }

@frappe.whitelist()
def get_filter_options():
    """Get dropdown options for filters."""
    companies = frappe.get_all("Company", fields=["name"], order_by="name")
    item_groups = frappe.get_all("Item Group", fields=["name"], order_by="name")

    return {
        "companies": [c.name for c in companies],
        "item_groups": [g.name for g in item_groups],
        "currencies": ["", "EGP", "USD"]
    }
