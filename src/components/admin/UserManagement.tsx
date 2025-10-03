import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Shield, Mail, Trash2, KeyRound, Edit, TestTube, Copy, LogIn } from "lucide-react";
import { useRoleImpersonation, UserRole } from "@/hooks/useRoleImpersonation";

interface Profile {
  id: string;
  display_name: string;
  role: string;
  created_at: string;
  email?: string;
}

export const UserManagement = () => {
  const { toast } = useToast();
  const { getEffectiveRole } = useRoleImpersonation();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [effectiveRole, setEffectiveRole] = useState<UserRole | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [creatingTestAccounts, setCreatingTestAccounts] = useState(false);
  const [loggingInAs, setLoggingInAs] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "supporter",
  });

  const testAccounts = [
    { email: "testbestie@example.com", password: "TestBestie123!", displayName: "Test Bestie", role: "bestie" },
    { email: "testguardian@example.com", password: "TestGuardian123!", displayName: "Test Guardian", role: "caregiver" },
    { email: "testsupporter@example.com", password: "TestSupporter123!", displayName: "Test Supporter", role: "supporter" },
    { email: "testvendor@example.com", password: "TestVendor123!", displayName: "Test Vendor", role: "vendor" },
  ];

  useEffect(() => {
    loadCurrentUser();
    loadUsers();
  }, []);

  // Calculate effective role whenever current role changes
  useEffect(() => {
    if (currentUserRole) {
      const effective = getEffectiveRole(currentUserRole as UserRole);
      setEffectiveRole(effective);
    }
  }, [currentUserRole, getEffectiveRole]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setCurrentUserRole(profile?.role || null);
    } catch (error: any) {
      console.error("Error loading current user:", error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, role, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No active session");
      }

      const { data, error } = await supabase.functions.invoke("create-user", {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: "User created successfully",
        description: `${formData.displayName} has been added to the community.`,
      });

      setFormData({
        email: "",
        password: "",
        displayName: "",
        role: "supporter",
      });
      setDialogOpen(false);
      await loadUsers();
    } catch (error: any) {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSendPasswordReset = async (email: string, displayName: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Password reset sent",
        description: `A password reset email has been sent to ${displayName}`,
      });
    } catch (error: any) {
      toast({
        title: "Error sending password reset",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string, displayName: string) => {
    try {
      const { error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });

      if (error) throw error;

      toast({
        title: "User deleted",
        description: `${displayName} has been removed from the community.`,
      });

      await loadUsers();
    } catch (error: any) {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditRole = (user: Profile) => {
    setEditingUser(user);
    setNewRole(user.role);
    setEditDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase.functions.invoke("update-user-role", {
        body: { userId: editingUser.id, newRole },
      });

      if (error) throw error;

      toast({
        title: "Role updated",
        description: `${editingUser.display_name}'s role has been changed to ${newRole}.`,
      });

      setEditDialogOpen(false);
      await loadUsers();
    } catch (error: any) {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const canEditUserRole = (userRole: string) => {
    // Use effective role (with impersonation) instead of actual role
    if (effectiveRole === "owner") return true;
    // Admins can only edit non-admin roles
    return effectiveRole === "admin" && !["admin", "owner", "moderator"].includes(userRole);
  };

  const canDeleteUser = (userRole: string) => {
    // Use effective role (with impersonation) instead of actual role
    if (effectiveRole === "owner") return true;
    // Admins can only delete non-admin users
    return effectiveRole === "admin" && !["admin", "owner", "moderator"].includes(userRole);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-gradient-to-r from-primary to-accent text-white";
      case "admin":
        return "bg-primary text-white";
      case "moderator":
        return "bg-accent text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleCreateTestAccounts = async () => {
    setCreatingTestAccounts(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const account of testAccounts) {
      try {
        const { data, error } = await supabase.functions.invoke("create-user", {
          body: account,
        });

        if (error) {
          console.error(`Error creating ${account.displayName}:`, error);
          // If account already exists, that's okay
          if (error.message?.includes("already registered") || 
              error.message?.includes("User already registered")) {
            successCount++;
          } else {
            errors.push(`${account.displayName}: ${error.message}`);
          }
        } else if (data?.error) {
          console.error(`Error creating ${account.displayName}:`, data.error);
          if (data.error.includes("already registered") || 
              data.error.includes("User already registered")) {
            successCount++;
          } else {
            errors.push(`${account.displayName}: ${data.error}`);
          }
        } else {
          successCount++;
        }
      } catch (error: any) {
        console.error(`Exception creating ${account.displayName}:`, error);
        errors.push(`${account.displayName}: ${error.message || 'Unknown error'}`);
      }
    }

    if (successCount > 0) {
      toast({
        title: "Test accounts ready",
        description: `${successCount} test account(s) are now available for testing.`,
      });
    }

    if (errors.length > 0) {
      console.error("Account creation errors:", errors);
      toast({
        title: "Some accounts failed",
        description: errors.join('\n'),
        variant: "destructive",
      });
    }

    setCreatingTestAccounts(false);
    await loadUsers();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The credential has been copied.",
    });
  };

  const handleLoginAs = async (email: string, password: string, displayName: string) => {
    setLoggingInAs(email);
    try {
      // Sign out current user
      await supabase.auth.signOut();
      
      // Sign in as test user
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Logged in successfully",
        description: `You are now logged in as ${displayName}`,
      });

      // Redirect to community page
      window.location.href = "/community";
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Could not log in as test user. Make sure the account exists.",
        variant: "destructive",
      });
      setLoggingInAs(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Test Accounts Card */}
      <Card className="border-dashed border-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            <CardTitle>Test Accounts</CardTitle>
          </div>
          <CardDescription>
            Use these accounts to test different user experiences. Click "Create Test Accounts" if they don't exist yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {testAccounts.map((account) => (
              <Card key={account.email} className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">{account.displayName}</CardTitle>
                  <CardDescription className="text-xs">{account.role}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Email</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-background px-2 py-1 rounded flex-1">{account.email}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(account.email)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">Password</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-background px-2 py-1 rounded flex-1">{account.password}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(account.password)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleLoginAs(account.email, account.password, account.displayName)}
                    disabled={loggingInAs !== null}
                    className="w-full gap-2 mt-2"
                    size="sm"
                  >
                    {loggingInAs === account.email ? (
                      <>
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-3 h-3" />
                        Login As
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button 
            onClick={handleCreateTestAccounts} 
            disabled={creatingTestAccounts}
            className="w-full gap-2"
            variant="outline"
          >
            {creatingTestAccounts ? (
              <>
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
                Creating Test Accounts...
              </>
            ) : (
              <>
                <TestTube className="w-4 h-4" />
                Create/Verify Test Accounts
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* User Management Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Create and manage community members</CardDescription>
          </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateUser}>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new member to the Best Day Ministries community
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    required
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supporter">Supporter</SelectItem>
                      <SelectItem value="bestie">Bestie</SelectItem>
                      <SelectItem value="caregiver">Caregiver</SelectItem>
                      {effectiveRole === "owner" && (
                        <>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {effectiveRole === "admin" && (
                    <p className="text-xs text-muted-foreground">
                      As an admin, you can only create non-admin users. Contact an owner to create admin accounts.
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <div className="w-4 h-4 mr-2 rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
                      Creating...
                    </>
                  ) : (
                    "Create User"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Display Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.display_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {user.email}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                    {user.role === "owner" && <Shield className="w-3 h-3 inline mr-1" />}
                    {user.role}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {canEditUserRole(user.role) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRole(user)}
                        title="Edit user role"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendPasswordReset(user.email || '', user.display_name)}
                      disabled={!user.email || user.email === 'Unknown'}
                      title="Send password reset email"
                    >
                      <KeyRound className="w-4 h-4" />
                    </Button>
                    {canDeleteUser(user.role) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {user.display_name}'s account? This action cannot be undone and will permanently remove all of their data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteUser(user.id, user.display_name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Account
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Role Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change the role for {editingUser?.display_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newRole">New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supporter">Supporter</SelectItem>
                  <SelectItem value="bestie">Bestie</SelectItem>
                  <SelectItem value="caregiver">Caregiver</SelectItem>
                  {currentUserRole === "owner" && (
                    <>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole}>
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    </div>
  );
};