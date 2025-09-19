// Copyright (c) 2025, Bassam and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Overtime Request", {
// 	refresh(frm) {

frappe.ui.form.on('Overtime Request', {
    start_datetime: function(frm) {
        if (frm.doc.start_datetime) {
            // Force seconds to 00
            frm.set_value('start_datetime',
                moment(frm.doc.start_datetime).seconds(0).format("YYYY-MM-DD HH:mm:ss")
            );
        } else {
            frm.set_value('start_datetime',
                moment(frappe.datetime.now_datetime()).seconds(0).format("YYYY-MM-DD HH:mm:ss")
            );
        }

        update_holiday_flag(frm);
        calculate_and_assign_hours(frm);
    },

    end_datetime: function(frm) {
        if (frm.doc.end_datetime) {
            // Force seconds to 00
            frm.set_value('end_datetime',
                moment(frm.doc.end_datetime).seconds(0).format("YYYY-MM-DD HH:mm:ss")
            );
        } else {
            frm.set_value('end_datetime',
                moment(frappe.datetime.now_datetime()).seconds(0).format("YYYY-MM-DD HH:mm:ss")
            );
        }

        calculate_and_assign_hours(frm);
    },

    before_save: function(frm) {
        if (!frm.doc.employee) return;

        // Check overlap
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Overtime Request",
                filters: {
                    employee: frm.doc.employee,
                    docstatus: 1,
                    start_datetime: ["<=", frm.doc.end_datetime],
                    end_datetime: [">=", frm.doc.start_datetime],
                    name: ["!=", frm.doc.name]
                },
                fields: ["name"]
            },
            async: false,
            callback: function(r) {
                if (r.message && r.message.length > 0) {
                    frappe.msgprint(__('? Overlapping request found for this employee. Please change the period.'));
                    frappe.validated = false;
                }
            }
        });

        calculate_and_assign_hours(frm);
    },

    after_save: function(frm) {
        calculate_and_assign_hours(frm);
    }
});


// ?? Check if start_date is holiday
function update_holiday_flag(frm) {
    if (!frm.doc.start_datetime) return;

    let start_date = moment(frm.doc.start_datetime).format("YYYY-MM-DD");

    frappe.db.get_list("Holiday", {
        filters: { holiday_date: start_date },
        fields: ["name"]
    }).then(r => {
        if (r.length) {
            frm.set_value("holiday", 1);
            frm.set_value("normal_work", 0);
        } else {
            frm.set_value("holiday", 0);
            frm.set_value("normal_work", 1);
        }
    });
}


// ?? Calculate hours & assign to correct field
function calculate_and_assign_hours(frm) {
    if (!(frm.doc.start_datetime && frm.doc.end_datetime)) return;

    let start = moment(frm.doc.start_datetime);
    let end = moment(frm.doc.end_datetime);

    if (end.isBefore(start)) {
        frappe.msgprint(__('? End DateTime cannot be before Start DateTime'));
        frm.set_value('total_hours', 0);
        frm.set_value("total_holiday_hours", 0);
        frm.set_value("total_normal_work_hours", 0);
        return;
    }

    let duration = moment.duration(end.diff(start));
    let hours = duration.asHours();

    // Format: round to 2 decimals, strip trailing zeros, keep 0 clean
    let formatted_hours = (hours === 0) ? 0 : parseFloat(hours.toFixed(2));

    frm.set_value("total_hours", formatted_hours);

    if (frm.doc.holiday) {
        frm.set_value("total_holiday_hours", formatted_hours);
        frm.set_value("total_normal_work_hours", 0);
    } else {
        frm.set_value("total_normal_work_hours", formatted_hours);
        frm.set_value("total_holiday_hours", 0);
    }
}


// 	},
// });
