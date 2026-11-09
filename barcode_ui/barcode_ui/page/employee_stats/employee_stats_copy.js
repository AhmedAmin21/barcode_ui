frappe.pages['employee-stats'].on_page_load = function(wrapper) {
    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __('Work Dashboard | لوحة العمل'),
        single_column: true
    });

    let $container = $(wrapper).find('.layout-main-section');

    // Inject optimized styles
    $container.append(`
        <style>
            #employee-dashboard-container * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            #employee-dashboard-container {
                font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: #0f0f23;
                min-height: 100vh;
                padding: 20px 15px;
                position: relative;
                overflow-x: hidden;
            }

            #employee-dashboard-container::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background:
                    radial-gradient(circle at 20% 50%, rgba(147, 51, 234, 0.15) 0%, transparent 50%),
                    radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
                    radial-gradient(circle at 40% 20%, rgba(239, 68, 68, 0.1) 0%, transparent 50%);
                animation: pulse 8s ease-in-out infinite;
                pointer-events: none;
                z-index: 0;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }

            .dash-container {
                max-width: 1400px;
                margin: 0 100px;
                position: relative;
                z-index: 1;
            }

            .dash-page-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 16px;
                padding: 25px 30px;
                margin-bottom: 20px;
                box-shadow: 0 20px 60px rgba(102, 126, 234, 0.4);
                position: relative;
                overflow: hidden;
                animation: slideDown 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .dash-page-header::before {
                content: '';
                position: absolute;
                top: -50%;
                right: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                animation: rotate 20s linear infinite;
            }

            @keyframes rotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-50px) scale(0.9); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            .dash-admin-badge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: rgba(255, 255, 255, 0.2);
                backdrop-filter: blur(10px);
                padding: 6px 18px;
                border-radius: 50px;
                font-size: 12px;
                font-weight: 600;
                color: white;
                margin-bottom: 12px;
                border: 1px solid rgba(255, 255, 255, 0.3);
                position: relative;
                z-index: 1;
            }

            .dash-page-title {
                font-size: 32px;
                text-align: center;
                font-weight: 800;
                color: white;
                margin-bottom: 6px;
                position: relative;
                z-index: 1;
                text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            }

            .dash-page-subtitle {
                font-size: 14px;
                text-align: center;
                color: rgba(255, 255, 255, 0.9);
                font-weight: 500;
                position: relative;
                z-index: 1;
            }

            .dash-eid-section {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }

            .dash-eid-card {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                border-radius: 12px;
                padding: 18px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(245, 87, 108, 0.3);
                transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                animation: fadeInUp 0.6s ease-out both;
                position: relative;
                overflow: hidden;
            }

            .dash-eid-card:nth-child(2) {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                box-shadow: 0 10px 30px rgba(79, 172, 254, 0.3);
                animation-delay: 0.1s;
            }

            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .dash-eid-card:nth-child(2) {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                box-shadow: 0 10px 30px rgba(79, 172, 254, 0.3);
                animation-delay: 0.1s;
            }

            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .dash-eid-card::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%);
                transform: scale(0);
                transition: transform 0.6s ease;
            }

            .dash-eid-card:hover::before {
                transform: scale(1);
            }

            .dash-eid-card:hover {
                transform: translateY(-8px) scale(1.02);
            }

            .dash-eid-icon {
                font-size: 24px;
                margin-bottom: 8px;
            }

            .dash-eid-label {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.9);
                margin-bottom: 6px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .dash-eid-value {
                font-size: 18px;
                font-weight: 800;
                color: white;
            }

            .dash-employee-section {
                background: #1a1a2e;
                border-radius: 16px;
                padding: 25px;
                margin-bottom: 20px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.05);
                transition: all 0.3s ease;
                animation: scaleIn 0.5s ease-out both;
            }

            .dash-employee-section:nth-child(n+3) {
                animation-delay: calc((var(--index, 0)) * 0.1s);
            }

            @keyframes scaleIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }

            .dash-employee-section:hover {
                border-color: rgba(102, 126, 234, 0.3);
                box-shadow: 0 15px 50px rgba(102, 126, 234, 0.2);
            }

            .dash-employee-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid rgba(255, 255, 255, 0.05);
            }

            .dash-employee-name {
                font-size: 24px;
                font-weight: 700;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .dash-employee-period {
                font-size: 12px;
                color: #8d99a6;
                margin-top: 4px;
                font-weight: 500;
            }

            .dash-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                gap: 12px;
            }

            .dash-stat-card {
                background: linear-gradient(135deg, #2d2d44 0%, #1f1f2e 100%);
                border-radius: 12px;
                padding: 18px 16px;
                text-align: center;
                transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                border: 2px solid transparent;
                position: relative;
                overflow: hidden;
            }

            .dash-stat-card::before {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.03) 100%);
                opacity: 0;
                transition: opacity 0.3s;
            }

            .dash-stat-card:hover::before {
                opacity: 1;
            }

            .dash-stat-card:hover {
                transform: translateY(-8px) scale(1.03);
                border-color: currentColor;
            }
            .dash-stat-icon {
                font-size: 24px;
                margin-bottom: 8px;
                display: block;
            }

            .dash-stat-label {
                font-size: 9px;
                font-weight: 700;
                color: #8d99a6;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 10px;
                line-height: 1.3;
            }

            .dash-stat-value {
                font-size: 28px;
                font-weight: 800;
                margin-bottom: 6px;
                line-height: 1;
            }

            .dash-stat-note {
                font-size: 10px;
                font-weight: 600;
                opacity: 0.7;
                margin-top: 4px;
            }

            .dash-stat-card.primary { border-color: #667eea; }
            .dash-stat-card.primary .dash-stat-value,
            .dash-stat-card.primary .dash-stat-note { color: #667eea; }
            .dash-stat-card.primary .dash-stat-icon { filter: drop-shadow(0 0 8px rgba(102, 126, 234, 0.5)); }

            .dash-stat-card.blue { border-color: #3498db; }
            .dash-stat-card.blue .dash-stat-value,
            .dash-stat-card.blue .dash-stat-note { color: #3498db; }
            .dash-stat-card.blue .dash-stat-icon { filter: drop-shadow(0 0 8px rgba(52, 152, 219, 0.5)); }

            .dash-stat-card.purple { border-color: #9b59b6; }
            .dash-stat-card.purple .dash-stat-value,
            .dash-stat-card.purple .dash-stat-note { color: #9b59b6; }
            .dash-stat-card.purple .dash-stat-icon { filter: drop-shadow(0 0 8px rgba(155, 89, 182, 0.5)); }

            .dash-stat-card.green { border-color: #2ecc71; }
            .dash-stat-card.green .dash-stat-value,
            .dash-stat-card.green .dash-stat-note { color: #2ecc71; }
            .dash-stat-card.green .dash-stat-icon { filter: drop-shadow(0 0 8px rgba(46, 204, 113, 0.5)); }

            .dash-stat-card.red { border-color: #e74c3c; }
            .dash-stat-card.red .dash-stat-value,
            .dash-stat-card.red .dash-stat-note { color: #e74c3c; }
            .dash-stat-card.red .dash-stat-icon { filter: drop-shadow(0 0 8px rgba(231, 76, 60, 0.5)); }

            .dash-stat-card.highlight {
                background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
                border: none;
                box-shadow: 0 8px 24px rgba(46, 204, 113, 0.4);
            }

            .dash-stat-card.highlight .dash-stat-label,
            .dash-stat-card.highlight .dash-stat-value,
            .dash-stat-card.highlight .dash-stat-note {
                color: white;
            }

            .dash-stat-card.highlight .dash-stat-icon {
                filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.5));
            }

            @media (max-width: 768px) {
                .dash-page-title { font-size: 26px; }
                .dash-stats-grid { grid-template-columns: repeat(2, 1fr); }
                .dash-employee-section { padding: 20px 16px; }
                .dash-employee-name { font-size: 20px; }
            }

            @media (max-width: 480px) {
                .dash-stats-grid { grid-template-columns: 1fr; }
            }
        </style>
    `);

    $container.append('<div id="employee-dashboard-container"></div>');
    let $dashboard = $('#employee-dashboard-container');

    function render_employee_card(emp) {
        return `
            <div class="dash-employee-section" style="--index: ${emp.index || 0}">
                <div class="dash-employee-header">
                    <div>
                        <div class="dash-employee-name">${emp.employee_name}</div>
                        <div class="dash-employee-period">${emp.period_label || emp.month}</div>
                        <div class="dash-employee-period" style="color: #667eea; margin-top: 2px;">${emp.reduced_days_info || ''}</div>
                    </div>
                </div>
                <div class="dash-stats-grid">
                    <div class="dash-stat-card primary">
                        <span class="dash-stat-icon">📅</span>
                        <div class="dash-stat-label">Days Present<br>أيام الحضور</div>
                        <div class="dash-stat-value">${emp.total_days}</div>
                    </div>
                    <div class="dash-stat-card blue">
                        <span class="dash-stat-icon">⏱️</span>
                        <div class="dash-stat-label">Working Hours<br>ساعات العمل</div>
                        <div class="dash-stat-value">${emp.total_hours}</div>
                    </div>
                    <div class="dash-stat-card purple">
                        <span class="dash-stat-icon">⏰</span>
                        <div class="dash-stat-label">Overtime Hours<br>ساعات الإضافية</div>
                        <div class="dash-stat-value">${emp.total_overtime_hours || 0}</div>
                    </div>
                    <div class="dash-stat-card green">
                        <span class="dash-stat-icon">💰</span>
                        <div class="dash-stat-label">Earned So Far<br>الراتب المكتسب</div>
                        <div class="dash-stat-value">${format_currency(emp.total_salary)}</div>
                        <div class="dash-stat-note">${format_currency(emp.hourly_rate)}/hr</div>
                    </div>
                    <div class="dash-stat-card red">
                        <span class="dash-stat-icon">💳</span>
                        <div class="dash-stat-label">Advances Paid<br>السلف</div>
                        <div class="dash-stat-value">${format_currency(emp.total_advance)}</div>
                    </div>
                    <div class="dash-stat-card highlight">
                        <span class="dash-stat-icon">✨</span>
                        <div class="dash-stat-label">Net Balance<br>الصافي</div>
                        <div class="dash-stat-value">${format_currency(emp.net_remaining)}</div>
                    </div>
                </div>
            </div>
        `;
    }

    function load_data() {
        frappe.call({
            method: 'barcode_ui.barcode_ui.page.employee_stats.employee_stats.get_attendance_summary',
            callback: function(r) {
                if (!r.message) return;

                let response = r.message;
                $dashboard.empty();

                if (response.error) {
                    $dashboard.html(`
                        <div class="dash-container">
                            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                                <h3>${response.error}</h3>
                            </div>
                        </div>
                    `);
                    return;
                }

                let html = '<div class="dash-container">';

                if (response.is_admin && response.employees.length > 0) {
                    let firstEmp = response.employees[0];
                    html += `
                        <div class="dash-page-header">
                            <div class="dash-admin-badge">
                                <span>👨‍💼</span>
                                <span>ADMIN DASHBOARD</span>
                            </div>
                            <h1 class="dash-page-title">لوحة العمل • Work Dashboard</h1>
                            <p class="dash-page-subtitle">Monitoring ${response.employees.length} employee(s) • ${firstEmp.period_label || firstEmp.month}</p>
                        </div>
                        <div class="dash-eid-section">
                            <div class="dash-eid-card">
                                <div class="dash-eid-icon">🌙</div>
                                <div class="dash-eid-label">عيد الفطر</div>
                                <div class="dash-eid-value">${firstEmp.eid_fitr}</div>
                            </div>
                            <div class="dash-eid-card">
                                <div class="dash-eid-icon">🕌</div>
                                <div class="dash-eid-label">عيد الأضحى</div>
                                <div class="dash-eid-value">${firstEmp.eid_adha}</div>
                            </div>
                        </div>
                    `;
                    response.employees.forEach((emp, idx) => {
                        emp.index = idx;
                        html += render_employee_card(emp);
                    });
                } else if (!response.is_admin && response.employees.length > 0) {
                    let emp = response.employees[0];
                    html += `
                        <div class="dash-page-header">
                            <h1 class="dash-page-title">أهلاً، ${emp.employee_name}<br>Welcome</h1>
                            <p class="dash-page-subtitle">${emp.period_label || emp.month}</p>
                        </div>
                        <div class="dash-eid-section">
                            <div class="dash-eid-card">
                                <div class="dash-eid-icon">🌙</div>
                                <div class="dash-eid-label">عيد الفطر</div>
                                <div class="dash-eid-value">${emp.eid_fitr}</div>
                            </div>
                            <div class="dash-eid-card">
                                <div class="dash-eid-icon">🕌</div>
                                <div class="dash-eid-label">عيد الأضحى</div>
                                <div class="dash-eid-value">${emp.eid_adha}</div>
                            </div>
                        </div>
                    `;
                    html += render_employee_card(emp);
                } else {
                    html += `<div style="text-align: center; padding: 40px; color: #8d99a6;">
                        <h3>No employee data available</h3>
                    </div>`;
                }

                html += '</div>';
                $dashboard.html(html);
            },
            error: function() {
                frappe.msgprint({
                    title: __('Error'),
                    indicator: 'red',
                    message: __('Failed to load attendance data. Please try again.')
                });
            }
        });
    }

    load_data();
    page.set_primary_action(__('🔄 تحديث'), () => load_data(), 'refresh');
};
