frappe.ui.form.on('Employee Attendance Summary', {
    refresh: function(frm) {
        // Add the Fetch Stats button
        frm.add_custom_button(__('Fetch Stats'), function() {
            frm.call({
                doc: frm.doc,
                method: 'fetch_employee_stats',
                callback: function(r) {
                    frm.refresh_field('employees');
                    frappe.show_alert({message:__('Stats Calculated'), indicator:'green'});
                }
            });
        }).addClass('btn-primary');
    }, // <--- THIS COMMA IS CRITICAL

    reference_date: function(frm) {
        if (frm.doc.reference_date) {
            let ref_date = frappe.datetime.str_to_obj(frm.doc.reference_date);
            let day = ref_date.getDate();
            let target_date_str;

            // Logic: 26th of current month to 25th of next
            if (day >= 26) {
                target_date_str = frappe.datetime.add_months(frm.doc.reference_date, 1);
            } else {
                target_date_str = frm.doc.reference_date;
            }

            // Get month name from the target date string
            let target_obj = frappe.datetime.str_to_obj(target_date_str);
            let month_names = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            
            let month_name = month_names[target_obj.getMonth()];
            let year = target_obj.getFullYear();
            
            // Set the field instantly
            frm.set_value('month_year', `${month_name} ${year}`);
        }
    }
});
