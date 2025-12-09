import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inviteCodes } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

// Simple admin secret check - in production use proper auth
function isAdmin(request: NextRequest): boolean {
  const adminSecret = request.headers.get('x-admin-secret');
  return adminSecret === process.env.ADMIN_SECRET;
}

// Generate a random invite code
function generateCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0/O, 1/I
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /api/admin/invite-codes - List all invite codes
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const codes = await db
      .select()
      .from(inviteCodes)
      .orderBy(desc(inviteCodes.createdAt));

    return NextResponse.json({ codes });
  } catch (error) {
    console.error('Failed to fetch invite codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invite codes' },
      { status: 500 }
    );
  }
}

// POST /api/admin/invite-codes - Create new invite code(s)
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      code: customCode,
      maxUses = 1,
      expiresInDays,
      count = 1, // Number of codes to generate
    } = body;

    const codes = [];

    for (let i = 0; i < Math.min(count, 100); i++) {
      const code = customCode && count === 1
        ? customCode.toUpperCase()
        : generateCode();

      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const [newCode] = await db
        .insert(inviteCodes)
        .values({
          code,
          maxUses,
          expiresAt,
          isActive: true,
        })
        .returning();

      codes.push(newCode);
    }

    return NextResponse.json({ codes }, { status: 201 });
  } catch (error) {
    console.error('Failed to create invite code:', error);
    return NextResponse.json(
      { error: 'Failed to create invite code' },
      { status: 500 }
    );
  }
}
