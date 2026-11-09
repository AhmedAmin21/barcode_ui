app_name = "barcode_ui"
app_title = "barcode ui"
app_publisher = "hi"
app_description = "hi"
app_email = "hi@gmail.com"
app_license = "mit"

#app_include_js = "/assets/barcode_ui/js/desk_barcode.js"
#app_include_js = "/assets/barcode_ui/js/toolbar_barcode.js"
# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "barcode_ui",
# 		"logo": "/assets/barcode_ui/logo.png",
# 		"title": "barcode ui",
# 		"route": "/barcode_ui",
# 		"has_permission": "barcode_ui.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css =["/assets/barcode_ui/css/test7.css"]
app_include_js = ["/assets/barcode_ui/js/bell_change.js", "/assets/barcode_ui/js/final_qrcode_scan.js"]
doctype_js = {
    "Sales Invoice":["public/js/sales_invoice_whatsapp.js", "public/js/sales_invoice_barcode.js"], 
    "Stock Entry": "public/js/stock_entry.js",
    "Supplier": "public/js/supplier.js",
    "Customer": "public/js/customer.js",
    "Purchase Receipt": "public/js/purchase_receipt.js",
    "Pricing Rule": "public/js/pricing_rule_filter.js",
    "Journal Entry": "public/js/journal_entry.js"
}
#"Stock Entry": "public/js/stock_scan7.js"
"""whitelisted_methods = {
    "barcode_ui.api.stock_entry_api.fetch_pr_items_for_transfer": "barcode_ui.api.stock_entry_api.fetch_pr_items_for_transfer"
}"""
# include js, css files in header of web template
# web_include_css = "/assets/barcode_ui/css/barcode_ui.css"
# web_include_js = "/assets/barcode_ui/js/barcode_ui.js"
doc_events = {
    "Subcontracting Order": {
        "before_validate": "barcode_ui.fixes.subcontracting_fix.fix_service_item_rates"},
    "Journal Entry": {
        "on_submit": "barcode_ui.payroll.payroll_security.update_gl_confidential_flag",
        "on_cancel": "barcode_ui.payroll.payroll_security.update_gl_confidential_flag",
        "on_update_after_submit": "barcode_ui.payroll.payroll_security.update_gl_confidential_flag",
    },
    "Work Order": {
        "before_save": [
            "barcode_ui.work_order.events.reset_priority_if_completed_or_cancelled"
        ],
        "on_change": [
            "barcode_ui.work_order.events.reset_priority_if_completed_or_cancelled"
        ],
        "on_cancel": [
            "barcode_ui.work_order.events.reset_priority_if_completed_or_cancelled"
        ],
    },
    
}
fixtures = [
    {
        "dt": "Custom Field",
        "filters": [["dt", "=", "Pricing Rule"], ["fieldname", "like", "custom_filter%"]]
    }
]

api_methods = [
    "barcode_ui.api.pricing_rule_filter.get_filtered_items"
]

permission_query_conditions = {
    "Journal Entry":
        "barcode_ui.je_permissions.journal_entry.permission_query_conditions"
}

has_permission = {
    "Journal Entry":
        "barcode_ui.je_permissions.journal_entry.has_permission"
}
# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "barcode_ui/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "barcode_ui/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "barcode_ui.utils.jinja_methods",
# 	"filters": "barcode_ui.utils.jinja_filters"
# }

# Installation
# ------------
#permission_query_conditions = {
 #       "Over Time": "barcode_ui.barcode_ui.doctype.over_time.over_time.get_permission_query_conditions"
#}

#has_permission = {
 #       "Over Time": "barcode_ui.barcode_ui.doctype.over_time.over_time.has_permission"
#}
# before_install = "barcode_ui.install.before_install"
# after_install = "barcode_ui.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "barcode_ui.uninstall.before_uninstall"
# after_uninstall = "barcode_ui.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "barcode_ui.utils.before_app_install"
# after_app_install = "barcode_ui.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "barcode_ui.utils.before_app_uninstall"
# after_app_uninstall = "barcode_ui.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "barcode_ui.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"barcode_ui.tasks.all"
# 	],
# 	"daily": [
# 		"barcode_ui.tasks.daily"
# 	],
# 	"hourly": [
# 		"barcode_ui.tasks.hourly"
# 	],
# 	"weekly": [
# 		"barcode_ui.tasks.weekly"
# 	],
# 	"monthly": [
# 		"barcode_ui.tasks.monthly"
# 	],
# }
scheduler_events = {
    "cron": {
        "0 8 26 * *": [
            "barcode_ui.barcode_ui.doctype.employee_attendance_summary.employee_attendance_summary.generate_monthly_summary_automatically"
        ],
    }
}
# Testing
# -------

# before_tests = "barcode_ui.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "barcode_ui.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "barcode_ui.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["barcode_ui.utils.before_request"]
# after_request = ["barcode_ui.utils.after_request"]

# Job Events
# ----------
# before_job = ["barcode_ui.utils.before_job"]
# after_job = ["barcode_ui.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"barcode_ui.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

