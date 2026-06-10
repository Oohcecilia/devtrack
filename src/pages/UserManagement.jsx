import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { couchdb } from "@/api/couchdbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, UserCog } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import UserFormDialog from "@/components/users/UserFormDialog";
import ResetPasswordDialog from "@/components/users/ResetPasswordDialog";
import UserTable from "@/components/users/UserTable";
import { useAuth } from "@/lib/AuthContext";

export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => couchdb.users.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => couchdb.users.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => couchdb.users.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }) => couchdb.users.resetPassword(id, password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => couchdb.users.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const handleSave = async (formData) => {
    setError("");
    try {
      if (editingUser) {
        await updateMutation.mutateAsync({ id: editingUser.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setEditingUser(null);
      setShowForm(false);
    } catch (err) {
      setError(err.message || "Failed to save user");
    }
  };

  const handleResetPassword = async (password) => {
    setError("");
    try {
      await resetPasswordMutation.mutateAsync({ id: resettingUser.id, password });
      setResettingUser(null);
    } catch (err) {
      setError(err.message || "Failed to reset password");
    }
  };

  const handleToggleActive = async (user) => {
    setError("");
    try {
      await updateMutation.mutateAsync({
        id: user.id,
        data: { active: user.active === false },
      });
    } catch (err) {
      setError(err.message || "Failed to update user status");
    }
  };

  const confirmDelete = async () => {
    if (!deletingUser) {
      return;
    }

    setError("");
    try {
      await deleteMutation.mutateAsync(deletingUser.id);
      setDeletingUser(null);
    } catch (err) {
      setError(err.message || "Failed to delete user");
    }
  };

  const filtered = users.filter((item) =>
    !search ||
    item.username?.toLowerCase().includes(search.toLowerCase()) ||
    item.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
	        <Button className="w-full sm:w-auto" onClick={() => { setEditingUser(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Create User
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title={users.length === 0 ? "No users yet" : "No matching users"}
          description={users.length === 0 ? "Create the first user account." : "Try adjusting your search."}
          action={users.length === 0 && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create First User
            </Button>
          )}
        />
      ) : (
        <UserTable
          users={filtered}
          currentUser={currentUser}
          onEdit={(user) => { setEditingUser(user); setShowForm(true); }}
          onResetPassword={setResettingUser}
          onToggleActive={handleToggleActive}
          onDelete={setDeletingUser}
        />
      )}

      <UserFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditingUser(null); setError(""); }}
        onSave={handleSave}
        user={editingUser}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <ResetPasswordDialog
        open={!!resettingUser}
        onClose={() => { setResettingUser(null); setError(""); }}
        onSave={handleResetPassword}
        user={resettingUser}
        isSaving={resetPasswordMutation.isPending}
      />

      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingUser?.username}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
