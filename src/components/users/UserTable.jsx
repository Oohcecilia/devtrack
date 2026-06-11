import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { KeyRound, Pencil, Power, Trash2 } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

export default function UserTable({ users, currentUser, onEdit, onResetPassword, onToggleActive, onDelete }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold">Username</TableHead>
            <TableHead className="font-semibold">Role</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Updated</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isSelf = user.id === currentUser?.id;
            return (
              <TableRow key={user.id} className="group">
                <TableCell className="font-mono text-sm font-medium">{user.username}</TableCell>
                <TableCell className="capitalize">{user.role}</TableCell>
                <TableCell>
                  <StatusBadge status={user.active === false ? "Inactive" : "Active"} />
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit User" onClick={() => onEdit(user)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Reset Password" onClick={() => onResetPassword(user)}>
                      <KeyRound className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={user.active === false ? "Activate User" : "Deactivate User"}
                      disabled={isSelf}
                      onClick={() => onToggleActive(user)}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Delete User"
                      disabled={isSelf}
                      onClick={() => onDelete(user)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
