frappe.pages['stock-usa-dashboard'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Stock USA Dashboard',
        single_column: true
    });

    // Inject CSS
    var style = document.createElement('style');
    style.textContent = `
        @keyframes sua-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.2)} }
        @keyframes sua-spin { to { transform: rotate(360deg); } }
        .sua-dashboard { font-family: system-ui,-apple-system,sans-serif; color: #e5e7eb; min-height: 100vh; background: linear-gradient(135deg,#0a0e1a 0%,#1a1f2e 100%); padding-bottom: 3rem; }
        .sua-dashboard .container { max-width: 100% !important; padding: 0 !important; width: 100% !important; }
        .sua-dashboard .page-content { padding: 0 !important; }
        .sua-dashboard .layout-main-section { max-width: 100% !important; padding: 0 !important; }
        body[data-route="page/stock-usa-dashboard"] .page-head { display: none !important; }
        body[data-route="page/stock-usa-dashboard"] .page-title { display: none !important; }
        body[data-route="page/stock-usa-dashboard"] .page-actions { display: none !important; }
        body[data-route="page/stock-usa-dashboard"] .layout-main-section-wrapper { padding: 0 !important; }
        body[data-route="page/stock-usa-dashboard"] .container.page-body { max-width: 100% !important; padding: 0 !important; }
        .sua-glass { background: rgba(17,24,39,0.8); backdrop-filter: blur(12px); border: 1px solid rgba(30,58,95,0.6); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
        .sua-ticker { background: linear-gradient(135deg,rgba(0,102,204,0.15) 0%,rgba(17,24,39,0.9) 100%); border-left: 4px solid #0066CC; transition: all 0.3s; }
        .sua-ticker:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,102,204,0.2); }
        .sua-ticker-gold { border-left-color: #FFD700; background: linear-gradient(135deg,rgba(255,215,0,0.1) 0%,rgba(17,24,39,0.9) 100%); }
        .sua-ticker-gold:hover { box-shadow: 0 12px 40px rgba(255,215,0,0.2); }
        .sua-metric { background: linear-gradient(90deg,#fff 0%,#00d4ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .sua-metric-gold { background: linear-gradient(90deg,#FFD700 0%,#FFA500 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .sua-pulse { width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: sua-pulse 2s infinite; display: inline-block; margin-right: 8px; }
        .sua-btn { background: linear-gradient(135deg,#0066CC 0%,#0052a3 100%); color: white; border: none; border-radius: 8px; padding: 10px 24px; font-weight: 600; cursor: pointer; }
        .sua-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,102,204,0.4); }
        .sua-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
        .sua-badge-success { background: rgba(16,185,129,0.2); color: #10b981; }
        .sua-badge-warning { background: rgba(245,158,11,0.2); color: #f59e0b; }
        .sua-total { background: rgba(0,102,204,0.15) !important; font-weight: 700; border-top: 2px solid #0066CC !important; }
        .sua-loading { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10,14,26,0.95); display: flex; align-items: center; justify-content: center; z-index: 9999; flex-direction: column; }
        .sua-spinner { width: 60px; height: 60px; border: 4px solid rgba(0,102,204,0.2); border-top-color: #0066CC; border-radius: 50%; animation: sua-spin 1s linear infinite; margin-bottom: 1rem; }
        .sua-chart-box { position: relative; height: 300px; width: 100%; }
        .sua-filter { background: rgba(17,24,39,0.9); border: 1px solid rgba(30,58,95,0.6); border-radius: 12px; }
        .sua-input { width: 100%; padding: 0.5rem 1rem; border-radius: 0.5rem; background: rgba(31,41,55,0.8); border: 1px solid rgba(30,58,95,0.6); color: #e5e7eb; }
        .sua-alert { background: linear-gradient(90deg,rgba(239,68,68,0.2) 0%,rgba(245,158,11,0.2) 100%); border: 1px solid rgba(239,68,68,0.4); border-radius: 8px; }
        .sua-table-wrap { overflow-x: auto; }
        .sua-table { width: 100%; font-size: 0.875rem; border-collapse: collapse; }
        .sua-table th { background: rgba(0,102,204,0.2); color: #00d4ff; border-bottom: 2px solid #0066CC; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; padding: 12px 10px; text-align: left; }
        .sua-table td { border-bottom: 1px solid rgba(30,58,95,0.4); padding: 12px 10px; }
        .sua-table tbody tr:hover { background: rgba(0,102,204,0.1); }
        .sua-table a { color: #3b82f6; text-decoration: none; }
        .sua-table a:hover { text-decoration: underline; }
        .sua-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .sua-scroll::-webkit-scrollbar-track { background: #0a0e1a; }
        .sua-scroll::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 4px; }
        .sua-scroll::-webkit-scrollbar-thumb:hover { background: #0066CC; }
    `;
    document.head.appendChild(style);

    // Build HTML
    var html = `
    <div id="stock-usa-dashboard" class="sua-dashboard sua-scroll">
        <div id="sua-loading" class="sua-loading">
            <div class="sua-spinner"></div>
            <p style="color:#22d3ee;font-size:1.125rem;font-weight:600;">Loading Dashboard...</p>
            <p style="color:#6b7280;font-size:0.875rem;margin-top:0.5rem;">Fetching live rates and stock data</p>
        </div>

        <header class="sua-glass" style="position:sticky;top:0;z-index:50;padding:1rem 1.5rem;margin-bottom:1.5rem;">
            <div style="max-width:1600px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:1rem;">
                    <div style="width:3rem;height:3rem;border-radius:0.75rem;background:linear-gradient(to bottom right,#2563eb,#22d3ee);display:flex;align-items:center;justify-content:center;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    </div>
                    <div>
                        <h1 style="font-size:1.5rem;font-weight:700;color:white;letter-spacing:-0.025em;margin:0;">Stock USA</h1>
                        <p style="font-size:0.875rem;color:#9ca3af;margin:0;">Decision Dashboard & Portfolio Analytics</p>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:1rem;">
                    <div style="display:flex;align-items:center;font-size:0.875rem;color:#9ca3af;">
                        <span class="sua-pulse"></span>
                        <span id="sua-lastUpdated">Initializing...</span>
                    </div>
                    <button id="sua-btnRefresh" class="sua-btn" style="display:flex;align-items:center;gap:0.5rem;">
                        <svg id="sua-refreshIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                        Refresh
                    </button>
                    <button id="sua-btnToggleFilters" style="padding:0.5rem 1rem;border-radius:0.5rem;border:1px solid rgba(30,58,95,0.6);color:#d1d5db;background:transparent;cursor:pointer;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.5rem;vertical-align:middle;"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                        Filters
                    </button>
                </div>
            </div>
        </header>

        <main style="max-width:1600px;margin:0 auto;padding:0 1.5rem;">
            <div id="sua-filterPanel" class="sua-filter" style="padding:1.5rem;margin-bottom:1.5rem;display:none;">
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;">
                    <div>
                        <label style="display:block;font-size:0.875rem;font-weight:500;color:#9ca3af;margin-bottom:0.5rem;">Company</label>
                        <select id="sua-filterCompany" class="sua-input"><option value="">All Companies</option></select>
                    </div>
                    <div>
                        <label style="display:block;font-size:0.875rem;font-weight:500;color:#9ca3af;margin-bottom:0.5rem;">Item Group</label>
                        <select id="sua-filterItemGroup" class="sua-input"><option value="">All Groups</option></select>
                    </div>
                    <div>
                        <label style="display:block;font-size:0.875rem;font-weight:500;color:#9ca3af;margin-bottom:0.5rem;">Currency</label>
                        <select id="sua-filterCurrency" class="sua-input">
                            <option value="">All Currencies</option><option value="EGP">EGP</option><option value="USD">USD</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block;font-size:0.875rem;font-weight:500;color:#9ca3af;margin-bottom:0.5rem;">Date Range</label>
                        <div style="display:flex;gap:0.5rem;">
                            <input type="date" id="sua-filterFromDate" class="sua-input">
                            <input type="date" id="sua-filterToDate" class="sua-input">
                        </div>
                    </div>
                </div>
                <div style="margin-top:1rem;display:flex;justify-content:flex-end;gap:0.75rem;">
                    <button id="sua-btnApplyFilters" class="sua-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:0.5rem;vertical-align:middle;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        Apply Filters
                    </button>
                    <button id="sua-btnResetFilters" style="padding:0.5rem 1rem;border-radius:0.5rem;border:1px solid rgba(30,58,95,0.6);color:#9ca3af;background:transparent;cursor:pointer;">Reset</button>
                </div>
            </div>

            <div id="sua-alertBanner" class="sua-alert" style="padding:1rem;margin-bottom:1.5rem;display:none;">
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <div>
                        <p style="font-weight:600;color:white;margin:0;" id="sua-alertTitle">Market Alert</p>
                        <p style="font-size:0.875rem;color:#d1d5db;margin:0;" id="sua-alertMessage">Significant rate change detected</p>
                    </div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;">
                <div class="sua-ticker sua-ticker-gold" style="border-radius:0.75rem;padding:1.25rem;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;">
                        <div style="display:flex;align-items:center;gap:0.5rem;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#facc15"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" fill="#0a0e1a" font-size="12" font-weight="bold">Au</text></svg>
                            <span style="font-size:0.875rem;font-weight:500;color:#d1d5db;">Gold 24K / Gram</span>
                        </div>
                        <span class="sua-badge sua-badge-success">LIVE</span>
                    </div>
                    <div style="display:flex;align-items:baseline;gap:0.5rem;">
                        <span class="sua-metric-gold" style="font-size:1.875rem;font-weight:700;" id="sua-goldPrice">$ --.--</span>
                        <span style="font-size:0.875rem;" id="sua-goldChange">--</span>
                    </div>
                    <div style="margin-top:0.75rem;height:2.5rem;"><canvas id="sua-goldSparkline"></canvas></div>
                    <p style="font-size:0.75rem;color:#6b7280;margin-top:0.5rem;">Source: GoldAPI.io</p>
                </div>

                <div class="sua-ticker" style="border-radius:0.75rem;padding:1.25rem;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;">
                        <div style="display:flex;align-items:center;gap:0.5rem;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                            <span style="font-size:0.875rem;font-weight:500;color:#d1d5db;">USD / EGP</span>
                        </div>
                        <span class="sua-badge sua-badge-success">LIVE</span>
                    </div>
                    <div style="display:flex;align-items:baseline;gap:0.5rem;">
                        <span class="sua-metric" style="font-size:1.875rem;font-weight:700;" id="sua-rateEGP">--.--</span>
                        <span style="font-size:0.875rem;" id="sua-egpChange">--</span>
                    </div>
                    <div style="margin-top:0.75rem;height:2.5rem;"><canvas id="sua-egpSparkline"></canvas></div>
                    <p style="font-size:0.75rem;color:#6b7280;margin-top:0.5rem;">Source: Frankfurter API</p>
                </div>
                <div class="sua-ticker" style="border-radius:0.75rem;padding:1.25rem;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;">
                        <div style="display:flex;align-items:center;gap:0.5rem;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            <span style="font-size:0.875rem;font-weight:500;color:#d1d5db;">USD / CNY</span>
                        </div>
                        <span class="sua-badge sua-badge-success">LIVE</span>
                    </div>
                    <div style="display:flex;align-items:baseline;gap:0.5rem;">
                        <span class="sua-metric" style="font-size:1.875rem;font-weight:700;" id="sua-rateCNY">--.--</span>
                        <span style="font-size:0.875rem;" id="sua-cnyChange">--</span>
                    </div>
                    <div style="margin-top:0.75rem;height:2.5rem;"><canvas id="sua-cnySparkline"></canvas></div>
                    <p style="font-size:0.75rem;color:#6b7280;margin-top:0.5rem;">Source: Frankfurter API</p>
                </div>

                <div class="sua-ticker" style="border-radius:0.75rem;padding:1.25rem;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;">
                        <div style="display:flex;align-items:center;gap:0.5rem;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16M4 14h16M4 4h16M4 18h16"/></svg>
                            <span style="font-size:0.875rem;font-weight:500;color:#d1d5db;">USD / EUR</span>
                        </div>
                        <span class="sua-badge sua-badge-success">LIVE</span>
                    </div>
                    <div style="display:flex;align-items:baseline;gap:0.5rem;">
                        <span class="sua-metric" style="font-size:1.875rem;font-weight:700;" id="sua-rateEUR">--.--</span>
                        <span style="font-size:0.875rem;" id="sua-eurChange">--</span>
                    </div>
                    <div style="margin-top:0.75rem;height:2.5rem;"><canvas id="sua-eurSparkline"></canvas></div>
                    <p style="font-size:0.75rem;color:#6b7280;margin-top:0.5rem;">Source: Frankfurter API</p>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;">
                <div class="sua-glass" style="border-radius:0.75rem;padding:1.25rem;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
                        <span style="font-size:0.875rem;font-weight:500;color:#9ca3af;">Total Stock Value (USD)</span>
                        <div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:rgba(37,99,235,0.2);display:flex;align-items:center;justify-content:center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        </div>
                    </div>
                    <p style="font-size:1.5rem;font-weight:700;color:white;margin:0;" id="sua-kpiTotalUSD">$ --</p>
                    <p style="font-size:0.75rem;color:#6b7280;margin-top:0.25rem;margin-bottom:0;">Current valuation</p>
                </div>
                <div class="sua-glass" style="border-radius:0.75rem;padding:1.25rem;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
                        <span style="font-size:0.875rem;font-weight:500;color:#9ca3af;">Total Stock Value (EGP)</span>
                        <div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:rgba(16,185,129,0.2);display:flex;align-items:center;justify-content:center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </div>
                    </div>
                    <p style="font-size:1.5rem;font-weight:700;color:white;margin:0;" id="sua-kpiTotalEGP">EGP --</p>
                    <p style="font-size:0.75rem;color:#6b7280;margin-top:0.25rem;margin-bottom:0;">At today's rate</p>
                </div>
                <div class="sua-glass" style="border-radius:0.75rem;padding:1.25rem;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
                        <span style="font-size:0.875rem;font-weight:500;color:#9ca3af;">Gold Equivalent</span>
                        <div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:rgba(234,179,8,0.2);display:flex;align-items:center;justify-content:center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#facc15"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" fill="#0a0e1a" font-size="12" font-weight="bold">Au</text></svg>
                        </div>
                    </div>
                    <p style="font-size:1.5rem;font-weight:700;color:#facc15;margin:0;" id="sua-kpiGoldGrams">-- g</p>
                    <p style="font-size:0.75rem;color:#6b7280;margin-top:0.25rem;margin-bottom:0;" id="sua-kpiGoldUSD">$ --</p>
                </div>
                <div class="sua-glass" style="border-radius:0.75rem;padding:1.25rem;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
                        <span style="font-size:0.875rem;font-weight:500;color:#9ca3af;">Currency Exposure</span>
                        <div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:rgba(245,158,11,0.2);display:flex;align-items:center;justify-content:center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        </div>
                    </div>
                    <p style="font-size:1.5rem;font-weight:700;color:white;margin:0;" id="sua-kpiExposure">--</p>
                    <p style="font-size:0.75rem;color:#6b7280;margin-top:0.25rem;margin-bottom:0;">Primary currency</p>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-bottom:1.5rem;">
                <div class="sua-glass" style="border-radius:0.75rem;padding:1.25rem;">
                    <h3 style="font-size:1.125rem;font-weight:600;color:white;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;margin-top:0;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                        Portfolio by Currency
                    </h3>
                    <div class="sua-chart-box"><canvas id="sua-currencyChart"></canvas></div>
                </div>
                <div class="sua-glass" style="border-radius:0.75rem;padding:1.25rem;">
                    <h3 style="font-size:1.125rem;font-weight:600;color:white;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;margin-top:0;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                        Value by Item Group
                    </h3>
                    <div class="sua-chart-box"><canvas id="sua-itemGroupChart"></canvas></div>
                </div>
                <div class="sua-glass" style="border-radius:0.75rem;padding:1.25rem;">
                    <h3 style="font-size:1.125rem;font-weight:600;color:white;margin-bottom:1rem;display:flex;align-items:center;gap:0.5rem;margin-top:0;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        Gold vs Stock Value
                    </h3>
                    <div class="sua-chart-box"><canvas id="sua-goldComparisonChart"></canvas></div>
                </div>
            </div>

            <div class="sua-glass" style="border-radius:0.75rem;padding:1.25rem;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                    <h3 style="font-size:1.125rem;font-weight:600;color:white;display:flex;align-items:center;gap:0.5rem;margin:0;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                        Stock Details
                    </h3>
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <span style="font-size:0.875rem;color:#9ca3af;" id="sua-recordCount">0 records</span>
                    </div>
                </div>
                <div class="sua-table-wrap">
                    <table class="sua-table" id="sua-stockTable">
                        <thead><tr>
                            <th>Item Code</th><th>Item Name</th><th>Group</th><th>Batch</th><th>Qty</th>
                            <th>Currency</th><th>Orig. Rate</th><th>Balance USD</th><th>Balance EGP</th>
                            <th>Current USD</th><th>Current EGP</th><th>Gold (g)</th><th>Gold USD</th><th>Voucher</th>
                        </tr></thead>
                        <tbody id="sua-tableBody"></tbody>
                    </table>
                </div>
            </div>
        </main>
    </div>`;

    $(wrapper).find('.layout-main-section').html(html);
    $(wrapper).find('.container').css({'max-width': '100%', 'padding': '0', 'width': '100%'});
    $(wrapper).find('.page-content').css('padding', '0');
    $(wrapper).find('.layout-main-section').css({'max-width': '100%', 'padding': '0'});
    // Hide default ERPNext page header
    $(wrapper).closest('.page-container').find('.page-head').hide();
    $(wrapper).closest('.page-container').find('.page-title').hide();
    $(wrapper).closest('.page-container').find('.page-actions').hide();
    $(wrapper).closest('.layout-main-section-wrapper').css('padding', '0');

    // Check if Chart.js is available (ERPNext may have it)
    if (typeof Chart === 'undefined') {
        // Load Chart.js dynamically
        frappe.require('https://cdn.jsdelivr.net/npm/chart.js', function() {
            new StockUSADashboard(wrapper);
        });
    } else {
        new StockUSADashboard(wrapper);
    }
};

class StockUSADashboard {
    constructor(wrapper) {
        this.wrapper = wrapper;
        this.stockData = [];
        this.liveRates = {};
        this.previousRates = {};
        this.charts = {};
        this.sparklines = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.initSparklines();
        this.loadFilterOptions();
        this.loadData();
        this.setupAutoRefresh();
    }

    bindEvents() {
        var self = this;
        var $page = $(this.wrapper).find('#stock-usa-dashboard');
        $page.find('#sua-btnRefresh').on('click', function() { self.refreshAll(); });
        $page.find('#sua-btnToggleFilters').on('click', function() { self.toggleFilters(); });
        $page.find('#sua-btnApplyFilters').on('click', function() { self.applyFilters(); });
        $page.find('#sua-btnResetFilters').on('click', function() { self.resetFilters(); });
    }

    initSparklines() {
        var sparklineData = [65, 59, 80, 81, 56, 55, 40, 70, 75, 82, 78, 85];
        var self = this;
        ['gold', 'egp', 'cny', 'eur'].forEach(function(id) {
            var canvas = document.getElementById('sua-' + id + 'Sparkline');
            if (!canvas || typeof Chart === 'undefined') return;
            var ctx = canvas.getContext('2d');
            self.sparklines[id] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: Array(12).fill(''),
                    datasets: [{
                        data: sparklineData,
                        borderColor: id === 'gold' ? '#FFD700' : '#00d4ff',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { display: false }, y: { display: false } },
                    layout: { padding: 0 }
                }
            });
        });
    }

    loadFilterOptions() {
        var self = this;
        frappe.call({
            method: 'barcode_ui.barcode_ui.page.stock_usa_dashboard.stock_usa_dashboard.get_filter_options',
            callback: function(r) {
                if (r.message) {
                    var companies = r.message.companies || [];
                    var itemGroups = r.message.item_groups || [];
                    var $company = $('#sua-filterCompany');
                    companies.forEach(function(c) {
                        $company.append('<option value="' + c + '">' + c + '</option>');
                    });
                    var $group = $('#sua-filterItemGroup');
                    itemGroups.forEach(function(g) {
                        $group.append('<option value="' + g + '">' + g + '</option>');
                    });
                }
            }
        });
    }
    getFilters() {
        return {
            company: $('#sua-filterCompany').val() || frappe.defaults.get_user_default('Company'),
            item_group: $('#sua-filterItemGroup').val(),
            currency: $('#sua-filterCurrency').val(),
            from_date: $('#sua-filterFromDate').val(),
            to_date: $('#sua-filterToDate').val()
        };
    }

    loadData() {
        $('#sua-loading').show();
        var self = this;
        frappe.call({
            method: 'barcode_ui.barcode_ui.page.stock_usa_dashboard.stock_usa_dashboard.get_dashboard_data',
            args: { filters: this.getFilters() },
            callback: function(r) {
                $('#sua-loading').hide();
                if (r.message && r.message.success) {
                    self.previousRates = Object.assign({}, self.liveRates);
                    self.liveRates = r.message.rates;
                    self.stockData = r.message.data || [];
                    self.processData();
                } else {
                    frappe.show_alert({ message: __('Error loading dashboard data'), indicator: 'red' });
                }
            },
            error: function(err) {
                $('#sua-loading').hide();
                console.error('Dashboard API Error:', err);
                frappe.show_alert({ message: __('Failed to fetch data - check console'), indicator: 'red' });
            }
        });
    }

    processData() {
        this.updateTickers();
        this.updateKPIs();
        this.updateCharts();
        this.updateTable();
        this.checkAlerts();
        $('#sua-lastUpdated').text('Last updated: ' + frappe.datetime.now_datetime());
    }

    updateTickers() {
        if (!this.liveRates) return;
        $('#sua-goldPrice').text('$ ' + (this.liveRates.gold || 0).toFixed(2));
        $('#sua-rateEGP').text((this.liveRates.egp || 0).toFixed(2));
        $('#sua-rateCNY').text((this.liveRates.cny || 0).toFixed(2));
        $('#sua-rateEUR').text((this.liveRates.eur || 0).toFixed(4));
        if (this.previousRates.gold) {
            this.updateChangeIndicator('gold', this.liveRates.gold, this.previousRates.gold);
            this.updateChangeIndicator('egp', this.liveRates.egp, this.previousRates.egp);
            this.updateChangeIndicator('cny', this.liveRates.cny, this.previousRates.cny);
            this.updateChangeIndicator('eur', this.liveRates.eur, this.previousRates.eur);
        }
    }

    updateChangeIndicator(id, current, previous) {
        var $el = $('#sua-' + id + 'Change');
        if (!previous || previous === 0) {
            $el.text('--');
            return;
        }
        var change = ((current - previous) / previous) * 100;
        var isUp = change >= 0;
        var color = isUp ? '#10b981' : '#ef4444';
        var arrow = isUp ? '↑' : '↓';
        $el.html('<span style="color:' + color + '">' + arrow + ' ' + Math.abs(change).toFixed(2) + '%</span>');
    }

    updateKPIs() {
        var totalUSD = 0, totalEGP = 0, totalGoldGrams = 0, totalGoldUSD = 0;
        var currencyCounts = {};
        this.stockData.forEach(function(row) {
            // Skip backend total row
            if (!row.item_code || row.item_code === '') return;
            totalUSD += this.extractNumeric(row.current_total_usd);
            totalEGP += row.current_total_egp || 0;
            totalGoldGrams += row.worth_in_gold_grams || 0;
            totalGoldUSD += this.extractNumeric(row.worth_in_gold_usd);
            var curr = row.currency;
            if (!curr || curr === '') {
                curr = 'Not Set';
            }
            var val = this.extractNumeric(row.current_total_usd);
            if (val > 0) {
                currencyCounts[curr] = (currencyCounts[curr] || 0) + val;
            }
        }.bind(this));
        $('#sua-kpiTotalUSD').text('$ ' + totalUSD.toLocaleString('en-US', {minimumFractionDigits: 2}));
        $('#sua-kpiTotalEGP').text('EGP ' + totalEGP.toLocaleString('en-US', {minimumFractionDigits: 2}));
        $('#sua-kpiGoldGrams').text(totalGoldGrams.toFixed(2) + ' g');
        $('#sua-kpiGoldUSD').text('$ ' + totalGoldUSD.toLocaleString('en-US', {minimumFractionDigits: 2}));
        var dominant = Object.entries(currencyCounts).sort(function(a, b) { return b[1] - a[1]; })[0];
        $('#sua-kpiExposure').text(dominant ? dominant[0] : 'N/A');
    }

    updateCharts() {
        if (typeof Chart === 'undefined') return;

        var currencyData = {};
        var groupData = {};
        this.stockData.forEach(function(row) {
            // Skip backend total row
            if (!row.item_code || row.item_code === '') return;
            var curr = row.currency || 'Not Set';
            currencyData[curr] = (currencyData[curr] || 0) + this.extractNumeric(row.current_total_usd);
            var group = row.item_group || 'Not Set';
            groupData[group] = (groupData[group] || 0) + this.extractNumeric(row.current_total_usd);
        }.bind(this));

        if (this.charts.currency) this.charts.currency.destroy();
        if (this.charts.itemGroup) this.charts.itemGroup.destroy();
        if (this.charts.goldComp) this.charts.goldComp.destroy();

        var ctx1 = document.getElementById('sua-currencyChart');
        if (ctx1) {
            this.charts.currency = new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(currencyData),
                    datasets: [{ data: Object.values(currencyData), backgroundColor: ['#0066CC', '#00d4ff', '#FFD700', '#10b981'], borderWidth: 0 }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af', padding: 20 } } },
                    cutout: '65%'
                }
            });
        }

        var ctx2 = document.getElementById('sua-itemGroupChart');
        if (ctx2) {
            this.charts.itemGroup = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: Object.keys(groupData),
                    datasets: [{ label: 'Value (USD)', data: Object.values(groupData), backgroundColor: '#0066CC', borderRadius: 6 }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#9ca3af' }, grid: { display: false } },
                        y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(30,58,95,0.3)' } }
                    }
                }
            });
        }

        var totalStockUSD = 0, totalGoldUSD = 0;
        this.stockData.forEach(function(row) {
            if (!row.item_code || row.item_code === '') return;
            totalStockUSD += this.extractNumeric(row.current_total_usd);
            totalGoldUSD += this.extractNumeric(row.worth_in_gold_usd);
        }.bind(this));

        var ctx3 = document.getElementById('sua-goldComparisonChart');
        if (ctx3) {
            this.charts.goldComp = new Chart(ctx3, {
                type: 'bar',
                data: {
                    labels: ['Stock Value', 'Gold Equivalent'],
                    datasets: [{ data: [totalStockUSD, totalGoldUSD], backgroundColor: ['#0066CC', '#FFD700'], borderRadius: 8, barThickness: 60 }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#e5e7eb', font: { size: 14, weight: 'bold' } }, grid: { display: false } },
                        y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(30,58,95,0.3)' } }
                    }
                }
            });
        }
    }
    updateTable() {
        var $tbody = $('#sua-tableBody');
        $tbody.empty();
        // Remove any existing total rows from previous renders
        $('#sua-stockTable').find('tr.sua-total').remove();
        var self = this;
        this.stockData.forEach(function(row) {
            var voucherTypeSlug = row.voucher_type ? row.voucher_type.toLowerCase().replace(/\s/g, '-') : '';
            var currVal = row.currency || 'Not Set';
            var badgeClass = currVal === 'USD' ? 'sua-badge-success' : (currVal === 'EGP' ? 'sua-badge-warning' : 'sua-badge-info');
            var tr = '<tr>' +
                '<td style="font-weight:500;color:#3b82f6;">' + (row.item_code || '') + '</td>' +
                '<td>' + (row.item_name || '') + '</td>' +
                '<td><span class="sua-badge sua-badge-success">' + (row.item_group || '') + '</span></td>' +
                '<td style="color:#9ca3af;">' + (row.batch_no || '') + '</td>' +
                '<td style="text-align:right;font-weight:600;">' + (row.qty || 0) + '</td>' +
                '<td><span class="sua-badge ' + badgeClass + '">' + currVal + '</span></td>' +
                '<td style="color:#9ca3af;">' + (row.rate || '') + '</td>' +
                '<td style="color:#3b82f6;">' + (row.balance_value_usd || '') + '</td>' +
                '<td>' + (row.balance_value_egp ? row.balance_value_egp.toLocaleString() : '') + '</td>' +
                '<td style="color:#3b82f6;font-weight:600;">' + (row.current_total_usd || '') + '</td>' +
                '<td style="font-weight:600;">' + (row.current_total_egp ? row.current_total_egp.toLocaleString() : '') + '</td>' +
                '<td style="color:#facc15;">' + (row.worth_in_gold_grams ? row.worth_in_gold_grams.toFixed(2) : '') + '</td>' +
                '<td style="color:#facc15;">' + (row.worth_in_gold_usd || '') + '</td>' +
                '<td><a href="/app/' + voucherTypeSlug + '/' + (row.voucher_no || '') + '">' + (row.voucher_no || '') + '</a></td>' +
                '</tr>';
            $tbody.append(tr);
        });

        var totalRow = this.buildTotalRow();
        if (totalRow) {
            var tr = '<tr class="sua-total">' +
                '<td colspan="4" style="text-align:right;padding-right:1rem;">TOTAL</td>' +
                '<td style="text-align:right;font-weight:700;">' + totalRow.qty + '</td>' +
                '<td></td><td></td>' +
                '<td style="color:#3b82f6;font-weight:700;">' + totalRow.balance_value_usd + '</td>' +
                '<td style="font-weight:700;">' + (totalRow.balance_value_egp ? totalRow.balance_value_egp.toLocaleString() : '') + '</td>' +
                '<td style="color:#3b82f6;font-weight:700;">' + totalRow.current_total_usd + '</td>' +
                '<td style="font-weight:700;">' + (totalRow.current_total_egp ? totalRow.current_total_egp.toLocaleString() : '') + '</td>' +
                '<td style="color:#facc15;font-weight:700;">' + (totalRow.worth_in_gold_grams ? totalRow.worth_in_gold_grams.toFixed(2) : '') + '</td>' +
                '<td style="color:#facc15;font-weight:700;">' + totalRow.worth_in_gold_usd + '</td>' +
                '<td></td></tr>';
            $tbody.append(tr);
        }

        $('#sua-recordCount').text(this.stockData.length + ' records');
    }

    buildTotalRow() {
        if (!this.stockData.length) return null;
        var totals = { qty: 0, balance_value_usd: 0, balance_value_egp: 0, worth_in_gold_grams: 0, worth_in_gold_usd: 0, current_total_usd: 0, current_total_egp: 0 };
        this.stockData.forEach(function(row) {
            totals.qty += row.qty || 0;
            totals.balance_value_usd += this.extractNumeric(row.balance_value_usd);
            totals.balance_value_egp += row.balance_value_egp || 0;
            totals.worth_in_gold_grams += row.worth_in_gold_grams || 0;
            totals.worth_in_gold_usd += this.extractNumeric(row.worth_in_gold_usd);
            totals.current_total_usd += this.extractNumeric(row.current_total_usd);
            totals.current_total_egp += row.current_total_egp || 0;
        }.bind(this));
        return {
            qty: totals.qty.toFixed(2),
            balance_value_usd: '$ ' + totals.balance_value_usd.toFixed(2),
            balance_value_egp: totals.balance_value_egp,
            worth_in_gold_grams: totals.worth_in_gold_grams,
            worth_in_gold_usd: '$ ' + totals.worth_in_gold_usd.toFixed(2),
            current_total_usd: '$ ' + totals.current_total_usd.toFixed(2),
            current_total_egp: totals.current_total_egp
        };
    }

    extractNumeric(value) {
        if (typeof value === 'number') return value;
        if (!value) return 0;
        var cleaned = String(value).replace(/[^0-9.\-]/g, '');
        return parseFloat(cleaned) || 0;
    }

    checkAlerts() {
        if (!this.previousRates.gold || !this.liveRates.gold) return;
        var goldChange = Math.abs((this.liveRates.gold - this.previousRates.gold) / this.previousRates.gold * 100);
        var egpChange = Math.abs((this.liveRates.egp - this.previousRates.egp) / this.previousRates.egp * 100);
        if (goldChange > 2 || egpChange > 1) {
            $('#sua-alertBanner').show();
            if (goldChange > 2) {
                $('#sua-alertTitle').text('Gold Price Alert');
                $('#sua-alertMessage').text('Gold price changed by ' + goldChange.toFixed(2) + '% since last update');
            } else {
                $('#sua-alertTitle').text('Exchange Rate Alert');
                $('#sua-alertMessage').text('USD/EGP rate changed by ' + egpChange.toFixed(2) + '% since last update');
            }
            setTimeout(function() { $('#sua-alertBanner').hide(); }, 10000);
        }
    }

    toggleFilters() {
        var $panel = $('#sua-filterPanel');
        $panel.toggle();
    }

    applyFilters() {
        this.loadData();
    }

    resetFilters() {
        $('#sua-filterCompany').val('');
        $('#sua-filterItemGroup').val('');
        $('#sua-filterCurrency').val('');
        $('#sua-filterFromDate').val('');
        $('#sua-filterToDate').val('');
        this.loadData();
    }

    refreshAll() {
        var $icon = $('#sua-refreshIcon');
        $icon.css('animation', 'sua-spin 1s linear infinite');
        this.loadData();
        setTimeout(function() { $icon.css('animation', ''); }, 1000);
    }

    setupAutoRefresh() {
        var self = this;
        setInterval(function() { self.refreshAll(); }, 300000);
    }
}
