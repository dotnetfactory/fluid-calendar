import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Validate API key
  const apiKey = request.headers.get('X-Stats-API-Key');
  if (apiKey !== process.env.STATS_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all stats in parallel
    const [totalUsers, lastUser, totalTasks, completedTasks, totalCalendars, totalProjects] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
        prisma.task.count(),
        prisma.task.count({ where: { status: 'completed' } }),
        prisma.calendarFeed.count(),
        prisma.project.count(),
      ]);

    return NextResponse.json({
      app: 'fluid-calendar',
      timestamp: new Date().toISOString(),
      stats: {
        users: {
          total: totalUsers,
          lastSignup: lastUser?.createdAt?.toISOString() ?? null,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
        },
        calendars: {
          total: totalCalendars,
        },
        projects: {
          total: totalProjects,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
