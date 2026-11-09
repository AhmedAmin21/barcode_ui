frappe.ready(() => {
    if (window.__barcode_added) return;

    // Find the navbar container
    let navbar = document.querySelector(".navbar .navbar-right") || document.querySelector(".navbar");
    if (!navbar) {
        console.warn("Navbar not found!");
        return;
    }

    // Create the barcode input
    let input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Scan Barcode";
    input.className = "form-control";
    input.style.width = "200px";
    input.style.marginLeft = "10px";
    input.style.height = "32px";

    // Handle scanning event
    input.addEventListener("change", () => {
        let barcode = input.value.trim();
        if (!barcode) return;

        frappe.show_alert({
            message: "Scanned: " + barcode,
            indicator: "green"
        });

        input.value = "";
    });

    // Add to navbar
    navbar.appendChild(input);
    window.__barcode_added = true;
});
