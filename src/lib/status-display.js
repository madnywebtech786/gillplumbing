export const INQUIRY_STATUS_DISPLAY = {
  NEW: { label: "New", tone: "info" },
  FOLLOW_UP: { label: "Follow-up", tone: "warning" },
  CONVERTED: { label: "Converted", tone: "success" },
  CLOSED: { label: "Closed", tone: "neutral" },
};

export const BOOKING_STATUS_DISPLAY = {
  SCHEDULED: { label: "Scheduled", tone: "info" },
  CONFIRMED: { label: "Confirmed", tone: "accent" },
  IN_PROGRESS: { label: "In progress", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
};

export const JOB_REPORT_STATUS_DISPLAY = {
  DRAFT: { label: "Draft", tone: "neutral" },
  SUBMITTED: { label: "Submitted", tone: "success" },
  VOIDED: { label: "Voided", tone: "danger" },
};

export const LEDGER_TRANSACTION_TYPE_DISPLAY = {
  CHARGE: { label: "Charge", tone: "info" },
  PAYMENT: { label: "Payment", tone: "success" },
  REFUND: { label: "Refund", tone: "warning" },
  ADJUSTMENT: { label: "Adjustment", tone: "accent" },
  REVERSAL: { label: "Reversal", tone: "danger" },
};

export const AUDIT_ACTION_DISPLAY = {
  EMPLOYEE_CREATED: { label: "Employee created", tone: "info" },
  EMPLOYEE_UPDATED: { label: "Employee updated", tone: "neutral" },
  EMPLOYEE_ACTIVATED: { label: "Employee activated", tone: "success" },
  EMPLOYEE_DEACTIVATED: { label: "Employee deactivated", tone: "danger" },
  INQUIRY_CREATED: { label: "Inquiry created", tone: "info" },
  INQUIRY_FOLLOW_UP_SET: { label: "Inquiry follow-up set", tone: "warning" },
  INQUIRY_CLOSED: { label: "Inquiry closed", tone: "neutral" },
  INQUIRY_CONVERTED: { label: "Inquiry converted", tone: "success" },
  BOOKING_CREATED: { label: "Booking created", tone: "info" },
  BOOKING_EMPLOYEES_ASSIGNED: { label: "Employees assigned", tone: "accent" },
  BOOKING_RESCHEDULED: { label: "Booking rescheduled", tone: "warning" },
  BOOKING_CANCELLED: { label: "Booking cancelled", tone: "danger" },
  BOOKING_STATUS_CHANGED: { label: "Booking status changed", tone: "accent" },
  JOB_REPORT_DRAFT_DELETED: { label: "Draft report deleted", tone: "neutral" },
  JOB_REPORT_SUBMITTED: { label: "Job report submitted", tone: "success" },
  JOB_REPORT_VOIDED: { label: "Job report voided", tone: "danger" },
  PAYMENT_RECORDED: { label: "Payment recorded", tone: "success" },
  REFUND_RECORDED: { label: "Refund recorded", tone: "warning" },
  ADJUSTMENT_POSTED: { label: "Adjustment posted", tone: "accent" },
  TRANSACTION_REVERSED: { label: "Transaction reversed", tone: "danger" },
};

export const AUDIT_ENTITY_TYPE_DISPLAY = {
  USER: "Employee",
  CUSTOMER: "Customer",
  INQUIRY: "Inquiry",
  BOOKING: "Booking",
  JOB_REPORT: "Job report",
  LEDGER_TRANSACTION: "Ledger transaction",
  SETTINGS: "Settings",
};
