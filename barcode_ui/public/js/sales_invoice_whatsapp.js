frappe.ui.form.on('Sales Invoice', {
    refresh: function(frm) {
        // Only show button if invoice is submitted and has NOT been sent yet
        if (frm.doc.docstatus === 1 && !frm.doc.custom_whatsapp_sent) {
            frm.page.wrapper.find('.btn-whatsapp-invoice').remove();

            const whatsapp_icon = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" style="margin-left:6px; vertical-align:middle;">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15
                        -.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075
                        -.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059
                        -.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52
                        .149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52
                        -.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51
                        -.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372
                        -.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074
                        .149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625
                        .712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413
                        .248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.558 4.136 1.532 5.875L.057 23.428
                        a.75.75 0 00.918.943l5.84-1.53A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z
                        M12 22c-1.891 0-3.667-.523-5.188-1.432l-.372-.22-3.862 1.013 1.03-3.747-.242-.386
                        A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>`;

            const $btn = $(`
                <button class="btn btn-whatsapp-invoice" style="
                    background-color: #25D366;
                    color: white;
                    border: none;
                    padding: 6px 14px;
                    border-radius: 6px;
                    font-weight: 500;
                    font-size: 13px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    margin-left: 8px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
                    transition: background 0.2s ease;
                ">
                    ${whatsapp_icon} إرسال عبر واتساب
                </button>
            `);

            $btn.on('click', function() {
                open_whatsapp_recipients_dialog(frm);
            });

            frm.page.wrapper.find('.page-actions').prepend($btn);
        } else {
            frm.page.wrapper.find('.btn-whatsapp-invoice').remove();
        }
    }
});

function open_whatsapp_recipients_dialog(frm) {
    frappe.call({
        method: 'barcode_ui.sales_invoice_whatsapp.get_customer_whatsapp_recipients',
        args: {
            docname: frm.doc.name,
            customer: frm.doc.customer
        },
        freeze: true,
        freeze_message: __('جاري البحث عن أرقام الواتساب لجهات الاتصال المرتبطة...'),
        callback: function(r) {
            const recipients = r.message || [];

            if (!recipients.length) {
                frappe.msgprint({
                    title: __('لا توجد أرقام واتساب متاحة'),
                    indicator: 'orange',
                    message: `<div dir="rtl" style="text-align:right;">لم يتم العثور على أرقام موبايل صالحة في جهات الاتصال المرتبطة بهذا العميل <b>${frappe.utils.escape_html(frm.doc.customer_name || frm.doc.customer)}</b>.<br><br><small class="text-muted">ملاحظة: يتم استبعاد الأرقام الأرضية تلقائياً.</small></div>`
                });
                return;
            }

            render_live_stepper_dialog(frm, recipients);
        }
    });
}

function render_live_stepper_dialog(frm, recipients) {
    let rows_html = recipients.map(function(rec, idx) {
        const badge_primary = rec.is_primary ? '<span class="badge" style="background:#0284c7; color:#ffffff; font-size:10px; padding:2px 7px; border-radius:4px; margin-right:8px; font-weight:500;">رئيسي</span>' : '';
        const designation_html = rec.designation ? `<div class="text-muted" style="font-size:11px; margin-top:2px;">${frappe.utils.escape_html(rec.designation)}</div>` : '';

        return `
            <tr id="wp-row-${idx}" style="border-bottom: 1px solid #f1f5f9; transition: background 0.3s ease;">
                <td class="wp-col-check" style="width: 44px; text-align: center; vertical-align: middle; padding: 10px 4px;">
                    <input type="checkbox" class="wp-recipient-check" data-idx="${idx}" checked style="width:16px; height:16px; cursor:pointer;" />
                </td>
                <td style="vertical-align: middle; padding: 10px 10px; text-align: right;">
                    <div style="font-weight: 600; color: #1e293b; display: flex; align-items: center;">
                        <span>${frappe.utils.escape_html(rec.contact_name)}</span>
                        ${badge_primary}
                    </div>
                    ${designation_html}
                </td>
                <td style="vertical-align: middle; padding: 10px 12px; direction: ltr; text-align: left; font-family: monospace; font-size: 13px; font-weight: 600; color: #047857;">
                    ${frappe.utils.escape_html(rec.display_phone || rec.phone)}
                </td>
                <td class="wp-col-status" style="width: 130px; vertical-align: middle; padding: 10px 8px; text-align: left; display: none;">
                    <span class="wp-status-placeholder text-muted" style="font-size: 11px;">في الانتظار</span>
                </td>
            </tr>
        `;
    }).join('');

    const content_html = `
        <div dir="rtl" style="direction: rtl; text-align: right; font-family: inherit;">
            <div id="wp-dialog-banner" style="margin-bottom: 14px; font-size: 13px; line-height: 1.7; color: #334155;">
                سيتم إرسال الفاتورة <bdi style="font-weight: bold; color: #0f172a; direction: ltr; display: inline-block;">${frappe.utils.escape_html(frm.doc.name)}</bdi> بصيغة ملف إلكتروني (PDF) إلى الأرقام المحددة أدناه:
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                    (تم استبعاد جميع الأرقام الأرضية تلقائياً)
                </div>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fff;">
                <div id="wp-table-header" style="padding: 8px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; direction: rtl;">
                    <label style="margin: 0; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-weight: 600; color: #334155;">
                        <input type="checkbox" id="wp-select-all" checked style="cursor:pointer;" /> تحديد الكل
                    </label>
                    <span class="text-muted" style="font-size: 12px;">
                        ${recipients.length} رقم متاح
                    </span>
                </div>
                <div style="max-height: 280px; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; direction: rtl;">
                        <tbody>
                            ${rows_html}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Live Status Area -->
            <div id="wp-live-stepper" style="display: none; margin-top: 15px; padding: 14px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <div id="wp-step-message" style="font-size: 13px; font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                    <i class="fa fa-spinner fa-spin text-primary"></i>
                    <span class="wp-msg-text">جاري بدء عملية الإرسال...</span>
                </div>
            </div>
        </div>
    `;

    const d = new frappe.ui.Dialog({
        title: __('إرسال الفاتورة عبر واتساب'),
        fields: [
            {
                fieldname: 'recipients_html',
                fieldtype: 'HTML',
                options: content_html
            }
        ],
        primary_action_label: __('إرسال الفاتورة الآن'),
        primary_action: function() {
            // If already completed, close modal
            if (d.is_completed) {
                d.hide();
                return;
            }

            const selected_recipients = [];
            d.$wrapper.find('.wp-recipient-check:checked').each(function() {
                const idx = parseInt($(this).attr('data-idx'), 10);
                if (recipients[idx]) {
                    // Attach the exact row index
                    const item = Object.assign({}, recipients[idx], { _row_idx: idx });
                    selected_recipients.push(item);
                }
            });

            if (!selected_recipients.length) {
                frappe.msgprint({
                    message: '<div dir="rtl" style="text-align:right;">يرجى تحديد رقم واحد على الأقل للإرسال.</div>',
                    indicator: 'orange'
                });
                return;
            }

            // Lock controls & start stepper
            d.get_primary_btn().prop('disabled', true).text('جاري الإرسال...');
            d.$wrapper.find('.wp-recipient-check, #wp-select-all').prop('disabled', true);
            d.$wrapper.find('.wp-col-check').hide();
            d.$wrapper.find('#wp-table-header').hide();

            // Remove unselected rows from the table so they are not shown during/after sending
            d.$wrapper.find('.wp-recipient-check:not(:checked)').closest('tr').remove();

            d.$wrapper.find('.wp-col-status').show();
            d.$wrapper.find('.modal-header .close').hide();
            d.$wrapper.find('#wp-live-stepper').slideDown(200);

            execute_live_stepper(frm, d, selected_recipients);
        }
    });

    d.$wrapper.find('.modal-title').css({
        'direction': 'rtl',
        'text-align': 'right',
        'width': '100%'
    });
    d.$wrapper.find('.modal-header').css('direction', 'rtl');

    // Wire up Select All checkbox
    d.$wrapper.find('#wp-select-all').on('change', function() {
        const checked = $(this).is(':checked');
        d.$wrapper.find('.wp-recipient-check').prop('checked', checked);
    });

    d.$wrapper.find('.wp-recipient-check').on('change', function() {
        const total = d.$wrapper.find('.wp-recipient-check').length;
        const checked = d.$wrapper.find('.wp-recipient-check:checked').length;
        d.$wrapper.find('#wp-select-all').prop('checked', total === checked);
    });

    d.show();
}

function execute_live_stepper(frm, d, selected_recipients) {
    const $msgText = d.$wrapper.find('.wp-msg-text');
    const $spinnerIcon = d.$wrapper.find('#wp-step-message i');

    let current_index = 0;
    let success_count = 0;
    let failed_count = 0;
    const results = [];

    // Step 1: Generate PDF once in memory and cache it
    $msgText.text('جاري إنشاء وتجهيز ملف الفاتورة PDF...');
    $spinnerIcon.attr('class', 'fa fa-spinner fa-spin text-primary');

    frappe.call({
        method: 'barcode_ui.sales_invoice_whatsapp.prepare_invoice_whatsapp_media',
        args: { docname: frm.doc.name },
        callback: function(r) {
            if (r.exc) {
                $msgText.text('فشل تجهيز ملف PDF. يرجى المحاولة لاحقاً.').css('color', '#dc2626');
                $spinnerIcon.attr('class', 'fa fa-times text-danger');
                d.get_primary_btn().prop('disabled', false).text('إغلاق');
                d.is_completed = true;
                return;
            }

            // Step 2: Sequential recipient dispatch with smooth gap
            dispatch_next_recipient();
        },
        error: function() {
            $msgText.text('حدث خطأ أثناء إنشاء ملف PDF.').css('color', '#dc2626');
            $spinnerIcon.attr('class', 'fa fa-times text-danger');
            d.get_primary_btn().prop('disabled', false).text('إغلاق');
            d.is_completed = true;
        }
    });

    function dispatch_next_recipient() {
        if (current_index >= selected_recipients.length) {
            finish_stepper();
            return;
        }

        const rec = selected_recipients[current_index];
        const row_idx = rec._row_idx;
        const $row = d.$wrapper.find(`#wp-row-${row_idx}`);
        const $statusCell = $row.find('.wp-col-status');

        $row.css('background', '#eff6ff');
        $statusCell.html('<span class="text-primary" style="font-size:11px; font-weight:500;"><i class="fa fa-spinner fa-spin"></i> جاري الإرسال...</span>');
        $msgText.text(`جاري الإرسال إلى: ${rec.contact_name} (+${rec.phone})...`);
        $spinnerIcon.attr('class', 'fa fa-spinner fa-spin text-primary');

        frappe.call({
            method: 'barcode_ui.sales_invoice_whatsapp.send_single_whatsapp_recipient',
            args: {
                docname: frm.doc.name,
                phone: rec.phone,
                contact_name: rec.contact_name
            },
            callback: function(res) {
                const outcome = res.message || { status: 'failed', error: 'خطأ اتصال' };
                results.push(outcome);

                if (outcome.status === 'success') {
                    success_count++;
                    $row.css('background', '#f0fdf4');
                    $statusCell.html('<span class="badge" style="background:#dcfce7; color:#15803d; font-size:11px; padding:3px 8px; border-radius:4px;"><i class="fa fa-check"></i> تم بنجاح</span>');
                } else {
                    failed_count++;
                    $row.css('background', '#fef2f2');
                    const err = frappe.utils.escape_html(outcome.error || 'فشل');
                    $statusCell.html(`<span class="badge" style="background:#fee2e2; color:#b91c1c; font-size:11px; padding:3px 8px; border-radius:4px;" title="${err}"><i class="fa fa-times"></i> فشل</span><div class="text-danger" style="font-size:10px; margin-top:2px;">${err}</div>`);
                }

                current_index++;

                // If more recipients remain, wait 2.5s smoothly before sending next
                if (current_index < selected_recipients.length) {
                    const next_rec = selected_recipients[current_index];
                    $msgText.text(`جاري تجهيز الرقم التالي: ${next_rec.contact_name}...`);
                    $spinnerIcon.attr('class', 'fa fa-spinner fa-spin text-muted');

                    setTimeout(function() {
                        dispatch_next_recipient();
                    }, 2500);
                } else {
                    finish_stepper();
                }
            },
            error: function() {
                failed_count++;
                $row.css('background', '#fef2f2');
                $statusCell.html('<span class="badge" style="background:#fee2e2; color:#b91c1c; font-size:11px; padding:3px 8px; border-radius:4px;"><i class="fa fa-times"></i> خطأ اتصال</span>');
                current_index++;

                if (current_index < selected_recipients.length) {
                    setTimeout(function() {
                        dispatch_next_recipient();
                    }, 2500);
                } else {
                    finish_stepper();
                }
            }
        });
    }

    function finish_stepper() {
        if (success_count > 0) {
            frappe.call({
                method: 'barcode_ui.sales_invoice_whatsapp.finalize_invoice_whatsapp',
                args: { docname: frm.doc.name },
                callback: function() {
                    frm.doc.custom_whatsapp_sent = 1;
                    frm.refresh_field('custom_whatsapp_sent');
                    frm.page.wrapper.find('.btn-whatsapp-invoice').remove();
                }
            });
        }

        const is_all_ok = failed_count === 0;
        const banner_bg = is_all_ok ? '#f0fdf4' : (success_count > 0 ? '#fffbeb' : '#fef2f2');
        const banner_border = is_all_ok ? '#bbf7d0' : (success_count > 0 ? '#fde68a' : '#fecaca');
        const banner_color = is_all_ok ? '#15803d' : (success_count > 0 ? '#b45309' : '#b91c1c');

        d.$wrapper.find('#wp-dialog-banner').html(`
            <div style="padding: 10px 14px; background: ${banner_bg}; border: 1px solid ${banner_border}; border-radius: 8px; display: flex; align-items: center; gap: 10px;">
                <i class="fa ${is_all_ok ? 'fa-check-circle' : 'fa-info-circle'}" style="font-size: 20px; color: ${banner_color};"></i>
                <div>
                    <div style="font-weight: 600; color: ${banner_color}; font-size: 13px;">
                        ${is_all_ok ? 'اكتمل الإرسال بنجاح لجميع الأرقام المحددة!' : 'اكتملت عملية الإرسال'}
                    </div>
                    <div style="font-size: 11px; color: #475569; margin-top: 1px;">
                        تم الإرسال: <b style="color:#15803d;">${success_count}</b> | فشل: <b style="color:#b91c1c;">${failed_count}</b> من إجمالي <b>${selected_recipients.length}</b>
                    </div>
                </div>
            </div>
        `);

        $msgText.text('تمت معالجة كافة الأرقام المطلوبة.').css('color', '#15803d');
        $spinnerIcon.attr('class', 'fa fa-check-circle text-success');

        d.$wrapper.find('.modal-header .close').show();
        d.get_primary_btn().prop('disabled', false).text('إغلاق');
        d.set_title(__('تقرير إرسال الفاتورة عبر واتساب'));
        d.is_completed = true;
    }
}
