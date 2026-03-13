import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "UsersAPI";

interface UserListItem {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  providers: string[];
  accountCount: number;
  signupDate: string;
}

interface UsersListResponse {
  users: UserListItem[];
  total: number;
  stats: {
    totalUsers: number;
    adminUsers: number;
    regularUsers: number;
    providersStats: Record<string, number>;
  };
}

export async function GET(request: NextRequest) {
  // Check if user is admin
  const authResponse = await requireAdmin(request);
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const search = searchParams.get("search") || "";
    const roleFilter = searchParams.get("role") || "";

    logger.info(
      "Fetching users list",
      {
        sortBy,
        sortOrder,
        search: search ? "***" : null, // Don't log actual search terms
        roleFilter,
      },
      LOG_SOURCE
    );

    // Build where clause for filtering
    const whereClause: {
      OR?: Array<{ name?: { contains: string; mode: "insensitive" } } | { email?: { contains: string; mode: "insensitive" } }>;
      role?: string;
    } = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    
    if (roleFilter) {
      whereClause.role = roleFilter;
    }

    // Fetch users with their accounts
    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        accounts: {
          select: {
            provider: true,
            type: true,
          },
        },
      },
    });

    logger.info(
      "Retrieved users from database",
      { userCount: users.length },
      LOG_SOURCE
    );

    // Transform users data
    const transformedUsers: UserListItem[] = users.map((user) => {
      const providers = Array.from(
        new Set(user.accounts.map((account) => account.provider))
      );
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        providers,
        accountCount: user.accounts.length,
        signupDate: user.createdAt.toISOString(),
      };
    });

    // Sort users
    const sortedUsers = transformedUsers.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
        default:
          comparison = (a.name || "").localeCompare(b.name || "");
          break;
        case "email":
          comparison = (a.email || "").localeCompare(b.email || "");
          break;
        case "role":
          // Admin first, then users
          if (a.role === "admin" && b.role !== "admin") comparison = -1;
          else if (b.role === "admin" && a.role !== "admin") comparison = 1;
          else comparison = a.role.localeCompare(b.role);
          break;
        case "signupDate":
          comparison = new Date(a.signupDate).getTime() - new Date(b.signupDate).getTime();
          break;
      }
      
      return sortOrder === "desc" ? -comparison : comparison;
    });

    // Calculate statistics
    const stats = {
      totalUsers: users.length,
      adminUsers: users.filter((u) => u.role === "admin").length,
      regularUsers: users.filter((u) => u.role === "user").length,
      providersStats: transformedUsers.reduce((acc, user) => {
        user.providers.forEach((provider) => {
          acc[provider] = (acc[provider] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>),
    };

    const response: UsersListResponse = {
      users: sortedUsers,
      total: sortedUsers.length,
      stats,
    };

    logger.info(
      "Users list retrieved successfully",
      {
        totalUsers: stats.totalUsers,
        adminUsers: stats.adminUsers,
        regularUsers: stats.regularUsers,
      },
      LOG_SOURCE
    );

    return NextResponse.json(response);
  } catch (error) {
    logger.error(
      "Failed to fetch users list",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack || null : null,
      },
      LOG_SOURCE
    );
    
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}