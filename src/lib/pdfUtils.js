import jsPDF from "jspdf";
import { format } from "date-fns";

export function generateAcknowledgementPDF(assignment, employee, devices) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 30;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Equipment Acknowledgement Letter", pageWidth / 2, y, { align: "center" });
  y += 15;

  doc.setDrawColor(0, 150, 136);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  // Date
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${format(new Date(), "MMMM d, yyyy")}`, margin, y);
  y += 20;

  // Employee Info
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Employee Information", margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const empInfo = [
    `Employee ID: ${employee?.employee_id || assignment.employee_id || "N/A"}`,
    `Name: ${employee?.full_name || assignment.employee_name}`,
    `Department: ${employee?.department || "N/A"}`,
    `Position: ${employee?.position || "N/A"}`,
  ];
  empInfo.forEach(line => {
    doc.text(line, margin, y);
    y += 7;
  });
  y += 10;

  // Device Info
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Equipment Details", margin, y);
  y += 10;

  const deviceList = devices || [assignment];
  // Table header
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 4, pageWidth - margin * 2, 8, "F");
  doc.text("Asset Tag", margin + 2, y);
  doc.text("Device", margin + 35, y);
  doc.text("Assigned Date", margin + 100, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  deviceList.forEach(item => {
    doc.text(item.asset_tag || "N/A", margin + 2, y);
    doc.text(item.device_name || "N/A", margin + 35, y);
    doc.text(item.assigned_date ? format(new Date(item.assigned_date), "MMM d, yyyy") : "N/A", margin + 100, y);
    y += 8;
  });
  y += 20;

  // Acknowledgement text
  doc.setFontSize(10);
  const ackText = `I, ${employee?.full_name || assignment.employee_name}, hereby acknowledge receipt of the above-listed equipment. I agree to use the equipment responsibly, in accordance with company policies, and to return it in good condition upon request or upon termination of employment.`;
  const lines = doc.splitTextToSize(ackText, pageWidth - margin * 2);
  doc.text(lines, margin, y);
  y += lines.length * 6 + 30;

  // Signature lines
  doc.line(margin, y, margin + 60, y);
  doc.text("Employee Signature", margin, y + 6);

  doc.line(pageWidth - margin - 60, y, pageWidth - margin, y);
  doc.text("Date", pageWidth - margin - 60, y + 6);

  y += 25;
  doc.line(margin, y, margin + 60, y);
  doc.text("Authorized By", margin, y + 6);

  doc.save(`acknowledgement_${(employee?.full_name || assignment.employee_name).replace(/\s+/g, "_")}.pdf`);
}

export function generateInventoryReportPDF(devices) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 30;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Device Inventory Report", pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, pageWidth / 2, y, { align: "center" });
  y += 5;

  doc.setDrawColor(0, 150, 136);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Summary
  const available = devices.filter(d => d.status === "Available").length;
  const assigned = devices.filter(d => d.status === "Assigned").length;
  const maintenance = devices.filter(d => d.status === "Maintenance").length;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Total Devices: ${devices.length}    |    Available: ${available}    |    Assigned: ${assigned}    |    Maintenance: ${maintenance}`, margin, y);
  y += 15;

  // Table
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 4, pageWidth - margin * 2, 8, "F");
  const cols = [margin + 2, margin + 25, margin + 65, margin + 95, margin + 120, margin + 148];
  doc.text("Asset Tag", cols[0], y);
  doc.text("Device Name", cols[1], y);
  doc.text("Brand", cols[2], y);
  doc.text("Model", cols[3], y);
  doc.text("Serial #", cols[4], y);
  doc.text("Status", cols[5], y);
  y += 10;

  doc.setFont("helvetica", "normal");
  devices.forEach(d => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text(d.asset_tag || "", cols[0], y);
    doc.text((d.device_name || "").substring(0, 20), cols[1], y);
    doc.text((d.brand || "").substring(0, 14), cols[2], y);
    doc.text((d.model || "").substring(0, 12), cols[3], y);
    doc.text((d.serial_number || "").substring(0, 14), cols[4], y);
    doc.text(d.status || "", cols[5], y);
    y += 7;
  });

  doc.save(`inventory_report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

export function generateAssignmentReportPDF(assignments) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 30;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Assignment Report", pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, pageWidth / 2, y, { align: "center" });
  y += 5;

  doc.setDrawColor(0, 150, 136);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const active = assignments.filter(a => a.status === "Active").length;
  const returned = assignments.filter(a => a.status === "Returned").length;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Total Assignments: ${assignments.length}    |    Active: ${active}    |    Returned: ${returned}`, margin, y);
  y += 15;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 4, pageWidth - margin * 2, 8, "F");
  const cols = [margin + 2, margin + 40, margin + 80, margin + 105, margin + 135];
  doc.text("Employee", cols[0], y);
  doc.text("Device", cols[1], y);
  doc.text("Asset Tag", cols[2], y);
  doc.text("Assigned", cols[3], y);
  doc.text("Status", cols[4], y);
  y += 10;

  doc.setFont("helvetica", "normal");
  assignments.forEach(a => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text((a.employee_name || "").substring(0, 20), cols[0], y);
    doc.text((a.device_name || "").substring(0, 20), cols[1], y);
    doc.text(a.asset_tag || "", cols[2], y);
    doc.text(a.assigned_date ? format(new Date(a.assigned_date), "MMM d, yyyy") : "", cols[3], y);
    doc.text(a.status || "", cols[4], y);
    y += 7;
  });

  doc.save(`assignment_report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}