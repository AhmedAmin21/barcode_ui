frappe.ui.form.on('Supplier', {
    refresh: function(frm) {
        if (frm.is_new()) return;

        frappe.db.get_value('Customer', { 'customer_name': frm.doc.supplier_name }, 'name', function(r) {
            if (r && r.name) {
                frm.dashboard.set_headline(
                    __('Customer already exists: ') + '<a href="/app/customer/' + r.name + '">' + r.name + '</a>'
                );
            } else {
                frm.add_custom_button(__('Create Customer'), function() {
                    frappe.confirm(
                        __('Create a Customer from this Supplier?'),
                        function() {
                            frappe.call({
                                method: 'barcode_ui.api.supplier_to_customer.create_customer_from_supplier',
                                args: { supplier_name: frm.doc.name },
                                freeze: true,
                                freeze_message: __('Creating Customer...'),
                                callback: function(r) {
                                    if (r.message && r.message.customer) {
                                        frappe.set_route('Form', 'Customer', r.message.customer);
                                    }
                                }
                            });
                        }
                    );
                });

                setTimeout(function() {
                    var $btn = frm.page.inner_toolbar.find('button').filter(function() {
                        return $(this).text().trim() === 'Create Customer';
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

