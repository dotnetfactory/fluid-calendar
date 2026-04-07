"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// User management table component

interface UserListItem {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  providers: string[];
  accountCount: number;
  signupDate: string;
}

interface UsersStats {
  totalUsers: number;
  adminUsers: number;
  regularUsers: number;
  providersStats: Record<string, number>;
}

interface UserTableProps {
  className?: string;
}

type SortField = "name" | "email" | "role" | "signupDate";
type SortOrder = "asc" | "desc";

export function UserTable({ className }: UserTableProps) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [stats, setStats] = useState<UsersStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("signupDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        sortBy: sortField,
        sortOrder,
        ...(search && { search }),
        ...(roleFilter && roleFilter !== "all" && { role: roleFilter }),
      });

      const response = await fetch(`/api/users?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const data = await response.json();
      setUsers(data.users);
      setStats(data.stats);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [sortField, sortOrder, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getProviderBadgeVariant = (provider: string) => {
    switch (provider) {
      case "google":
        return "default";
      case "azure-ad":
        return "secondary";
      case "credentials":
        return "outline";
      default:
        return "outline";
    }
  };

  const getProviderDisplayName = (provider: string) => {
    switch (provider) {
      case "google":
        return "Google";
      case "azure-ad":
        return "Microsoft";
      case "credentials":
        return "Email";
      default:
        return provider;
    }
  };

  const formatSignupDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field && (
        <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
      )}
    </Button>
  );

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Loading user accounts...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Error loading user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchUsers} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>User Accounts</CardTitle>
        <CardDescription>
          Manage user accounts and view registration details
        </CardDescription>

        {stats && (
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="text-sm">
              <span className="font-medium">Total:</span> {stats.totalUsers}
            </div>
            <div className="text-sm">
              <span className="font-medium">Admins:</span> {stats.adminUsers}
            </div>
            <div className="text-sm">
              <span className="font-medium">Users:</span> {stats.regularUsers}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="sm:max-w-xs">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admins only</SelectItem>
              <SelectItem value="user">Users only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortButton field="name">Name</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="email">Email</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="role">Role</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="signupDate">Signup Date</SortButton>
                </TableHead>
                <TableHead>Auth Providers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-muted-foreground">
                      {search || (roleFilter && roleFilter !== "all")
                        ? "No users match your filters"
                        : "No users found"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name || (
                        <span className="text-muted-foreground italic">
                          No name
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.email || (
                        <span className="text-muted-foreground italic">
                          No email
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === "admin" ? "default" : "secondary"
                        }
                      >
                        {user.role === "admin" ? "Admin" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatSignupDate(user.signupDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.providers.length > 0 ? (
                          user.providers.map((provider) => (
                            <Badge
                              key={provider}
                              variant={getProviderBadgeVariant(provider)}
                              className="text-xs"
                            >
                              {getProviderDisplayName(provider)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm italic">
                            No providers
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {users.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {users.length} user{users.length !== 1 ? "s" : ""}
            {(search || (roleFilter && roleFilter !== "all")) && " (filtered)"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
