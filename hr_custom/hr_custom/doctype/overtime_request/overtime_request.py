# Copyright (c) 2025, Bassam and contributors
# For license information, please see license.txt
import frappe
from frappe.model.document import Document
from frappe.utils import get_datetime
from frappe import _

class OvertimeRequest(Document):
    def before_save(self):
        # The method should take 'self' as an argument, not 'doc' and 'method'
        if not self.employee:
            return

        # Fetch Employee Policy (if needed, but not used in the original snippet)
        # employee = frappe.get_doc("Employee", self.employee)

        # Check for overlaps
        submitted_reqs = frappe.get_all(
            "Overtime Request",
            filters={
                "employee": self.employee,
                "docstatus": 1,
                "name": ["!=", self.name] # Exclude the current document being saved
            },
            fields=["name", "start_datetime", "end_datetime"]
        )

        for req in submitted_reqs:
            # Convert datetime strings to datetime objects for accurate comparison
            start_dt = get_datetime(self.start_datetime)
            end_dt = get_datetime(self.end_datetime)
            req_start_dt = get_datetime(req.start_datetime)
            req_end_dt = get_datetime(req.end_datetime)

            if (start_dt <= req_end_dt) and (end_dt >= req_start_dt):
                frappe.throw(_("Overlapping overtime found with request"))

    def get_data(filters):
        # This method is not a document method and should be a standalone function
        # It's better to refactor this logic elsewhere, e.g., a report script
        
        data = frappe.get_all(
            "Overtime Request",
            filters={"employee": filters.employee},
            fields=["employee", "start_datetime", "end_datetime", "total_hours", "holiday", "normal_work"]
        )

        total_holiday_hours = sum(d.total_hours for d in data if d.holiday)
        total_normal_work_hours = sum(d.total_hours for d in data if d.normal_work)

        # Update custom fields on Employee doctype
        if filters.employee:
            frappe.db.set_value("Employee", filters.employee, {
                "total_holiday_hours": total_holiday_hours,
                "total_normal_work_hours": total_normal_work_hours
            })

        return data

    def check_if_holiday(date):
        # This function should probably be a static method or a standalone function
        return frappe.db.exists("Holiday", {"holiday_date": date})
        
        
                