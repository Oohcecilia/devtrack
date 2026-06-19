import jsPDF from "jspdf";
import { format } from "date-fns";

function resolveTemplateText(templateText, replacements) {
  return String(templateText || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key) => replacements[key] ?? "");
}

function getTemplateLines(doc, text, maxWidth) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return [];
  }

  return trimmed
    .split("\n")
    .flatMap((line) => doc.splitTextToSize(line, maxWidth));
}

function getReportPageLayout(doc, template, replacements, margin) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const headerLines = getTemplateLines(doc, resolveTemplateText(template?.header, replacements), contentWidth);
  const footerLines = getTemplateLines(doc, resolveTemplateText(template?.footer, replacements), contentWidth);
  const headerHeight = headerLines.length ? headerLines.length * 4 + 10 : 0;
  const footerHeight = footerLines.length ? footerLines.length * 4 + 10 : 0;

  return {
    pageWidth,
    pageHeight,
    contentWidth,
    headerLines,
    footerLines,
    headerHeight,
    footerHeight,
    contentTop: margin + headerHeight,
    contentBottom: pageHeight - margin - footerHeight,
  };
}

function drawReportTemplate(doc, template, reportTitle, generatedAt, margin) {
  const pageNumber = doc.getCurrentPageInfo().pageNumber;
  const replacements = {
    report_title: reportTitle,
    generated_at: generatedAt,
    page_number: String(pageNumber),
  };
  const layout = getReportPageLayout(doc, template, replacements, margin);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);

  if (layout.headerLines.length) {
    doc.text(layout.headerLines, margin, 14);
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.3);
    doc.line(margin, margin + layout.headerHeight - 2, layout.pageWidth - margin, margin + layout.headerHeight - 2);
  }

  if (layout.footerLines.length) {
    const footerTop = layout.pageHeight - margin - layout.footerHeight + 6;
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.3);
    doc.line(margin, footerTop - 6, layout.pageWidth - margin, footerTop - 6);
    doc.text(layout.footerLines, margin, footerTop);
  }

  doc.setTextColor(0, 0, 0);
  return layout;
}

function ensureSpace(doc, currentY, heightNeeded, template, reportTitle, generatedAt, margin) {
  let layout = drawReportTemplate(doc, template, reportTitle, generatedAt, margin);
  if (currentY + heightNeeded <= layout.contentBottom) {
    return { y: currentY, layout };
  }

  doc.addPage();
  layout = drawReportTemplate(doc, template, reportTitle, generatedAt, margin);
  return { y: layout.contentTop, layout };
}

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
    `Branch: ${assignment.branch || "N/A"}`,
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

export function generateInventoryReportPDF(devices, template) {
  const doc = new jsPDF();
  const margin = 20;
  const generatedAt = format(new Date(), "MMMM d, yyyy 'at' h:mm a");
  const reportTitle = "Device Inventory Report";
  let layout = drawReportTemplate(doc, template, reportTitle, generatedAt, margin);
  const pageWidth = layout.pageWidth;
  let y = layout.contentTop;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(reportTitle, pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${generatedAt}`, pageWidth / 2, y, { align: "center" });
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

  const drawInventoryTableHeader = () => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, pageWidth - margin * 2, 8, "F");
    doc.text("Asset Tag", cols[0], y);
    doc.text("Device Name", cols[1], y);
    doc.text("Brand", cols[2], y);
    doc.text("Model", cols[3], y);
    doc.text("Serial #", cols[4], y);
    doc.text("Status", cols[5], y);
    y += 10;
  };

  const cols = [margin + 2, margin + 25, margin + 65, margin + 95, margin + 120, margin + 148];
  drawInventoryTableHeader();

  doc.setFont("helvetica", "normal");
  devices.forEach(d => {
    const next = ensureSpace(doc, y, 8, template, reportTitle, generatedAt, margin);
    y = next.y;
    layout = next.layout;

    if (y === layout.contentTop) {
      drawInventoryTableHeader();
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

export function generateAssignmentReportPDF(assignments, template) {
  const doc = new jsPDF();
  const margin = 20;
  const generatedAt = format(new Date(), "MMMM d, yyyy 'at' h:mm a");
  const reportTitle = "Assignment Report";
  let layout = drawReportTemplate(doc, template, reportTitle, generatedAt, margin);
  const pageWidth = layout.pageWidth;
  let y = layout.contentTop;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(reportTitle, pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${generatedAt}`, pageWidth / 2, y, { align: "center" });
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

  const drawAssignmentTableHeader = () => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, pageWidth - margin * 2, 8, "F");
    doc.text("Employee", cols[0], y);
    doc.text("Branch", cols[1], y);
    doc.text("Device", cols[2], y);
    doc.text("Asset Tag", cols[3], y);
    doc.text("Assigned", cols[4], y);
    doc.text("Status", cols[5], y);
    y += 10;
  };

  const cols = [margin + 2, margin + 34, margin + 62, margin + 92, margin + 118, margin + 148];
  drawAssignmentTableHeader();

  doc.setFont("helvetica", "normal");
  assignments.forEach(a => {
    const next = ensureSpace(doc, y, 8, template, reportTitle, generatedAt, margin);
    y = next.y;
    layout = next.layout;

    if (y === layout.contentTop) {
      drawAssignmentTableHeader();
    }
    doc.text((a.employee_name || "").substring(0, 16), cols[0], y);
    doc.text((a.branch || "").substring(0, 14), cols[1], y);
    doc.text((a.device_name || "").substring(0, 16), cols[2], y);
    doc.text((a.asset_tag || "").substring(0, 12), cols[3], y);
    doc.text(a.assigned_date ? format(new Date(a.assigned_date), "MMM d, yyyy") : "", cols[4], y);
    doc.text(a.status || "", cols[5], y);
    y += 7;
  });

  doc.save(`assignment_report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
