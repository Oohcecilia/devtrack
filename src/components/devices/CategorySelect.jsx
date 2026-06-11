import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Trash2 } from "lucide-react";

const DEFAULT_CATEGORIES = ["Laptop", "Desktop", "Monitor", "Tablet", "Phone", "Peripheral", "Server", "Networking"];

const STORAGE_KEY = "devtrack_categories";

function getCategories() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [...DEFAULT_CATEGORIES];
  } catch {
    return [...DEFAULT_CATEGORIES];
  }
}

function saveCategories(cats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
}

export default function CategorySelect({ value, onChange }) {
  const [categories, setCategories] = useState(getCategories);
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState("");
  const visibleCategories = value && !categories.includes(value) ? [value, ...categories] : categories;

  const handleAdd = () => {
    const trimmed = newCat.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    const updated = [...categories, trimmed];
    setCategories(updated);
    saveCategories(updated);
    onChange(trimmed);
    setNewCat("");
    setAdding(false);
  };

  const handleRemove = (category) => {
    const updated = categories.filter((cat) => cat !== category);
    setCategories(updated);
    saveCategories(updated);
    if (value === category) {
      onChange("");
    }
  };

  return (
    <div className="space-y-2">
      {adding ? (
        <div className="flex gap-2">
          <Input
            autoFocus
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="New category name..."
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } if (e.key === "Escape") setAdding(false); }}
          />
          <Button type="button" size="icon" onClick={handleAdd}>
            <Plus className="w-4 h-4" />
          </Button>
          <Button type="button" size="icon" variant="outline" onClick={() => setAdding(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Select value={value || ""} onValueChange={onChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              {visibleCategories.map((cat) => (
                <div key={cat} className="flex items-center gap-1">
                  <SelectItem value={cat} className="flex-1 pr-2">
                    {cat}
                  </SelectItem>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    title={`Remove ${cat}`}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleRemove(cat);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="icon" variant="outline" onClick={() => setAdding(true)} title="Add new category">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
