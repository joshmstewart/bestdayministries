import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { UserPlus, Trash2, Crown, Shield, User, Mail, Clock, CheckCircle, XCircle, Check } from "lucide-react";
import { format } from "date-fns";
import { VendorThemePreset } from "@/lib/vendorThemePresets";

interface VendorTeamManagerProps {
  vendorId: string;
  theme?: VendorThemePreset;
}

type TeamRole = "owner" | "admin" | "staff";

interface TeamMember {
  id: string;
  vendor_id: string;
  user_id: string;
  role: TeamRole;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
  profile?: {
    display_name: string;
    email: string;
    avatar_number: number | null;
  };
}

export const VendorTeamManager = ({ vendorId, theme }: VendorTeamManagerProps) => {
  const queryClient = useQueryClient();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("staff");

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch team members
  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ["vendor-team-members", vendorId],
    queryFn: async () => {
      // First get team members
      const { data: members, error } = await supabase
        .from("vendor_team_members")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("role", { ascending: true });

      if (error) throw error;
      
      // Then fetch profiles for each member
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, email, avatar_number")
        .in("id", userIds);
      
      // Combine the data
      return members.map(member => ({
        ...member,
        profile: profiles?.find(p => p.id === member.user_id),
      })) as TeamMember[];
    },
  });

  // Fetch all users for search
  const { data: allUsers } = useQuery({
    queryKey: ["all-users-for-team"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .order("display_name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: inviteDialogOpen,
  });

  // Filter out existing team members and current user
  const availableUsers = useMemo(() => {
    if (!allUsers) return [];
    const existingUserIds = new Set(teamMembers?.map(m => m.user_id) || []);
    return allUsers.filter(u => !existingUserIds.has(u.id) && u.id !== currentUser?.id);
  }, [allUsers, teamMembers, currentUser?.id]);

  const selectedUser = availableUsers.find(u => u.id === selectedUserId);

  // Check if current user is owner
  const isOwner = teamMembers?.some(
    m => m.user_id === currentUser?.id && m.role === "owner"
  );

  // Invite team member mutation
  const inviteMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: TeamRole }) => {
      // Add team member directly with selected user ID
      const { error } = await supabase
        .from("vendor_team_members")
        .insert({
          vendor_id: vendorId,
          user_id: userId,
          role,
          invited_by: currentUser?.id,
          accepted_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Team member added successfully");
      queryClient.invalidateQueries({ queryKey: ["vendor-team-members", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["all-users-for-team"] });
      setInviteDialogOpen(false);
      setSelectedUserId(null);
      setSearchQuery("");
      setInviteRole("staff");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add team member");
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: TeamRole }) => {
      const { error } = await supabase
        .from("vendor_team_members")
        .update({ role })
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["vendor-team-members", vendorId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update role");
    },
  });

  // Remove team member mutation
  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("vendor_team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Team member removed");
      queryClient.invalidateQueries({ queryKey: ["vendor-team-members", vendorId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove team member");
    },
  });

  const getRoleIcon = (role: TeamRole) => {
    switch (role) {
      case "owner": return <Crown className="h-4 w-4 text-yellow-500" />;
      case "admin": return <Shield className="h-4 w-4 text-blue-500" />;
      case "staff": return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeVariant = (role: TeamRole) => {
    switch (role) {
      case "owner": return "default";
      case "admin": return "secondary";
      case "staff": return "outline";
    }
  };

  const getRoleDescription = (role: TeamRole) => {
    switch (role) {
      case "owner": return "Full access, can manage team";
      case "admin": return "Can manage products and orders";
      case "staff": return "Can view orders and update tracking";
    }
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading team...</div>;
  }

  return (
    <Card
      className="border-2"
      style={theme ? { 
        backgroundColor: theme.cardBg,
        borderColor: theme.cardBorder,
        boxShadow: theme.cardGlow
      } : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Team Members</CardTitle>
          <CardDescription>
            Manage who has access to your vendor account
          </CardDescription>
        </div>
        {isOwner && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Add someone to help manage your vendor account
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Select User</Label>
                  <Command className="border rounded-md">
                    <CommandInput 
                      placeholder="Type at least 3 characters to search..." 
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      {searchQuery.length < 3 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Type at least 3 characters to search
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>No users found.</CommandEmpty>
                          <CommandGroup>
                            {availableUsers
                              .filter(u => 
                                u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                              )
                              .slice(0, 10)
                              .map((user) => (
                                <CommandItem
                                  key={user.id}
                                  value={user.display_name || user.email || user.id}
                                  onSelect={() => setSelectedUserId(user.id)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                      <User className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                      <div className="font-medium">{user.display_name || "Unknown"}</div>
                                      <div className="text-xs text-muted-foreground">{user.email}</div>
                                    </div>
                                  </div>
                                  {selectedUserId === user.id && (
                                    <Check className="h-4 w-4 text-primary" />
                                  )}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                  {selectedUser && (
                    <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md border border-primary/20">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{selectedUser.display_name}</span>
                      <span className="text-xs text-muted-foreground">({selectedUser.email})</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <Label>Role</Label>
                  
                  {/* Owner Role Card */}
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      inviteRole === "owner" 
                        ? "border-yellow-500 bg-yellow-500/5" 
                        : "border-border hover:border-yellow-500/50"
                    }`}
                    onClick={() => setInviteRole("owner")}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Crown className="h-4 w-4 text-yellow-500" />
                      </div>
                      <div className="font-medium">Owner</div>
                      {inviteRole === "owner" && (
                        <Badge variant="secondary" className="ml-auto">Selected</Badge>
                      )}
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-11">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Full access to all features
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Manage team members
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Access Stripe payouts
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Delete vendor account
                      </li>
                    </ul>
                  </div>
                  
                  {/* Admin Role Card */}
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      inviteRole === "admin" 
                        ? "border-blue-500 bg-blue-500/5" 
                        : "border-border hover:border-blue-500/50"
                    }`}
                    onClick={() => setInviteRole("admin")}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="font-medium">Admin</div>
                      {inviteRole === "admin" && (
                        <Badge variant="secondary" className="ml-auto">Selected</Badge>
                      )}
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-11">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Add, edit, and delete products
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        View and manage all orders
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Update order status and tracking
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        View earnings and reports
                      </li>
                      <li className="flex items-center gap-2">
                        <XCircle className="h-3 w-3 text-red-500" />
                        Cannot manage team members
                      </li>
                      <li className="flex items-center gap-2">
                        <XCircle className="h-3 w-3 text-red-500" />
                        Cannot access Stripe payouts
                      </li>
                    </ul>
                  </div>
                  
                  {/* Staff Role Card */}
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      inviteRole === "staff" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setInviteRole("staff")}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="font-medium">Staff</div>
                      {inviteRole === "staff" && (
                        <Badge variant="secondary" className="ml-auto">Selected</Badge>
                      )}
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-11">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        View orders assigned to them
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Update tracking information
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Mark orders as shipped/delivered
                      </li>
                      <li className="flex items-center gap-2">
                        <XCircle className="h-3 w-3 text-red-500" />
                        Cannot add or edit products
                      </li>
                      <li className="flex items-center gap-2">
                        <XCircle className="h-3 w-3 text-red-500" />
                        Cannot view earnings or reports
                      </li>
                      <li className="flex items-center gap-2">
                        <XCircle className="h-3 w-3 text-red-500" />
                        Cannot manage team members
                      </li>
                    </ul>
                  </div>
                </div>
                
                <Button
                  className="w-full"
                  onClick={() => selectedUserId && inviteMutation.mutate({ userId: selectedUserId, role: inviteRole })}
                  disabled={!selectedUserId || inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? "Adding..." : "Add Team Member"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {teamMembers?.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {getRoleIcon(member.role)}
                </div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {member.profile?.display_name || "Unknown User"}
                    <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                      {member.role}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {member.profile?.email || "No email"}
                  </div>
                  {member.accepted_at && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      Joined {format(new Date(member.accepted_at), "MMM d, yyyy")}
                    </div>
                  )}
                </div>
              </div>
              
              {isOwner && member.user_id !== currentUser?.id && (
                <div className="flex items-center gap-2">
                  <Select
                    value={member.role}
                    onValueChange={(value) => 
                      updateRoleMutation.mutate({ memberId: member.id, role: value as TeamRole })
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Owner</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("Remove this team member?")) {
                        removeMutation.mutate(member.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {member.user_id === currentUser?.id && member.role !== "owner" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    if (confirm("Leave this vendor team?")) {
                      removeMutation.mutate(member.id);
                    }
                  }}
                >
                  Leave Team
                </Button>
              )}
            </div>
          ))}
          
          {(!teamMembers || teamMembers.length === 0) && (
            <div className="text-center py-6 text-muted-foreground">
              No team members yet
            </div>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-medium mb-2">Role Permissions</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Crown className="h-3 w-3 text-yellow-500" />
              <span><strong>Owner:</strong> {getRoleDescription("owner")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-3 w-3 text-blue-500" />
              <span><strong>Admin:</strong> {getRoleDescription("admin")}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-3 w-3" />
              <span><strong>Staff:</strong> {getRoleDescription("staff")}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
