frappe.ui.form.on('Over Time', {
        refresh(frm) {
                if (frm.is_new() && !frm.doc.employee) {
                        frappe.call({
                                method: 'frappe.client.get_value',
                                args: {
                                        doctype: 'Employee',
                                        filters: { user_id: frappe.session.user },
                                        fieldname: 'name'
                                },
                                callback(r) {
                                        if (r.message) {
                                                frm.set_value('employee', r.message.name);
                                        } else {
                                                frappe.msgprint("No employee record linked to your account");
                                        }
                                }
                        });
                }
        },

        checkin_datetime(frm) {
                if (frm.doc.checkout_datetime) {
                        calculate_overtime(frm);
                }
        },

        checkout_datetime(frm) {
                if (frm.doc.checkin_datetime) {
                        calculate_overtime(frm);
                }
        }
});

function calculate_overtime(frm) {
        const checkin = frappe.datetime.str_to_obj(frm.doc.checkin_datetime);
        const checkout = frappe.datetime.str_to_obj(frm.doc.checkout_datetime);

        if (checkout <= checkin) {
                frappe.msgprint("Check-out must be after Check-in");
                frm.set_value('checkout_datetime', '');
                frm.set_value('total_overtime', 0);
                return;
        }

        const diffMs = checkout - checkin;
        const hours = diffMs / (1000 * 60 * 60);
        frm.set_value('total_overtime', flt(hours, 2));
}
