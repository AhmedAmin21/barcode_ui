# ============================================
# Pricing Rule Filter - Server Side API
# File: apps/barcode_ui/barcode_ui/api/pricing_rule_filter.py
# ============================================

import frappe
from frappe import _
import json


@frappe.whitelist()
def get_filtered_items(filters):
    """
    Fetch Item master records based on dynamic filter conditions.
    
    Args:
        filters: JSON string of array of dicts: [{field, condition, value}, ...]
    
    Returns:
        List of item dicts with fields: name, item_name, item_group, brand, stock_uom, etc.
    """
    
    # Parse filters
    if isinstance(filters, str):
        filters = json.loads(filters)
    
    if not filters or not isinstance(filters, list):
        return []
    
    # Valid fields that can be filtered (security whitelist)
    VALID_FIELDS = {
        'item_group', 'brand', 'item_name', 'stock_uom',
        'is_stock_item', 'is_sales_item', 'is_purchase_item',
        'standard_rate', 'valuation_rate', 'description',
        'disabled', 'name'
    }
    
    # Fields that are numeric/currency
    NUMERIC_FIELDS = {'standard_rate', 'valuation_rate'}
    
    # Fields that are checkboxes (0/1)
    CHECK_FIELDS = {'is_stock_item', 'is_sales_item', 'is_purchase_item', 'disabled'}
    
    conditions = []
    values = []
    
    for f in filters:
        field = f.get('field')
        condition = f.get('condition')
        value = f.get('value')
        
        # Security: skip invalid fields
        if field not in VALID_FIELDS:
            continue
        
        if not condition:
            continue
        
        # Handle checkbox fields - convert yes/no/true/false/1/0
        if field in CHECK_FIELDS:
            value = str(value).lower().strip()
            if value in ('yes', 'true', '1', 'y'):
                value = 1
            elif value in ('no', 'false', '0', 'n'):
                value = 0
            else:
                try:
                    value = int(value)
                except ValueError:
                    value = 1 if value else 0
        
        # Handle numeric fields
        elif field in NUMERIC_FIELDS:
            try:
                value = float(value)
            except ValueError:
                continue  # Skip invalid numeric values
        
        # Build SQL condition
        if condition == '=':
            conditions.append(f"`tabItem`.`{field}` = %s")
            values.append(value)
        
        elif condition == '!=':
            conditions.append(f"`tabItem`.`{field}` != %s")
            values.append(value)
        
        elif condition == 'like':
            conditions.append(f"`tabItem`.`{field}` LIKE %s")
            values.append(f"%{value}%")
        
        elif condition == 'not like':
            conditions.append(f"`tabItem`.`{field}` NOT LIKE %s")
            values.append(f"%{value}%")
        
        elif condition == 'in':
            # Split by comma for multiple values
            in_values = [v.strip() for v in str(value).split(',') if v.strip()]
            if not in_values:
                continue
            placeholders = ', '.join(['%s'] * len(in_values))
            conditions.append(f"`tabItem`.`{field}` IN ({placeholders})")
            values.extend(in_values)
        
        elif condition == 'not in':
            not_in_values = [v.strip() for v in str(value).split(',') if v.strip()]
            if not_in_values:
                placeholders = ', '.join(['%s'] * len(not_in_values))
                conditions.append(f"`tabItem`.`{field}` NOT IN ({placeholders})")
                values.extend(not_in_values)
        
        elif condition == 'is':
            if str(value).lower() in ('null', 'none', ''):
                conditions.append(f"`tabItem`.`{field}` IS NULL")
            else:
                conditions.append(f"`tabItem`.`{field}` = %s")
                values.append(value)
        
        elif condition in ('>', '<', '>=', '<='):
            conditions.append(f"`tabItem`.`{field}` {condition} %s")
            values.append(value)
    
    # No valid conditions built
    if not conditions:
        return []
    
    where_clause = " AND ".join(conditions)
    
    # Always exclude disabled items unless explicitly filtering on disabled
    has_disabled_filter = any(f.get('field') == 'disabled' for f in filters)
    if not has_disabled_filter:
        where_clause += " AND `tabItem`.`disabled` = 0"
    
    query = f"""
        SELECT 
            `tabItem`.`name`,
            `tabItem`.`item_name`,
            `tabItem`.`item_group`,
            `tabItem`.`brand`,
            `tabItem`.`stock_uom`,
            `tabItem`.`standard_rate`,
            `tabItem`.`valuation_rate`,
            `tabItem`.`description`
        FROM `tabItem`
        WHERE {where_clause}
        ORDER BY `tabItem`.`name`
        LIMIT 500
    """
    
    try:
        items = frappe.db.sql(query, tuple(values), as_dict=True)
        return items
    except Exception as e:
        frappe.log_error(f"Pricing Rule Filter Error: {str(e)}", "Pricing Rule Filter")
        frappe.throw(_("Error fetching items. Please check your filter conditions."))
