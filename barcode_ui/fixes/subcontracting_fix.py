import frappe

def fix_service_item_rates(doc, method):
    for item in (doc.service_items or []):
        if not item.purchase_order_item:
            continue
        
        base_rate, base_amount = frappe.db.get_value(
            'Purchase Order Item',
            item.purchase_order_item,
            ['base_rate', 'base_amount']
        )
        
        item.rate = base_rate
        item.amount = base_amount
