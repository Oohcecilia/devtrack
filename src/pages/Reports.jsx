import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { couchdb } from "@/api/couchdbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Monitor, ArrowLeftRight, Plus, Save, CheckCircle2, Trash2, ImagePlus, X } from "lucide-react";
import {
  createEmptyReportTemplate,
  getActiveReportTemplateId,
  getDefaultReportTemplate,
  getStoredReportTemplates,
  saveReportTemplates,
  setActiveReportTemplateId,
} from "@/lib/reportTemplates";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["hsl(173, 58%, 39%)", "hsl(199, 89%, 48%)", "hsl(43, 74%, 66%)"];

export default function Reports() {
  const logoInputRef = useRef(null);
  const [templates, setTemplates] = useState([getDefaultReportTemplate()]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(getDefaultReportTemplate().id);
  const [activeTemplateId, setActiveTemplateId] = useState(getDefaultReportTemplate().id);
  const [draftTemplate, setDraftTemplate] = useState(getDefaultReportTemplate());

  useEffect(() => {
    const storedTemplates = getStoredReportTemplates();
    const activeId = getActiveReportTemplateId();
    const initialSelected =
      storedTemplates.find((template) => template.id === activeId) ||
      storedTemplates[0] ||
      getDefaultReportTemplate();
    const initialActiveId = storedTemplates.some((template) => template.id === activeId)
      ? activeId
      : initialSelected.id;

    setTemplates(storedTemplates);
    setActiveTemplateId(initialActiveId);
    setSelectedTemplateId(initialSelected.id);
    setDraftTemplate(initialSelected);
  }, []);

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: () => couchdb.entities.Device.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => couchdb.entities.Assignment.list(),
  });

  const activeTemplate =
    templates.find((template) => template.id === activeTemplateId) ||
    getDefaultReportTemplate();

  const upsertTemplate = (templateToSave) => {
    const normalized = {
      ...templateToSave,
      name: templateToSave.name.trim() || "Untitled Template",
      header: templateToSave.header || "",
      footer: templateToSave.footer || "",
    };

    const nextTemplates = templates.some((template) => template.id === normalized.id)
      ? templates.map((template) => (template.id === normalized.id ? normalized : template))
      : [...templates, normalized];

    setTemplates(nextTemplates);
    saveReportTemplates(nextTemplates);
    return normalized;
  };

  const handleTemplateSelect = (templateId) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }
    setSelectedTemplateId(template.id);
    setDraftTemplate(template);
  };

  const handleNewTemplate = () => {
    const nextTemplate = createEmptyReportTemplate();
    setSelectedTemplateId(nextTemplate.id);
    setDraftTemplate(nextTemplate);
  };

  const handleSaveTemplate = () => {
    const savedTemplate = upsertTemplate(draftTemplate);
    setSelectedTemplateId(savedTemplate.id);
    setDraftTemplate(savedTemplate);
    toast.success("Report template saved");
  };

  const handleApplyTemplate = () => {
    const savedTemplate = upsertTemplate(draftTemplate);
    setSelectedTemplateId(savedTemplate.id);
    setDraftTemplate(savedTemplate);
    setActiveTemplateId(savedTemplate.id);
    setActiveReportTemplateId(savedTemplate.id);
    toast.success(`Applied template: ${savedTemplate.name}`);
  };

  const handleDeleteTemplate = () => {
    if (selectedTemplateId === getDefaultReportTemplate().id) {
      toast.info("The default template cannot be deleted");
      return;
    }

    const nextTemplates = templates.filter((template) => template.id !== selectedTemplateId);
    const fallbackTemplate =
      nextTemplates.find((template) => template.id === activeTemplateId) ||
      nextTemplates[0] ||
      getDefaultReportTemplate();

    setTemplates(nextTemplates);
    saveReportTemplates(nextTemplates);
    setSelectedTemplateId(fallbackTemplate.id);
    setDraftTemplate(fallbackTemplate);

    if (activeTemplateId === selectedTemplateId) {
      setActiveTemplateId(fallbackTemplate.id);
      setActiveReportTemplateId(fallbackTemplate.id);
    }

    toast.success("Report template deleted");
  };

  const handleLogoPick = () => {
    logoInputRef.current?.click();
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDraftTemplate((prev) => ({
        ...prev,
        logoDataUrl: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleRemoveLogo = () => {
    setDraftTemplate((prev) => ({ ...prev, logoDataUrl: "" }));
  };

  const handleInventoryReport = async () => {
    const { generateInventoryReportPDF } = await import("@/lib/pdfUtils");
    generateInventoryReportPDF(devices, activeTemplate);
    toast.success("Inventory report downloaded");
  };

  const handleAssignmentReport = async () => {
    const { generateAssignmentReportPDF } = await import("@/lib/pdfUtils");
    generateAssignmentReportPDF(assignments, activeTemplate);
    toast.success("Assignment report downloaded");
  };

  const statusData = [
    { name: "Available", count: devices.filter(d => d.status === "Available").length },
    { name: "Assigned", count: devices.filter(d => d.status === "Assigned").length },
    { name: "Maintenance", count: devices.filter(d => d.status === "Maintenance").length },
  ];

  // Count by brand
  const brandCounts = {};
  devices.forEach(d => {
    const brand = d.brand || "Unknown";
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
  });
  const brandData = Object.entries(brandCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-semibold">Report Templates</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create reusable layouts for exported reports by customizing header and footer content.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={handleNewTemplate}>
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
            <Button type="button" variant="outline" onClick={handleSaveTemplate}>
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </Button>
            <Button type="button" onClick={handleApplyTemplate}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Apply Template
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteTemplate}
              disabled={selectedTemplateId === getDefaultReportTemplate().id}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px,1fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Saved Templates</label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
              <p className="font-medium">Active Template</p>
              <p className="mt-1 text-muted-foreground">{activeTemplate.name}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
              <p>Supported placeholders:</p>
              <p className="mt-2 font-mono">{"{{report_title}}"}</p>
              <p className="font-mono">{"{{generated_at}}"}</p>
              <p className="font-mono">{"{{page_number}}"}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name</label>
              <Input
                value={draftTemplate.name}
                onChange={(event) => setDraftTemplate({ ...draftTemplate, name: event.target.value })}
                placeholder="e.g. Management Layout"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Header Content</label>
              <Textarea
                value={draftTemplate.header}
                onChange={(event) => setDraftTemplate({ ...draftTemplate, header: event.target.value })}
                placeholder={"Company Name\n{{report_title}}\nGenerated: {{generated_at}}"}
                rows={5}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium">Header Logo</label>
                <div className="flex items-center gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  <Button type="button" variant="outline" onClick={handleLogoPick}>
                    <ImagePlus className="w-4 h-4 mr-2" />
                    Add Logo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveLogo}
                    disabled={!draftTemplate.logoDataUrl}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                {draftTemplate.logoDataUrl ? (
                  <img
                    src={draftTemplate.logoDataUrl}
                    alt="Template logo preview"
                    className="h-20 max-w-full object-contain"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No logo selected for this template.</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Footer Content</label>
              <Textarea
                value={draftTemplate.footer}
                onChange={(event) => setDraftTemplate({ ...draftTemplate, footer: event.target.value })}
                placeholder={"Confidential\nPage {{page_number}}"}
                rows={4}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The active template is applied across all PDF exports in the app, including acknowledgement letters.
            </p>
          </div>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Inventory Report</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Complete list of all devices with their current status, brand, model, and serial numbers.
              </p>
            </div>
          </div>
          <Button onClick={handleInventoryReport} className="w-full" disabled={devices.length === 0}>
            <FileDown className="w-4 h-4 mr-2" />
            Download Inventory PDF
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <ArrowLeftRight className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Assignment Report</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Full history of device assignments including active and returned items.
              </p>
            </div>
          </div>
          <Button onClick={handleAssignmentReport} className="w-full" disabled={assignments.length === 0}>
            <FileDown className="w-4 h-4 mr-2" />
            Download Assignment PDF
          </Button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-base font-semibold mb-4">Devices by Status</h3>
          {devices.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--card-foreground))"
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              No data available
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-base font-semibold mb-4">Devices by Brand</h3>
          {brandData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={brandData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--card-foreground))"
                  }}
                />
                <Bar dataKey="count" fill="hsl(173, 58%, 39%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
