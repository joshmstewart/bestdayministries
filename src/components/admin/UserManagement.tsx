import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabasePersistent } from "@/lib/supabaseWithPersistentAuth";
import { getPublicSiteUrl } from "@/lib/publicSiteUrl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus,
  Shield,
  Mail,
  Trash2,
  KeyRound,
  Edit,
  TestTube,
  Copy,
  LogIn,
  Store,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  AlertTriangle,
  MailCheck,
  Download,
} from "lucide-react";
import { useRoleImpersonation, UserRole } from "@/hooks/useRoleImpersonation";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Profile {
  id: string;
  display_name: string;
  role: string;
  created_at: string;
  email?: string;
  vendor_status?: 'pending' | 'approved' | 'rejected' | 'suspended' | null;
  business_name?: string;
  permissions?: string[];
  terms_version?: string | null;
  privacy_version?: string | null;
  terms_accepted_at?: string | null;
  newsletter_subscribed?: boolean;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [vendorStatusFilter, setVendorStatusFilter] = useState<string>("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [deletingUsers, setDeletingUsers] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [failedDeletions, setFailedDeletions] = useState<{ userId: string; displayName: string; error: string }[]>([]);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "supporter",
    subscribeToNewsletter: true,
  });

  const testAccounts = [
    { email: "testbestie@example.com", password: "TestBestie123!", displayName: "Test Bestie", role: "bestie" },
    { email: "testguardian@example.com", password: "TestGuardian123!", displayName: "Test Guardian", role: "caregiver" },
    { email: "testsupporter@example.com", password: "TestSupporter123!", displayName: "Test Supporter", role: "supporter" },
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

      // Fetch role from user_roles table (security requirement)
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      setCurrentUserRole(roleData?.role || null);
    } catch (error: any) {
      console.error("Error loading current user:", error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, email, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Build targeted lookup arrays from profiles
      const profileIds = (profiles || []).map(p => p.id);
      const profileEmails = (profiles || [])
        .map(p => (p.email || '').trim().toLowerCase())
        .filter(Boolean);

      // Fetch roles for all users
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role");

      // Fetch vendor info for all users
      const { data: vendorsData } = await supabase
        .from("vendors")
        .select("user_id, status, business_name");

      // Fetch permissions for all users
      const { data: permissionsData } = await supabase
        .from("user_permissions")
        .select("user_id, permission_type");

      // Fetch terms acceptance for all users (most recent version per user)
      const { data: termsData } = await supabase
        .from("terms_acceptance")
        .select("user_id, terms_version, privacy_version, accepted_at")
        .order("accepted_at", { ascending: false });

      // TARGETED newsletter lookup: fetch only rows matching current profiles
      // This bypasses any global row limits (1000) by querying specific IDs/emails
      const [newsletterByUserId, newsletterByEmail] = await Promise.all([
        profileIds.length > 0
          ? supabase
              .from("newsletter_subscribers")
              .select("user_id, email, status")
              .eq("status", "active")
              .in("user_id", profileIds)
          : Promise.resolve({ data: [] }),
        profileEmails.length > 0
          ? supabase
              .from("newsletter_subscribers")
              .select("user_id, email, status")
              .eq("status", "active")
              .in("email", profileEmails)
          : Promise.resolve({ data: [] }),
      ]);

      // Combine and dedupe newsletter results
      const allNewsletterRows = [
        ...(newsletterByUserId.data || []),
        ...(newsletterByEmail.data || []),
      ];

      // Group terms by user_id (take most recent)
      const termsMap = new Map();
      termsData?.forEach(term => {
        if (!termsMap.has(term.user_id)) {
          termsMap.set(term.user_id, term);
        }
      });

      // Create sets for both user_id and email lookup (deduped via Set)
      const subscribedUserIds = new Set(
        allNewsletterRows.filter(n => n.user_id).map(n => n.user_id)
      );
      const subscribedEmails = new Set(
        allNewsletterRows.map(n => n.email?.toLowerCase()).filter(Boolean)
      );

      // Diagnostic logs for verification (temporary)
      const knownEmails = ['nrhys2007@gmail.com', 'mlongobricco@gmail.com', 'gracebowen826@gmail.com', 'hmcint@gmail.com', 'ivanricmartinez@gmail.com'];
      console.info('[UserManagement] Loaded profiles:', profileIds.length);
      console.info('[UserManagement] Newsletter rows (by user_id):', newsletterByUserId.data?.length || 0);
      console.info('[UserManagement] Newsletter rows (by email):', newsletterByEmail.data?.length || 0);
      console.info('[UserManagement] Subscribed user IDs:', subscribedUserIds.size);
      console.info('[UserManagement] Subscribed emails:', subscribedEmails.size);
      knownEmails.forEach(email => {
        const inSet = subscribedEmails.has(email.toLowerCase());
        console.info(`[UserManagement] ${email} subscribed: ${inSet}`);
      });

      // Merge roles, vendor status, permissions, terms, and newsletter with profiles
      const usersWithRoles = (profiles || []).map(profile => {
        const userTerms = termsMap.get(profile.id);
        return {
          ...profile,
          role: rolesData?.find(r => r.user_id === profile.id)?.role || "supporter",
          vendor_status: vendorsData?.find(v => v.user_id === profile.id)?.status || null,
          business_name: vendorsData?.find(v => v.user_id === profile.id)?.business_name || undefined,
          permissions: permissionsData?.filter(p => p.user_id === profile.id).map(p => p.permission_type) || [],
          terms_version: userTerms?.terms_version || null,
          privacy_version: userTerms?.privacy_version || null,
          terms_accepted_at: userTerms?.accepted_at || null,
          newsletter_subscribed: subscribedUserIds.has(profile.id) || 
                                subscribedEmails.has(profile.email?.toLowerCase()),
        };
      });

      setUsers(usersWithRoles);
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
        subscribeToNewsletter: true,
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
      // Use custom edge function to send password reset via Resend (from our domain)
      const response = await supabase.functions.invoke('send-password-reset', {
        body: {
          email,
          redirectUrl: `${getPublicSiteUrl()}/auth?type=recovery`,
        },
      });

      if (response.error) throw response.error;

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

    try {
      // Use the dedicated edge function for persistent test accounts
      // This ensures they are created correctly and protected from cleanup
      const { data, error } = await supabase.functions.invoke("create-persistent-test-accounts");

      if (error) {
        console.error('Error creating/verifying test accounts:', error);
        toast({
          title: "Error creating test accounts",
          description: error.message || 'Failed to create/verify test accounts',
          variant: "destructive",
        });
        setCreatingTestAccounts(false);
        return;
      }

      if (data?.success) {
        const results = data.results || [];
        const created = results.filter((r: any) => r.status === 'created').length;
        const existing = results.filter((r: any) => r.status === 'exists').length;
        const failed = results.filter((r: any) => r.status === 'error').length;

        let message = '';
        if (created > 0) message += `${created} created. `;
        if (existing > 0) message += `${existing} already exist. `;
        if (failed > 0) message += `${failed} failed.`;

        toast({
          title: "Test accounts ready",
          description: message.trim() || 'All test accounts are available.',
        });

        if (failed > 0) {
          console.error('Failed accounts:', results.filter((r: any) => r.status === 'error'));
        }
      } else {
        toast({
          title: "Unexpected response",
          description: "The operation completed but returned an unexpected response.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Exception creating test accounts:', error);
      toast({
        title: "Error creating test accounts",
        description: error.message || 'An unexpected error occurred',
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
      // Sign out from BOTH clients to ensure clean state
      await Promise.all([
        supabase.auth.signOut(),
        supabasePersistent.auth.signOut(),
      ]);
      
      // Sign in using the persistent client (primary auth client)
      const { data, error } = await supabasePersistent.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is a vendor
      if (data.user) {
        const { data: vendor } = await supabasePersistent
          .from('vendors')
          .select('status')
          .eq('user_id', data.user.id)
          .maybeSingle();
        
        if (vendor) {
          toast({
            title: "Logged in successfully",
            description: `You are now logged in as ${displayName} (Vendor)`,
          });
          // Small delay to ensure session is fully synced before redirect
          await new Promise(resolve => setTimeout(resolve, 300));
          window.location.href = "/vendor-dashboard";
          return;
        }
      }

      toast({
        title: "Logged in successfully",
        description: `You are now logged in as ${displayName}`,
      });

      // Small delay to ensure session is fully synced before redirect
      await new Promise(resolve => setTimeout(resolve, 300));
      
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

  const handleTogglePermission = async (userId: string, permission: string, currentlyHas: boolean) => {
    try {
      if (currentlyHas) {
        // Revoke permission
        const { error } = await supabase
          .from("user_permissions")
          .delete()
          .eq("user_id", userId)
          .eq("permission_type", permission);

        if (error) throw error;

        toast({
          title: "Permission revoked",
          description: `${permission} permission has been removed.`,
        });
      } else {
        // Grant permission
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("user_permissions")
          .insert({
            user_id: userId,
            permission_type: permission,
            granted_by: user?.id
          });

        if (error) throw error;

        toast({
          title: "Permission granted",
          description: `${permission} permission has been added.`,
        });
      }

      await loadUsers();
    } catch (error: any) {
      toast({
        title: "Error updating permission",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === "" || 
      user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    const matchesVendorStatus = vendorStatusFilter === "all" || 
      (vendorStatusFilter === "none" && !user.vendor_status) ||
      user.vendor_status === vendorStatusFilter;
    
    return matchesSearch && matchesRole && matchesVendorStatus;
  });

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableUsers = filteredUsers.filter(user => canDeleteUser(user.role));
      setSelectedUsers(new Set(selectableUsers.map(u => u.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  // Handle individual checkbox
  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  // Check if all selectable users are selected
  const selectableUsers = filteredUsers.filter(user => canDeleteUser(user.role));
  const allSelectableSelected = selectableUsers.length > 0 && 
    selectableUsers.every(user => selectedUsers.has(user.id));

  // Handle bulk delete
  const handleBulkDelete = async () => {
    setDeletingUsers(true);
    setDeleteProgress({ current: 0, total: selectedUsers.size });
    setFailedDeletions([]);
    
    try {
      const userIdsToDelete = Array.from(selectedUsers);
      
      const { data, error } = await supabase.functions.invoke("bulk-delete-users", {
        body: { userIds: userIdsToDelete },
      });

      if (error) {
        throw error;
      }

      const results = data as { total: number; succeeded: number; failed: number; errors: { userId: string; error: string }[] };
      
      setDeleteProgress({ current: results.total, total: results.total });

      // Map failed users to include display names
      const failedUsers = results.errors.map(err => {
        const user = users.find(u => u.id === err.userId);
        return {
          userId: err.userId,
          displayName: user?.display_name || 'Unknown User',
          error: err.error
        };
      });
      setFailedDeletions(failedUsers);

      if (results.succeeded > 0) {
        toast({
          title: "Users Deleted",
          description: `Successfully deleted ${results.succeeded} of ${results.total} user${results.total !== 1 ? 's' : ''}${results.failed > 0 ? `. ${results.failed} failed.` : ''}`,
        });
      }
      
      if (results.failed > 0) {
        toast({
          variant: "destructive",
          title: "Some Deletions Failed",
          description: `${results.failed} of ${results.total} user${results.total !== 1 ? 's' : ''} failed to delete. See details below.`,
          duration: 10000,
        });
        
        console.error("Deletion errors:", results.errors);
      }

      await loadUsers();
    } catch (error) {
      console.error("Error in bulk delete:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setDeletingUsers(false);
      setSelectedUsers(new Set());
      setBulkDeleteDialogOpen(false);
      setConfirmDeleteDialogOpen(false);
    }
  };

  const handleDownloadCSV = () => {
    // Prepare CSV data
    const headers = [
      "Display Name",
      "Email",
      "Role",
      "Vendor Status",
      "Business Name",
      "Permissions",
      "Terms Version",
      "Privacy Version",
      "Terms Accepted At",
      "Newsletter Subscribed",
      "Created At"
    ];
    
    const rows = filteredUsers.map(user => [
      user.display_name || "",
      user.email || "",
      user.role || "",
      user.vendor_status || "",
      user.business_name || "",
      (user.permissions || []).join("; "),
      user.terms_version || "",
      user.privacy_version || "",
      user.terms_accepted_at ? new Date(user.terms_accepted_at).toLocaleString() : "",
      user.newsletter_subscribed ? "Yes" : "No",
      user.created_at ? new Date(user.created_at).toLocaleString() : ""
    ]);
    
    // Escape CSV values
    const escapeCSV = (value: string) => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };
    
    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map(row => row.map(escapeCSV).join(","))
    ].join("\n");
    
    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `user-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download started",
      description: `Exporting ${filteredUsers.length} users to CSV`,
    });
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

      {/* Failed Deletions Card */}
      {failedDeletions.length > 0 && (
        <Card className="border-destructive border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <CardTitle className="text-destructive">Failed to Delete {failedDeletions.length} Users</CardTitle>
            </div>
            <CardDescription>
              These users could not be deleted due to database constraints. They may have data in linked tables preventing deletion.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {failedDeletions.map((failed, idx) => (
                  <div key={failed.userId} className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{failed.displayName}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{failed.userId}</p>
                        <p className="text-xs text-destructive mt-1">{failed.error}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(failed.userId)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setFailedDeletions([])}
                className="flex-1"
              >
                Dismiss
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  // Try to delete failed users again
                  const failedIds = failedDeletions.map(f => f.userId);
                  setSelectedUsers(new Set(failedIds));
                  setFailedDeletions([]);
                  setBulkDeleteDialogOpen(true);
                }}
                className="flex-1 gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Retry Failed Users
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Management Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Create and manage community members</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleDownloadCSV}>
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
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
                      <SelectItem value="caregiver">Guardian</SelectItem>
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
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="subscribeToNewsletter"
                    checked={formData.subscribeToNewsletter}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, subscribeToNewsletter: !!checked })
                    }
                  />
                  <Label htmlFor="subscribeToNewsletter" className="text-sm font-normal">
                    Subscribe to newsletter
                  </Label>
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
          </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="supporter">Supporter</SelectItem>
                <SelectItem value="bestie">Bestie</SelectItem>
                <SelectItem value="caregiver">Guardian</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>
            <Select value={vendorStatusFilter} onValueChange={setVendorStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Store className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Vendor Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                <SelectItem value="none">Non-Vendors</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedUsers.size > 0 && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span className="font-medium text-destructive">
                {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <Button
              variant="destructive"
              onClick={() => setBulkDeleteDialogOpen(true)}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </Button>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelectableSelected}
                  onCheckedChange={handleSelectAll}
                  disabled={selectableUsers.length === 0}
                  aria-label="Select all users"
                />
              </TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead className="w-12"></TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Moderation Permissions</TableHead>
              <TableHead>Vendor Status</TableHead>
              <TableHead>Newsletter</TableHead>
              <TableHead>Terms Accepted</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No users found matching your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
              <TableRow key={user.id} className={selectedUsers.has(user.id) ? "bg-muted/50" : ""}>
                <TableCell>
                  <Checkbox
                    checked={selectedUsers.has(user.id)}
                    onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                    disabled={!canDeleteUser(user.role)}
                    aria-label={`Select ${user.display_name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{user.display_name}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (user.email) {
                        navigator.clipboard.writeText(user.email);
                        toast({
                          title: "Email copied",
                          description: user.email,
                        });
                      }
                    }}
                    title={user.email || "No email"}
                    className="h-8 w-8"
                  >
                    <Mail className="w-4 h-4" />
                  </Button>
                </TableCell>
                <TableCell>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                    {user.role === "owner" && <Shield className="w-3 h-3 inline mr-1" />}
                    {user.role}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {['admin', 'owner'].includes(user.role) ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Full Access
                      </span>
                    ) : (
                      <>
                        {user.permissions && user.permissions.length > 0 ? (
                          user.permissions.map(perm => (
                            <span key={perm} className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              {perm}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                        {canEditUserRole(user.role) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => {
                              const hasModerate = user.permissions?.includes('moderate');
                              handleTogglePermission(user.id, 'moderate', hasModerate || false);
                            }}
                            title={user.permissions?.includes('moderate') ? "Revoke moderation" : "Grant moderation"}
                          >
                            {user.permissions?.includes('moderate') ? '−' : '+'}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {user.vendor_status ? (
                    <div className="flex items-center gap-2">
                      {user.vendor_status === 'pending' && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                      {user.vendor_status === 'approved' && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Approved
                        </span>
                      )}
                      {user.vendor_status === 'rejected' && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </span>
                      )}
                      {user.vendor_status === 'suspended' && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Suspended
                        </span>
                      )}
                      {user.business_name && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          {user.business_name}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.newsletter_subscribed ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <MailCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Subscribed</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.terms_version && user.privacy_version ? (
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1 text-xs">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span className="font-medium">v{user.terms_version}</span>
                      </span>
                      {(user.terms_version !== "1.0" || user.privacy_version !== "1.0") && (
                        <span className="text-xs text-yellow-600 dark:text-yellow-400">Outdated</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-red-500" />
                      Not Signed
                    </span>
                  )}
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
            )))}
          </TableBody>
        </Table>
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} users
        </div>
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
                  <SelectItem value="caregiver">Guardian</SelectItem>
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

      {/* Bulk Delete Confirmation - First Warning */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-2xl">⚠️ WARNING: Bulk User Deletion</AlertDialogTitle>
            </div>
          </AlertDialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-base">
                <p className="font-semibold text-foreground">
                  You are about to permanently delete {selectedUsers.size} user account{selectedUsers.size !== 1 ? 's' : ''}.
                </p>
                
                <div className="p-4 bg-destructive/10 border-2 border-destructive/30 rounded-lg space-y-2">
                  <p className="font-semibold text-destructive">This action will PERMANENTLY remove:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
                    <li>All user authentication credentials</li>
                    <li>All user profiles and personal data</li>
                    <li>All posts, comments, and content created by these users</li>
                    <li>All relationships (guardian-bestie links, sponsorships, etc.)</li>
                    <li>All vendor data and business information</li>
                    <li>All permissions and role assignments</li>
                  </ul>
                </div>

                <div className="p-4 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-lg">
                  <p className="font-semibold text-yellow-700 dark:text-yellow-500">⚠️ CRITICAL WARNING:</p>
                  <p className="text-sm mt-1 text-yellow-700 dark:text-yellow-500">
                    This action <span className="font-bold underline">CANNOT BE UNDONE</span>. All data will be permanently lost and cannot be recovered.
                  </p>
                </div>

                <div className="text-sm">
                  <p className="font-semibold text-foreground mb-2">Selected users ({selectedUsers.size} total):</p>
                  {selectedUsers.size <= 10 ? (
                    <p className="text-muted-foreground">
                      {Array.from(selectedUsers).map(id => {
                        const user = users.find(u => u.id === id);
                        return user?.display_name;
                      }).join(', ')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-muted-foreground">
                        {Array.from(selectedUsers).slice(0, 5).map(id => {
                          const user = users.find(u => u.id === id);
                          return user?.display_name;
                        }).join(', ')}
                        {' '}... and {selectedUsers.size - 5} more
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                        💡 Tip: {selectedUsers.size} users is a large deletion. Consider reviewing your selection.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </ScrollArea>
          
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Cancel - Keep Users Safe</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                setBulkDeleteDialogOpen(false);
                setConfirmDeleteDialogOpen(true);
              }}
              className="gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              I Understand - Continue to Final Confirmation
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation - Second Warning (Final) */}
      <AlertDialog open={confirmDeleteDialogOpen} onOpenChange={setConfirmDeleteDialogOpen}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] flex flex-col border-4 border-destructive">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-full bg-destructive animate-pulse">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <AlertDialogTitle className="text-2xl text-destructive">
                🛑 FINAL CONFIRMATION REQUIRED
              </AlertDialogTitle>
            </div>
          </AlertDialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-base">
                <div className="p-6 bg-destructive/20 border-4 border-destructive rounded-lg space-y-3">
                  <p className="text-xl font-bold text-destructive text-center">
                    LAST CHANCE TO STOP!
                  </p>
                  <p className="font-semibold text-foreground text-center">
                    You are about to DELETE {selectedUsers.size} user account{selectedUsers.size !== 1 ? 's' : ''} and ALL associated data.
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-destructive">Once you click "DELETE ALL USERS" below:</p>
                  <ul className="list-disc list-inside space-y-1 text-destructive ml-4">
                    <li>All {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} will be immediately and permanently deleted</li>
                    <li>All their content, relationships, and data will be irreversibly destroyed</li>
                    <li>Users will lose access immediately and cannot be restored</li>
                    <li>This cannot be reversed by anyone, including system administrators</li>
                  </ul>
                </div>

                <div className="p-4 bg-yellow-500/20 border-2 border-yellow-500 rounded-lg">
                  <p className="font-bold text-center text-lg">
                    Are you ABSOLUTELY CERTAIN you want to proceed?
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </ScrollArea>
          
          <AlertDialogFooter className="flex-col sm:flex-col gap-2 mt-4">
            <AlertDialogCancel className="w-full bg-primary hover:bg-primary/90">
              🛡️ NO - Cancel and Keep All Users Safe
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deletingUsers}
              className="w-full gap-2 text-lg py-6"
            >
              {deletingUsers ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-white animate-pulse" />
                  Deleting {deleteProgress.current > 0 ? `${deleteProgress.current}/${deleteProgress.total}` : selectedUsers.size} Users...
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5" />
                  YES - DELETE ALL {selectedUsers.size} USER{selectedUsers.size !== 1 ? 'S' : ''} PERMANENTLY
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
    </div>
  );
};