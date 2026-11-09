import frappe

@frappe.whitelist()
def create_customer_from_supplier(supplier_name):
    supplier = frappe.get_doc('Supplier', supplier_name)

    # Prevent duplicate
    existing = frappe.db.get_value('Customer', {'customer_name': supplier.supplier_name}, 'name')
    if existing:
        frappe.throw('A Customer already exists for this Supplier: {0}'.format(existing))

    # Fetch linked address
    address = frappe.db.sql("""
        SELECT parent FROM `tabDynamic Link`
        WHERE link_doctype = 'Supplier'
          AND link_name = %s
          AND parenttype = 'Address'
        LIMIT 1
    """, supplier_name, as_dict=1)

    # Fetch linked contact
    contact = frappe.db.sql("""
        SELECT parent FROM `tabDynamic Link`
        WHERE link_doctype = 'Supplier'
          AND link_name = %s
          AND parenttype = 'Contact'
        LIMIT 1
    """, supplier_name, as_dict=1)

    address_name = address[0]['parent'] if address else None
    contact_name = contact[0]['parent'] if contact else None

    # Create Customer
    customer = frappe.get_doc({
        'doctype': 'Customer',
        'customer_name': supplier.supplier_name,
        'customer_type': 'Company' if supplier.supplier_type == 'Company' else 'Individual',
        'customer_group': frappe.db.get_single_value('Selling Settings', 'customer_group') or 'All Customer Groups',
        'territory': frappe.db.get_single_value('Selling Settings', 'territory') or 'All Territories',
        'customer_primary_address': address_name,
        'customer_primary_contact': contact_name,
    })
    customer.insert(ignore_permissions=True)

    # Link Address dynamic link
    if address_name:
        address_doc = frappe.get_doc('Address', address_name)
        already_linked = any(
            l.link_doctype == 'Customer' and l.link_name == customer.name
            for l in address_doc.links
        )
        if not already_linked:
            address_doc.append('links', {
                'link_doctype': 'Customer',
                'link_name': customer.name
            })
            address_doc.save(ignore_permissions=True)

    # Link Contact dynamic link
    if contact_name:
        contact_doc = frappe.get_doc('Contact', contact_name)
        already_linked = any(
            l.link_doctype == 'Customer' and l.link_name == customer.name
            for l in contact_doc.links
        )
        if not already_linked:
            contact_doc.append('links', {
                'link_doctype': 'Customer',
                'link_name': customer.name
            })
            contact_doc.save(ignore_permissions=True)

    frappe.db.commit()
    return {'customer': customer.name}
