frappe.pages['employee-stats'].on_page_load = function (wrapper) {
    // Set to true to load IBM Plex Sans from Google Fonts (the browser needs internet access).
    // With false, the page uses Plex if it is installed locally, otherwise the system font.
    const USE_WEB_FONT = false;

    // When the page is shown again after being idle longer than this, the data reloads quietly.
    const STALE_AFTER_MS = 60 * 1000;

    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __('Work Dashboard | لوحة العمل'),
        single_column: true
    });

    inject_assets();

    const $container = $(wrapper).find('.layout-main-section');
    const $dashboard = $('<div class="wd-root"></div>').appendTo($container);

    let request_id = 0;   // lets us ignore responses from superseded requests
    let last_load_at = 0; // timestamp of the last request start
    let has_data = false; // true once real data has been rendered

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------
    const esc = (v) => frappe.utils.escape_html(v == null ? '' : String(v));

    // Round to 1 decimal and drop a trailing ".0" (141.5333 -> "141.5", 142 -> "142")
    const num = (v) => String(Math.round(Number(v || 0) * 10) / 10);

    function initials(name) {
        return String(name || '?')
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part.charAt(0))
            .join('')
            .toUpperCase();
    }

    // ------------------------------------------------------------------
    // Rendering
    // ------------------------------------------------------------------
    function render_stat(cls, label_en, label_ar, value, note) {
        return `
            <div class="wd-stat ${cls}">
                <div class="wd-stat-label">${label_en}<span class="wd-ar" lang="ar">${label_ar}</span></div>
                <div class="wd-stat-value">${value}</div>
                ${note ? `<div class="wd-stat-note">${note}</div>` : ''}
            </div>
        `;
    }

    function render_eid(src) {
        return `
            <div class="wd-eid">
                <div>
                    <div class="wd-eid-label wd-ar" lang="ar">عيد الفطر</div>
                    <div class="wd-eid-value">${esc(src.eid_fitr || '—')}</div>
                </div>
                <div>
                    <div class="wd-eid-label wd-ar" lang="ar">عيد الأضحى</div>
                    <div class="wd-eid-value">${esc(src.eid_adha || '—')}</div>
                </div>
            </div>
        `;
    }

    function render_header(title_html, subtitle, eid_source) {
        return `
            <div class="wd-head">
                <div>
                    <div class="wd-title">${title_html}</div>
                    <div class="wd-subtitle">${subtitle}</div>
                </div>
                ${render_eid(eid_source)}
            </div>
        `;
    }

    function render_employee_card(emp) {
        const period = emp.period_label || emp.month || '';
        const reduced = emp.reduced_days_info
            ? `<div class="wd-reduced">${esc(emp.reduced_days_info)}</div>`
            : '';

        return `
            <div class="wd-card">
                <div class="wd-card-head">
                    <div class="wd-avatar">${esc(initials(emp.employee_name))}</div>
                    <div>
                        <div class="wd-name">${esc(emp.employee_name)}</div>
                        <div class="wd-period">${esc(period)}</div>
                        ${reduced}
                    </div>
                </div>
                <div class="wd-stats">
                    ${render_stat('', 'Days present', 'أيام الحضور', esc(emp.total_days))}
                    ${render_stat('', 'Working hours', 'ساعات العمل', num(emp.total_hours))}
                    ${render_stat('', 'Overtime hours', 'ساعات إضافية', num(emp.total_overtime_hours))}
                    ${render_stat('', 'Earned so far', 'الراتب المكتسب',
                        format_currency(emp.total_salary),
                        `${format_currency(emp.hourly_rate)}/hr`)}
                    ${render_stat('wd-adv', 'Advances paid', 'السلف', format_currency(emp.total_advance))}
                    ${render_stat('wd-net', 'Net balance', 'الصافي', format_currency(emp.net_remaining))}
                </div>
            </div>
        `;
    }

    function render_message(text, is_error) {
        return `<div class="wd-message ${is_error ? 'wd-message-error' : ''}">${text}</div>`;
    }

    // ------------------------------------------------------------------
    // Data
    // ------------------------------------------------------------------
    // silent = true is used for automatic refreshes: the current content stays on
    // screen until the new data arrives, and a failure doesn't interrupt the user.
    function load_data(silent) {
        const this_request = ++request_id;
        last_load_at = Date.now();

        if (!silent || !has_data) {
            $dashboard.html(render_message(__('Loading…'), false));
        }

        frappe.call({
            method: 'barcode_ui.barcode_ui.page.employee_stats.employee_stats.get_attendance_summary',
            callback: function (r) {
                if (this_request !== request_id) return; // a newer request is in flight

                if (!r.message) {
                    has_data = false;
                    $dashboard.html(render_message(__('No employee data available'), false));
                    return;
                }

                const response = r.message;

                if (response.error) {
                    has_data = false;
                    $dashboard.html(render_message(esc(response.error), true));
                    return;
                }

                const employees = response.employees || [];
                let html = '';

                if (response.is_admin && employees.length > 0) {
                    const first = employees[0];
                    html += render_header(
                        `Work Dashboard<span class="wd-ar" lang="ar">لوحة العمل</span>`,
                        `${employees.length} ${employees.length === 1 ? 'employee' : 'employees'}, ${esc(first.period_label || first.month || '')}`,
                        first
                    );
                    html += employees.map(render_employee_card).join('');
                } else if (!response.is_admin && employees.length > 0) {
                    const emp = employees[0];
                    html += render_header(
                        `Welcome, ${esc(emp.employee_name)}<span class="wd-ar" lang="ar">أهلاً، ${esc(emp.employee_name)}</span>`,
                        esc(emp.period_label || emp.month || ''),
                        emp
                    );
                    html += render_employee_card(emp);
                } else {
                    has_data = false;
                    $dashboard.html(render_message(__('No employee data available'), false));
                    return;
                }

                has_data = true;
                $dashboard.html(html);
            },
            error: function () {
                if (this_request !== request_id) return;

                last_load_at = 0; // let the next page view retry
                if (silent && has_data) return; // keep showing the last good data

                has_data = false;
                $dashboard.html(render_message(__('Failed to load attendance data.'), true));
                frappe.msgprint({
                    title: __('Error'),
                    indicator: 'red',
                    message: __('Failed to load attendance data. Please try again.')
                });
            }
        });
    }

    // ------------------------------------------------------------------
    // Keep the data fresh without hammering the server
    // ------------------------------------------------------------------
    function refresh_if_stale() {
        if (Date.now() - last_load_at > STALE_AFTER_MS) {
            load_data(true);
        }
    }

    // Fires when the user navigates back to this page
    $(wrapper).on('show', refresh_if_stale);

    // Fires when the browser tab becomes active again (only while this page is the visible one)
    $(document).on('visibilitychange.wd_employee_stats', function () {
        if (!document.hidden && $(wrapper).is(':visible')) {
            refresh_if_stale();
        }
    });

    load_data();
    page.set_primary_action(__('Refresh | تحديث'), () => load_data(), 'refresh');

    // ------------------------------------------------------------------
    // Styles (scoped under .wd-root so nothing leaks into the rest of the desk)
    // ------------------------------------------------------------------
    function inject_assets() {
        if (document.getElementById('wd-styles')) return;

        if (USE_WEB_FONT) {
            $('head').append(
                '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">'
            );
        }

        $('head').append(`
            <style id="wd-styles">
                .wd-root {
                    --wd-bg: #f4f6f8;
                    --wd-card: #ffffff;
                    --wd-line: #eef1f5;
                    --wd-border: #e2e8f0;
                    --wd-ink: #1e2a38;
                    --wd-muted: #64748b;
                    --wd-navy: #1e3a5f;
                    --wd-red: #b42318;
                    --wd-green: #15803d;
                    --wd-green-bg: #f2f9f5;

                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 28px;
                    background: var(--wd-bg);
                    color: var(--wd-ink);
                    border-radius: 10px;
                    font-family: 'IBM Plex Sans', 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    line-height: 1.4;
                }
                .wd-root *, .wd-root *::before, .wd-root *::after { box-sizing: border-box; }

                .wd-ar {
                    display: block;
                    font-family: 'IBM Plex Sans Arabic', 'Tajawal', 'Segoe UI', sans-serif;
                }

                /* Header */
                .wd-head {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: space-between;
                    align-items: flex-end;
                    gap: 14px 24px;
                    margin-bottom: 22px;
                }
                .wd-title { font-size: 22px; font-weight: 600; color: var(--wd-navy); }
                .wd-title .wd-ar { display: inline; margin-inline-start: 10px; font-size: 18px; font-weight: 500; color: var(--wd-muted); }
                .wd-subtitle { margin-top: 2px; font-size: 13px; color: var(--wd-muted); }

                .wd-eid { display: flex; gap: 28px; }
                .wd-eid-label { font-size: 12px; color: var(--wd-muted); }
                .wd-eid-value { font-size: 14px; font-weight: 500; color: var(--wd-navy); }

                /* Employee card */
                .wd-card {
                    margin-bottom: 16px;
                    overflow: hidden;
                    background: var(--wd-card);
                    border: 1px solid var(--wd-border);
                    border-radius: 8px;
                    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
                }
                .wd-card-head {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 20px;
                    border-bottom: 1px solid var(--wd-line);
                }
                .wd-avatar {
                    flex: none;
                    display: grid;
                    place-items: center;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: #e8eef6;
                    color: var(--wd-navy);
                    font-size: 13px;
                    font-weight: 600;
                }
                .wd-name { font-size: 16px; font-weight: 600; }
                .wd-period { font-size: 12px; color: var(--wd-muted); }
                .wd-reduced { font-size: 12px; color: var(--wd-navy); margin-top: 1px; }

                /* Stats: 1px gaps over a tinted background give clean dividers that survive wrapping and RTL */
                .wd-stats {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 1px;
                    background: var(--wd-line);
                }
                .wd-stat { padding: 16px 20px; background: var(--wd-card); }
                .wd-stat-label { font-size: 12px; color: var(--wd-muted); line-height: 1.35; }
                .wd-stat-label .wd-ar { font-size: 11.5px; }
                .wd-stat-value {
                    margin-top: 8px;
                    font-size: 22px;
                    font-weight: 600;
                    color: var(--wd-navy);
                    font-variant-numeric: tabular-nums;
                }
                .wd-stat-note { margin-top: 2px; font-size: 12px; color: var(--wd-muted); font-variant-numeric: tabular-nums; }
                .wd-stat.wd-adv .wd-stat-value { color: var(--wd-red); }
                .wd-stat.wd-net { background: var(--wd-green-bg); }
                .wd-stat.wd-net .wd-stat-value { color: var(--wd-green); }

                /* Loading / empty / error */
                .wd-message { padding: 40px 16px; text-align: center; font-size: 15px; color: var(--wd-muted); }
                .wd-message-error { color: var(--wd-red); }

                @media (max-width: 940px) {
                    .wd-stats { grid-template-columns: repeat(3, 1fr); }
                }
                @media (max-width: 560px) {
                    .wd-root { padding: 16px; }
                    .wd-stats { grid-template-columns: repeat(2, 1fr); }
                    .wd-eid { gap: 20px; }
                }
            </style>
        `);
    }
};
