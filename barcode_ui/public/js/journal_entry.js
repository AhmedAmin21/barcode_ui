frappe.ui.form.on("Journal Entry", {
    refresh(frm) {
        // Show button ONLY to System Manager / Administrator
        const is_admin = frappe.user.has_role("System Manager") || frappe.session.user === "Administrator";
        if (!is_admin) return;

        frm.add_custom_button(__("Generate Payroll JEs"), () => {
            const d = new frappe.ui.Dialog({
                title: __("Generate Payroll Journal Entries"),
                fields: [
                    {
                        fieldname: "start_date",
                        fieldtype: "Date",
                        label: __("Period Start"),
                        reqd: 1,
                        default: moment().subtract(1, "month").date(26).format("YYYY-MM-DD"),
                    },
                    {
                        fieldname: "end_date",
                        fieldtype: "Date",
                        label: __("Period End"),
                        reqd: 1,
                        default: moment().date(25).format("YYYY-MM-DD"),
                    },
                    {
                        fieldname: "posting_date",
                        fieldtype: "Date",
                        label: __("Posting Date"),
                        default: frappe.datetime.get_today(),
                    },
                    {
                        fieldname: "info",
                        fieldtype: "HTML",
                        options: `<p class="text-muted">${__("This will generate 3 JEs in order: Payroll Accrual → Advance Settlement → Cash Payment.")}</p>`,
                    },
                ],
                primary_action_label: __("Generate"),
                primary_action(values) {
                    frappe.call({
                        method: "barcode_ui.payroll.generate_all.generate_payroll_jes",
                        args: {
                            start_date: values.start_date,
                            end_date: values.end_date,
                            posting_date: values.posting_date,
                        },
                        freeze: true,
                        freeze_message: __("Generating payroll JEs..."),
                        callback(r) {
                            d.hide();
                            if (!r.message) return;

                            const res = r.message.results;
                            let html = `<h5>${r.message.period}</h5><ul>`;
                            for (const [k, v] of Object.entries(res)) {
                                const color = v.status === "success" ? "green" : (v.status === "skipped" ? "orange" : "red");
                                const name = v.journal_entry ? ` — <b>${v.journal_entry}</b> (${fmt_money(v.total)})` : "";
                                html += `<li style="color:${color}"><b>${k}</b>: ${v.status}${name} ${v.message || v.reason || ""}</li>`;
                            }
                            html += `</ul>`;

                            frappe.msgprint({
                                title: r.message.ok ? __("Done") : __("Partially Failed"),
                                indicator: r.message.ok ? "green" : "orange",
                                message: html,
                                wide: true,
                            });
                        },
                    });
                },
            });
            d.show();
        }, __("Payroll"));
    },
});
