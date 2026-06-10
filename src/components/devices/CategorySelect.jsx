import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

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
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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