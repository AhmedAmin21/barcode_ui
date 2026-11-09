import frappe

@frappe.whitelist()
def create_supplier_from_customer(customer_name):
    customer = frappe.get_doc('Customer', customer_name)

    # Prevent duplicate
    existing = frappe.db.get_value('Supplier', {'supplier_name': customer.customer_name}, 'name')
    if existing:
        frappe.throw('A Supplier already exists for this Customer: {0}'.format(existing))

    # Fetch linked address
    address = frappe.db.sql("""
        SELECT parent FROM `tabDynamic Link`
        WHERE link_doctype = 'Customer'
          AND link_name = %s
          AND parenttype = 'Address'
        LIMIT 1
    """, customer_name, as_dict=1)

    # Fetch linked contact
    contact = frappe.db.sql("""
        SELECT parent FROM `tabDynamic Link`
        WHERE link_doctype = 'Customer'
          AND link_name = %s
          AND parenttype = 'Contact'
        LIMIT 1
    """, customer_name, as_dict=1)

    address_name = address[0]['parent'] if address else None
    contact_name = contact[0]['parent'] if contact else None

    # Create Supplier
    supplier = frappe.get_doc({
        'doctype': 'Supplier',
        'supplier_name': customer.customer_name,
        'supplier_type': 'Company' if customer.customer_type == 'Company' else 'Individual',
        'supplier_group': frappe.db.get_single_value('Buying Settings', 'supplier_group') or 'All Supplier Groups',
        'supplier_primary_address': address_name,
        'supplier_primary_contact': contact_name,
    })
    supplier.insert(ignore_permissions=True)

    # Link Address dynamic link
    if address_name:
        address_doc = frappe.get_doc('Address', address_name)
        already_linked = any(
            l.link_doctype == 'Supplier' and l.link_name == supplier.name
            for l in address_doc.links
        )
        if not already_linked:
            address_doc.append('links', {
                'link_doctype': 'Supplier',
                'link_name': supplier.name
            })
            address_doc.save(ignore_permissions=True)

    # Link Contact dynamic link
    if contact_name:
        contact_doc = frappe.get_doc('Contact', contact_name)
        already_linked = any(
            l.link_doctype == 'Supplier' and l.link_name == supplier.name
            for l in contact_doc.links
        )
        if not already_linked:
            contact_doc.append('links', {
                'link_doctype': 'Supplier',
                'link_name': supplier.name
            })
            contact_doc.save(ignore_permissions=True)

    frappe.db.commit()
    return {'supplier': supplier.name}
