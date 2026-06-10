import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const emptyForm = {
  username: "",
  password: "",
  role: "user",
  active: true,
};

export default function UserFormDialog({ open, onClose, onSave, user, isSaving }) {
  const [form, setForm] = useState(emptyForm);
  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || "",
        password: "",
        role: user.role || "user",
        active: user.active !== false,
      });
    } else {
      setForm(emptyForm);
    }
  }, [user, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      username: form.username,
      role: form.role,
      active: form.active,
    };
    if (!isEditing) {
      payload.password = form.password;
    }
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User" : "Create User"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-username">Username</Label>
            <Input
              id="user-username"
              autoComplete="username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="username"
              required
            />
          </div>
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="user-password">Password</Label>
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
            <Checkbox
              checked={form.active}
              onCheckedChange={(checked) => setForm({ ...form, active: checked === true })}
            />
            <span>Active</span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isEditing ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
