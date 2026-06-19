const TEMPLATES_STORAGE_KEY = "devtrack_report_templates";
const ACTIVE_TEMPLATE_STORAGE_KEY = "devtrack_active_report_template";

const DEFAULT_TEMPLATE = {
  id: "default-template",
  name: "Default Template",
  header: "",
  footer: "",
};

function normalizeTemplate(template) {
  return {
    id: template?.id || crypto.randomUUID(),
    name: String(template?.name || "").trim() || "Untitled Template",
    header: String(template?.header || ""),
    footer: String(template?.footer || ""),
  };
}

export function getDefaultReportTemplate() {
  return { ...DEFAULT_TEMPLATE };
}

export function getStoredReportTemplates() {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!stored) {
      return [getDefaultReportTemplate()];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [getDefaultReportTemplate()];
    }

    const normalized = parsed.map(normalizeTemplate);
    return normalized.some((template) => template.id === DEFAULT_TEMPLATE.id)
      ? normalized
      : [getDefaultReportTemplate(), ...normalized];
  } catch {
    return [getDefaultReportTemplate()];
  }
}

export function saveReportTemplates(templates) {
  const normalized = templates.map(normalizeTemplate);
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(normalized));
}

export function getActiveReportTemplateId() {
  return localStorage.getItem(ACTIVE_TEMPLATE_STORAGE_KEY) || DEFAULT_TEMPLATE.id;
}

export function setActiveReportTemplateId(templateId) {
  localStorage.setItem(ACTIVE_TEMPLATE_STORAGE_KEY, templateId);
}

export function createEmptyReportTemplate() {
  return {
    id: crypto.randomUUID(),
    name: "",
    header: "",
    footer: "",
  };
}
