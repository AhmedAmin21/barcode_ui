frappe.ui.form.on('Customer', {
    refresh: function(frm) {
        if (frm.is_new()) return;

        frappe.db.get_value('Supplier', { 'supplier_name': frm.doc.customer_name }, 'name', function(r) {
            if (r && r.name) {
                frm.dashboard.set_headline(
                    __('Supplier already exists: ') + '<a href="/app/supplier/' + r.name + '">' + r.name + '</a>'
                );
            } else {
                frm.add_custom_button(__('Create Supplier'), function() {
                    frappe.confirm(
                        __('Create a Supplier from this Customer?'),
                        function() {
                            frappe.call({
                                method: 'barcode_ui.api.customer_to_supplier.create_supplier_from_customer',
                                args: { customer_name: frm.doc.name },
                                freeze: true,
                                freeze_message: __('Creating Supplier...'),
                                callback: function(r) {
                                    if (r.message && r.message.supplier) {
                                        frappe.set_route('Form', 'Supplier', r.message.supplier);
                                    }
                                }
                            });
                        }
                    );
                });

                setTimeout(function() {
                    var $btn = frm.page.inner_toolbar.find('button').filter(function() {
                        return $(this).text().trim() === 'Create Supplier';
                    });
                    var normalStyle =
                        'background-color: #00bcd4 !important;' +
                        'border-color: #0097a7 !important;' +
                        'color: #ffffff !important;' +
                        'box-shadow: 0 0 8px rgba(0, 188, 212, 0.6) !important;' +
                        'font-weight: 600 !important;' +
                        'transition: all 0.2s ease !important;';
                    var hoverStyle =
                        'background-color: #0097a7 !important;' +
                        'border-color: #00796b !important;' +
                        'color: #ffffff !important;' +
                        'box-shadow: 0 0 16px rgba(0, 188, 212, 0.9) !important;' +
                        'font-weight: 600 !important;' +
                        'transition: all 0.2s ease !important;';
                    $btn.attr('style', normalStyle);
                    $btn.on('mouseenter', function() {
                        $(this).attr('style', hoverStyle);
                    });
                    $btn.on('mouseleave', function() {
                        $(this).attr('style', normalStyle);
                    });
                    frm.page.inner_toolbar.prepend($btn);
                }, 100);
            }
        });
    }
});
