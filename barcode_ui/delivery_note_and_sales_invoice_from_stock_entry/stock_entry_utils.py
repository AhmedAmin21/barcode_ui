import frappe
import json
from frappe.utils import flt, nowdate

@frappe.whitelist()
def create_delivery_note_from_stock_entry(stock_entry_name, customer, selected_items):
    """
    Create a Delivery Note from a Stock Entry
    """
    try:
        selected_items = json.loads(selected_items) if isinstance(selected_items, str) else selected_items

        if not selected_items:
            return {'success': False, 'error': 'No items selected'}

        stock_entry = frappe.get_doc('Stock Entry', stock_entry_name)
        if not stock_entry:
            return {'success': False, 'error': 'Stock Entry not found'}

        if not frappe.db.exists('Customer', customer):
            customer_by_name = frappe.db.get_value('Customer', {'customer_name': customer}, 'name')
            if customer_by_name:
                customer = customer_by_name
            else:
                return {'success': False, 'error': 'Customer not found'}

        customer_doc = frappe.get_doc('Customer', customer)
        set_warehouse = selected_items[0].get('t_warehouse') if selected_items else None

        dn = frappe.new_doc('Delivery Note')
        dn.customer = customer
        dn.customer_name = customer_doc.customer_name
        dn.posting_date = nowdate()
        dn.posting_time = frappe.utils.nowtime()
        dn.set_warehouse = set_warehouse
        dn.company = stock_entry.company

        if frappe.db.has_column('Delivery Note', 'custom_from_stock_entry'):
            dn.custom_from_stock_entry = stock_entry_name

        for item in selected_items:
            item_doc = frappe.get_doc('Item', item.get('item_code'))

            conversion_factor = 1.0
            if item_doc.stock_uom != item_doc.sales_uom:
                conversion_factor = frappe.db.get_value(
                    'UOM Conversion Detail',
                    {'parent': item.get('item_code'), 'uom': item_doc.sales_uom},
                    'conversion_factor'
                ) or 1.0

            dn_item = {
                'item_code': item.get('item_code'),
                'item_name': item.get('item_name') or item_doc.item_name,
                'description': item_doc.description,
                'qty': flt(item.get('qty')),
                'uom': item_doc.stock_uom,
                'stock_uom': item_doc.stock_uom,
                'conversion_factor': conversion_factor,
                'warehouse': item.get('t_warehouse'),
                'rate': item_doc.valuation_rate or 0,
                'against_stock_entry': stock_entry_name,
                'ste_detail': item.get('stock_entry_detail_name'),
            }

            if hasattr(stock_entry, 'cost_center') and stock_entry.cost_center:
                dn_item['cost_center'] = stock_entry.cost_center

            dn.append('items', dn_item)

        dn.insert(ignore_permissions=False)

        return {
            'success': True,
            'delivery_note': dn.name,
            'error': None
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), 'Create Delivery Note from Stock Entry Error')
        return {'success': False, 'error': str(e)}


@frappe.whitelist()
def create_sales_invoice_from_stock_entry(stock_entry_name, customer, selected_items):
    """
    Create a Sales Invoice from a Stock Entry
    """
    try:
        selected_items = json.loads(selected_items) if isinstance(selected_items, str) else selected_items

        if not selected_items:
            return {'success': False, 'error': 'No items selected'}

        stock_entry = frappe.get_doc('Stock Entry', stock_entry_name)
        if not stock_entry:
            return {'success': False, 'error': 'Stock Entry not found'}

        if not frappe.db.exists('Customer', customer):
            customer_by_name = frappe.db.get_value('Customer', {'customer_name': customer}, 'name')
            if customer_by_name:
                customer = customer_by_name
            else:
                return {'success': False, 'error': 'Customer not found'}

        customer_doc = frappe.get_doc('Customer', customer)
        set_warehouse = selected_items[0].get('t_warehouse') if selected_items else None

        si = frappe.new_doc('Sales Invoice')
        si.customer = customer
        si.customer_name = customer_doc.customer_name
        si.posting_date = nowdate()
        si.posting_time = frappe.utils.nowtime()
        si.set_warehouse = set_warehouse
        si.company = stock_entry.company
        si.due_date = nowdate()

        # Custom field to store reference to Stock Entry
        if frappe.db.has_column('Sales Invoice', 'custom_from_stock_entry'):
            si.custom_from_stock_entry = stock_entry_name

        # Set default income account if available
        default_income_account = frappe.db.get_value('Company', stock_entry.company, 'default_income_account')

        for item in selected_items:
            item_doc = frappe.get_doc('Item', item.get('item_code'))

            # Get item price or valuation rate
            item_price = frappe.db.get_value(
                'Item Price',
                {'item_code': item.get('item_code'), 'selling': 1},
                'price_list_rate'
            ) or item_doc.valuation_rate or 0

            conversion_factor = 1.0
            if item_doc.stock_uom != item_doc.sales_uom:
                conversion_factor = frappe.db.get_value(
                    'UOM Conversion Detail',
                    {'parent': item.get('item_code'), 'uom': item_doc.sales_uom},
                    'conversion_factor'
                ) or 1.0

            si_item = {
                'item_code': item.get('item_code'),
                'item_name': item.get('item_name') or item_doc.item_name,
                'description': item_doc.description,
                'qty': flt(item.get('qty')),
                'uom': item_doc.stock_uom,
                'stock_uom': item_doc.stock_uom,
                'conversion_factor': conversion_factor,
                'warehouse': item.get('t_warehouse'),
                'rate': item_price,
                'amount': flt(item.get('qty')) * flt(item_price),
            }

            if default_income_account:
                si_item['income_account'] = default_income_account

            if hasattr(stock_entry, 'cost_center') and stock_entry.cost_center:
                si_item['cost_center'] = stock_entry.cost_center

            si.append('items', si_item)

        # Calculate totals
        si.run_method('calculate_taxes_and_totals')

        si.insert(ignore_permissions=False)

        return {
            'success': True,
            'sales_invoice': si.name,
            'error': None
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), 'Create Sales Invoice from Stock Entry Error')
        return {'success': False, 'error': str(e)}
