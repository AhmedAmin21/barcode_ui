frappe.ui.form.on('Purchase Receipt', {
    refresh: function(frm) {
        if (frm.doc.docstatus === 0 || frm.doc.docstatus === 1) {
            frm.add_custom_button(__('Sales Invoice'), function() {
                make_sales_invoice(frm);
            }, __('Create'));
        }
    }
});

function make_sales_invoice(frm) {
    var supplier_id = frm.doc.supplier;

    if (!supplier_id) {
        frappe.msgprint({
            title: __('خطأ | Error'),
            message: __('لا يوجد مورد محدد في هذا الإيصال. | No supplier found on this Purchase Receipt.'),
            indicator: 'red'
        });
        return;
    }

    // Step 1: Get supplier_name (human readable name)
    frappe.call({
        method: 'frappe.client.get_value',
        args: {
            doctype: 'Supplier',
            filters: { name: supplier_id },
            fieldname: 'supplier_name'
        },
        callback: function(supplier_res) {
            if (!supplier_res.message || !supplier_res.message.supplier_name) {
                frappe.msgprint({
                    title: __('خطأ | Error'),
                    message: __('لا يمكن العثور على اسم المورد للمعرف: ') + supplier_id,
                    indicator: 'red'
                });
                return;
            }

            var supplier_name = supplier_res.message.supplier_name;
            console.log("Supplier Name:", supplier_name);

            // Step 2: Find customer by supplier_name
            find_customer(supplier_name, function(customer_id) {
                if (customer_id) {
                    create_sales_invoice(frm, customer_id);
                } else {
                    // Try fallback: maybe customer name matches supplier_id
                    find_customer(supplier_id, function(customer_id2) {
                        if (customer_id2) {
                            create_sales_invoice(frm, customer_id2);
                        } else {
                            frappe.msgprint({
                                title: __('خطأ | Error'),
                                message: __('لا يوجد عميل مرتبط بالمورد: ') + '<strong>' + supplier_name + '</strong><br>'
                                    + __('No Customer linked to supplier: ') + '<strong>' + supplier_name + '</strong>',
                                indicator: 'red'
                            });
                        }
                    });
                }
            });
        }
    });
}

function find_customer(search_name, callback) {
    // Try by customer_name first
    frappe.call({
        method: 'frappe.client.get_value',
        args: {
            doctype: 'Customer',
            filters: { customer_name: search_name },
            fieldname: 'name'
        },
        callback: function(r) {
            if (r.message && r.message.name) {
                callback(r.message.name);
                return;
            }
            // Try by name (ID) as fallback
            frappe.call({
                method: 'frappe.client.get_value',
                args: {
                    doctype: 'Customer',
                    filters: { name: search_name },
                    fieldname: 'name'
                },
                callback: function(r2) {
                    if (r2.message && r2.message.name) {
                        callback(r2.message.name);
                        return;
                    }
                    callback(null);
                }
            });
        }
    });
}

function create_sales_invoice(frm, customer) {
    console.log("Creating SI for customer:", customer);

    frappe.call({
        method: 'barcode_ui.api.purchase_receipt.make_sales_invoice',
        args: {
            source_name: frm.doc.name,
            customer: customer
        },
        freeze: true,
        freeze_message: __('جارٍ إنشاء فاتورة المبيعات...'),
        callback: function(res) {
            if (!res.message) {
                frappe.msgprint({
                    title: __('خطأ | Error'),
                    message: __('لم يتم إرجاع بيانات من الخادم'),
                    indicator: 'red'
                });
                return;
            }

            var data = res.message;

            frappe.model.with_doctype('Sales Invoice', function() {
                var new_doc = frappe.model.get_new_doc('Sales Invoice');

                // Use the customer ID we already have, or fall back to server response
                new_doc.customer = customer;
                new_doc.set_warehouse = data.set_warehouse || 'مخزن السن بالمكتب - C';

                new_doc.items = [];
                (data.items || []).forEach(function(item) {
                    var row = frappe.model.add_child(new_doc, 'Sales Invoice Item', 'items');
                    row.item_code        = item.item_code;
                    row.item_name        = item.item_name;
                    row.description      = item.description;
                    row.qty              = item.qty;
                    row.uom              = item.uom;
                    row.rate             = item.rate;
                    row.warehouse        = item.warehouse;
                    row.income_account   = '4121 - ايراد السن - C';
                    row.expense_account  = 'Finished Goods Stock (تكلفة البضاعة المباعة) - C';
                });

                frappe.set_route('Form', 'Sales Invoice', new_doc.name);
            });
        },
        error: function(err) {
            frappe.msgprint({
                title: __('خطأ | Error'),
                message: __('فشل في الاتصال بالخادم: ') + (err.message || err.statusText || 'Unknown error'),
                indicator: 'red'
            });
        }
    });
}
