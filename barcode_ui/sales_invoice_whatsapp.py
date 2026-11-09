import base64
import json
import time
import urllib.parse
import requests
import frappe
from frappe import _
from frappe.utils.pdf import get_pdf

EGYPT_LANDLINE_PREFIXES = (
    "02", "03", "040", "045", "046", "047", "048", "050",
    "055", "057", "062", "064", "065", "066", "068", "069",
    "082", "084", "086", "088", "092", "093", "095", "096", "097"
)

EGYPT_MOBILE_PREFIXES = ("010", "011", "012", "015")

EVO_INSTANCE_ID = "CNCLeaders_0"
EVO_API_TOKEN = "C2D70EBC10FE-4A68-AD9C-02BDE8EC381E"
EVO_BASE_URL = "https://evoapi.ens-ala.com/message/sendMedia"


def get_evo_credentials():
    """Retrieve WhatsApp API credentials with site_config.json override support."""
    instance_id = frappe.conf.get("whatsapp_instance_id") or EVO_INSTANCE_ID
    api_token = frappe.conf.get("whatsapp_api_token") or EVO_API_TOKEN
    base_url = frappe.conf.get("whatsapp_base_url") or EVO_BASE_URL
    encoded_instance = urllib.parse.quote(instance_id)
    return f"{base_url}/{encoded_instance}", api_token


def is_landline_number(number):
    """Detect if a phone number is an Egyptian landline or marked as landline."""
    if not number:
        return False

    clean = "".join(filter(str.isdigit, str(number)))
    if not clean:
        return False

    # Normalize Egypt international prefix 20... -> 0...
    if clean.startswith("20") and len(clean) >= 10:
        clean = "0" + clean[2:]

    # If it is clearly an Egyptian mobile (010, 011, 012, 015 with 11 digits), it is NOT a landline
    if clean.startswith(EGYPT_MOBILE_PREFIXES) and len(clean) == 11:
        return False

    # Check against Egyptian geographic landline prefixes (typically 8 to 10 digits total)
    if clean.startswith(EGYPT_LANDLINE_PREFIXES) and len(clean) in (8, 9, 10):
        return True

    return False


def validate_and_format_egypt_number(number):
    """
    Validate and format an Egyptian mobile number to international format (201xxxxxxxxx).
    Returns None if the number is a landline or invalid.
    """
    if not number or is_landline_number(number):
        return None

    clean = "".join(filter(str.isdigit, str(number)))

    # Standard national format: 010xxxxxxxx (11 digits)
    if clean.startswith(EGYPT_MOBILE_PREFIXES) and len(clean) == 11:
        return "20" + clean[1:]

    # Without leading 0: 10xxxxxxxx (10 digits)
    if clean.startswith(("10", "11", "12", "15")) and len(clean) == 10:
        return "20" + clean

    # Already with country code: 2010xxxxxxxx (12 digits)
    if clean.startswith(("2010", "2011", "2012", "2015")) and len(clean) == 12:
        return clean

    return None


def format_any_number(number):
    """
    Format phone number for WhatsApp.
    - Excludes landlines.
    - Applies Egyptian mobile normalization first.
    - For international numbers, strips non-digits and ensures length between 7 and 15 digits.
    - Returns None if invalid or landline.
    """
    if not number or is_landline_number(number):
        return None

    # Try Egyptian mobile format
    egypt = validate_and_format_egypt_number(number)
    if egypt:
        return egypt

    # International numbers: digits only
    clean = str(number).strip()
    digits_only = "".join(filter(str.isdigit, clean))

    if not digits_only or len(digits_only) < 7 or len(digits_only) > 15:
        return None

    return digits_only


def format_display_phone(phone_digits):
    """Format digits for human-friendly display."""
    if not phone_digits:
        return ""
    if phone_digits.startswith("20") and len(phone_digits) == 12:
        return f"+20 {phone_digits[2:5]} {phone_digits[5:8]} {phone_digits[8:]}"
    return f"+{phone_digits}"


@frappe.whitelist()
def get_customer_whatsapp_recipients(docname=None, customer=None):
    """
    Find all linked Contacts for the Customer, extracting all valid mobile numbers
    and strictly filtering out landlines.
    """
    if docname and not customer:
        customer = frappe.db.get_value("Sales Invoice", docname, "customer")

    if not customer:
        frappe.throw(_("Customer is required to fetch WhatsApp recipients."))

    # 1. Gather all linked contacts via Dynamic Link
    contact_names = frappe.get_all(
        "Dynamic Link",
        filters={
            "link_doctype": "Customer",
            "link_name": customer,
            "parenttype": "Contact",
        },
        pluck="parent",
    )

    # 2. Also check customer_primary_contact on Customer
    primary_contact = frappe.db.get_value("Customer", customer, "customer_primary_contact")
    if primary_contact and primary_contact not in contact_names:
        contact_names.append(primary_contact)

    recipients = []
    seen_numbers = set()

    for c_name in contact_names:
        if not frappe.db.exists("Contact", c_name):
            continue

        contact = frappe.get_doc("Contact", c_name)
        full_name = (
            contact.full_name
            or f"{contact.first_name or ''} {contact.last_name or ''}".strip()
            or c_name
        )
        designation = contact.designation or contact.department or ""
        is_primary = bool(contact.is_primary_contact or (c_name == primary_contact))

        # Check child table phone_nos (Contact Phone)
        if hasattr(contact, "phone_nos") and contact.phone_nos:
            for row in contact.phone_nos:
                if getattr(row, "custom_landline", 0):
                    continue

                raw_num = row.phone
                if not raw_num or is_landline_number(raw_num):
                    continue

                valid_phone = format_any_number(raw_num)
                if valid_phone and valid_phone not in seen_numbers:
                    seen_numbers.add(valid_phone)
                    recipients.append({
                        "contact_name": full_name,
                        "contact_id": c_name,
                        "designation": designation,
                        "phone": valid_phone,
                        "display_phone": format_display_phone(valid_phone),
                        "is_primary": is_primary or bool(getattr(row, "is_primary_mobile_no", 0)),
                    })

        # Check Contact.mobile_no field
        if contact.mobile_no and not is_landline_number(contact.mobile_no):
            valid_phone = format_any_number(contact.mobile_no)
            if valid_phone and valid_phone not in seen_numbers:
                seen_numbers.add(valid_phone)
                recipients.append({
                    "contact_name": full_name,
                    "contact_id": c_name,
                    "designation": designation,
                    "phone": valid_phone,
                    "display_phone": format_display_phone(valid_phone),
                    "is_primary": is_primary,
                })

        # Check Contact.phone field (if mobile and not landline)
        if contact.phone and not is_landline_number(contact.phone):
            valid_phone = format_any_number(contact.phone)
            if valid_phone and valid_phone not in seen_numbers:
                seen_numbers.add(valid_phone)
                recipients.append({
                    "contact_name": full_name,
                    "contact_id": c_name,
                    "designation": designation,
                    "phone": valid_phone,
                    "display_phone": format_display_phone(valid_phone),
                    "is_primary": is_primary,
                })

    return recipients


def _generate_invoice_media_payload(doc):
    """Helper to render PDF and caption once for an invoice."""
    print_format = "sales 3"
    if not frappe.db.exists("Print Format", print_format):
        default_pf = frappe.db.get_value(
            "Property Setter",
            {"doc_type": "Sales Invoice", "property": "default_print_format"},
            "value"
        )
        print_format = default_pf or "Standard"

    html = frappe.get_print("Sales Invoice", doc.name, print_format=print_format)
    pdf_content = get_pdf(html)
    base64_media = base64.b64encode(pdf_content).decode("utf-8")

    caption = (
        f"فاتورة مبيعات من الرواد - CNC Leaders\n"
        f"مرحبا : {doc.customer_name}\n\n"
        f"يرجى الاطلاع على فاتورة الشراء المرفقة الخاصة بطلبكم الأخير .\n"
        f"لأي استفسار من فضلك تواصل مع احد الأرقام التالية :\n"
        f"01283229286\n"
        f"01005262794\n"
        f"01114918780\n"
        f"شكرا لتعاملكم معنا"
    )

    return {
        "media": base64_media,
        "caption": caption,
        "filename": f"{doc.name}.pdf"
    }


@frappe.whitelist()
def prepare_invoice_whatsapp_media(docname):
    """
    Generates the invoice PDF once and caches it in Redis for 10 minutes.
    Called as Step 1 of the live stepper.
    """
    if not frappe.db.exists("Sales Invoice", docname):
        frappe.throw(_("Invoice {0} not found.").format(docname))

    doc = frappe.get_doc("Sales Invoice", docname)
    doc.check_permission("read")

    if getattr(doc, "custom_whatsapp_sent", 0):
        frappe.throw(_("تم إرسال هذه الفاتورة مسبقاً عبر واتساب."))

    try:
        media_data = _generate_invoice_media_payload(doc)
        cache_key = f"wp_inv_pdf_{docname}"
        frappe.cache().set_value(cache_key, media_data, expires_in_sec=600)
        return {"status": "success"}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("WhatsApp PDF Generation Error"))
        frappe.throw(_("فشل إنشاء ملف الفاتورة PDF: {0}").format(str(e)))


@frappe.whitelist()
def send_single_whatsapp_recipient(docname, phone, contact_name=""):
    """
    Sends the cached invoice PDF to one recipient.
    Called sequentially by the frontend stepper with safe delays in-between.
    """
    if not frappe.db.exists("Sales Invoice", docname):
        frappe.throw(_("Invoice {0} not found.").format(docname))

    doc = frappe.get_doc("Sales Invoice", docname)
    doc.check_permission("read")

    if getattr(doc, "custom_whatsapp_sent", 0):
        frappe.throw(_("تم إرسال هذه الفاتورة مسبقاً عبر واتساب."))

    # Get cached media or regenerate
    cache_key = f"wp_inv_pdf_{docname}"
    media_data = frappe.cache().get_value(cache_key)
    if not media_data:
        media_data = _generate_invoice_media_payload(doc)
        frappe.cache().set_value(cache_key, media_data, expires_in_sec=600)

    evopi_url, api_token = get_evo_credentials()

    headers = {
        "apiKey": api_token,
        "Content-Type": "application/json"
    }

    payload = {
        "number": phone,
        "mediatype": "document",
        "mimetype": "application/pdf",
        "caption": media_data["caption"],
        "media": media_data["media"],
        "fileName": media_data["filename"]
    }

    try:
        response = requests.post(evopi_url, json=payload, headers=headers, timeout=30)
        if response.status_code in (200, 201):
            return {
                "status": "success",
                "phone": phone,
                "contact_name": contact_name,
                "error": None
            }
        else:
            error_msg = f"HTTP {response.status_code}"
            try:
                err_json = response.json()
                error_msg = err_json.get("message") or err_json.get("error") or str(err_json)
            except Exception:
                error_msg = response.text[:120] if response.text else error_msg

            frappe.log_error(
                f"Recipient: {contact_name} ({phone})\nResponse: {response.text}",
                _("EvoPI WhatsApp Send Error")
            )
            return {
                "status": "failed",
                "phone": phone,
                "contact_name": contact_name,
                "error": error_msg
            }
    except requests.exceptions.Timeout:
        return {
            "status": "failed",
            "phone": phone,
            "contact_name": contact_name,
            "error": "انتهت مهلة الاتصال بالخادم (30s)"
        }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("WhatsApp Send Exception"))
        return {
            "status": "failed",
            "phone": phone,
            "contact_name": contact_name,
            "error": str(e)
        }


@frappe.whitelist()
def finalize_invoice_whatsapp(docname):
    """
    Marks the invoice as sent in the database once dispatches have concluded.
    Cleans up the cache.
    """
    if not frappe.db.exists("Sales Invoice", docname):
        frappe.throw(_("Invoice {0} not found.").format(docname))

    doc = frappe.get_doc("Sales Invoice", docname)
    doc.check_permission("write")
    doc.db_set("custom_whatsapp_sent", 1, update_modified=False)
    frappe.db.commit()

    # Clear cache
    cache_key = f"wp_inv_pdf_{docname}"
    frappe.cache().delete_value(cache_key)

    return {"status": "success"}


@frappe.whitelist()
def send_invoice_whatsapp(docname, recipients=None):
    """
    Fallback batch dispatch endpoint.
    """
    try:
        if not frappe.db.exists("Sales Invoice", docname):
            frappe.throw(_("Invoice {0} not found.").format(docname))

        doc = frappe.get_doc("Sales Invoice", docname)

        if getattr(doc, "custom_whatsapp_sent", 0):
            frappe.throw(_("تم إرسال هذه الفاتورة مسبقاً عبر واتساب."))

        if isinstance(recipients, str):
            try:
                recipients = json.loads(recipients)
            except Exception:
                recipients = None

        if not recipients:
            recipients = get_customer_whatsapp_recipients(docname=docname, customer=doc.customer)

        if not recipients:
            frappe.throw(_("No valid mobile numbers found in contacts linked to this customer."))

        prepare_invoice_whatsapp_media(docname)

        results = []
        for idx, rec in enumerate(recipients):
            phone = rec.get("phone")
            c_name = rec.get("contact_name") or rec.get("contact") or phone

            res = send_single_whatsapp_recipient(docname=docname, phone=phone, contact_name=c_name)
            results.append(res)

            if idx < len(recipients) - 1:
                time.sleep(3)

        success_count = sum(1 for r in results if r.get("status") == "success")
        if success_count > 0:
            finalize_invoice_whatsapp(docname)

        return {
            "summary": {
                "total": len(results),
                "success": success_count,
                "failed": len(results) - success_count,
            },
            "details": results
        }

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), _("WhatsApp Integration Crash"))
        if isinstance(e, frappe.ValidationError):
            raise
        frappe.throw(_("An unexpected error occurred: {0}").format(str(e)))
