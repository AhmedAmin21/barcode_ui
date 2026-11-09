frappe.provide('my_custom_ui.notifications');

frappe.after_ajax(function() {
    customizeNotificationBell();
});

$(document).on('page-change', function() {
    setTimeout(customizeNotificationBell, 500);
});

function customizeNotificationBell() {
    const bell = document.querySelector('.notifications-icon');
    if (!bell || bell.dataset.customized) return;
    bell.dataset.customized = 'true';

    // Get ERPNext's original badge (may not exist yet if count is 0)
    let realBadge = bell.querySelector('.badge');

    // Hide the original badge if it exists — DON'T destroy it
    if (realBadge) {
        realBadge.style.cssText = 'display: none !important;';
    }

    // Build your custom icon container
    const wrapper = document.createElement('span');
    wrapper.style.cssText = 'position: relative; display: flex; align-items: center; justify-content: center;';

    // Custom bell SVG
    wrapper.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" 
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
    `;

    // Create your custom badge (red dot / count)
    const customBadge = document.createElement('span');
    customBadge.id = 'cn-badge';
    customBadge.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        background: #ef4444;
        color: white;
        font-size: 10px;
        font-weight: 700;
        min-width: 16px;
        height: 16px;
        border-radius: 8px;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 0 3px;
        box-shadow: 0 1px 4px rgba(239, 68, 68, 0.5);
        z-index: 10;
    `;
    wrapper.appendChild(customBadge);

    // Style the bell container
    bell.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: rgba(99, 102, 241, 0.08);
        transition: background 0.2s;
        position: relative;
        cursor: pointer;
    `;

    bell.onmouseenter = function() {
        this.style.background = 'rgba(99, 102, 241, 0.18)';
    };
    bell.onmouseleave = function() {
        this.style.background = 'rgba(99, 102, 241, 0.08)';
    };

    // Append wrapper to bell (preserves original badge in DOM)
    bell.appendChild(wrapper);

    // Initial sync
    syncBadge(realBadge, customBadge);

    // Watch the original badge for changes
    // ERPNext updates badge text when new notifications arrive
    if (realBadge) {
        const observer = new MutationObserver(function() {
            syncBadge(realBadge, customBadge);
        });
        observer.observe(realBadge, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }

    // Also watch for the badge being ADDED later (if it didn't exist at page load)
    const parentObserver = new MutationObserver(function(mutations) {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1 && node.classList && node.classList.contains('badge')) {
                    // New badge appeared — hide it and sync
                    node.style.cssText = 'display: none !important;';
                    realBadge = node;
                    syncBadge(realBadge, customBadge);

                    // Observe this new badge too
                    const obs = new MutationObserver(function() {
                        syncBadge(realBadge, customBadge);
                    });
                    obs.observe(realBadge, {
                        childList: true,
                        characterData: true,
                        subtree: true
                    });
                }
            });
        }
    });
    parentObserver.observe(bell, { childList: true, subtree: true });
}

function syncBadge(realBadge, customBadge) {
    const count = realBadge ? (parseInt(realBadge.textContent) || 0) : 0;

    if (count > 0) {
        customBadge.textContent = count;
        customBadge.style.display = 'flex';
    } else {
        customBadge.style.display = 'none';
    }
}
