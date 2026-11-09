import frappe
from frappe import _

@frappe.whitelist()
def make_sales_invoice(source_name, customer):
    if not frappe.db.exists('Customer', customer):
        frappe.throw(
            _('لا يوجد عميل باسم: {0} | No Customer found with name: {0}').format(customer)
        )

    pr = frappe.get_doc('Purchase Receipt', source_name)

    si = frappe.new_doc('Sales Invoice')
    si.customer = customer
    si.set_warehouse = 'مخزن السن بالمكتب - C'

    for pr_item in pr.items:
        si.append('items', {
            'item_code':   pr_item.item_code,
            'item_name':   pr_item.item_name,
            'description': pr_item.description,
            'qty':         pr_item.qty,
            'uom':         pr_item.uom,
            'rate':        pr_item.rate,
            'warehouse':   'مخزن السن بالمكتب - C',
            'income_account':  '4121 - ايراد السن - C',
            'expense_account': 'Finished Goods Stock (تكلفة البضاعة المباعة) - C',
        })

    # Do NOT call set_new_name() — return raw new doc data only
    return si.as_dict()
