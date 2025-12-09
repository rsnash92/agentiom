import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { inviteCodes } from '@/lib/db/schema';
import { eq, and, gt, or, isNull } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Invalid code format' },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    // Find the invite code
    const [inviteCode] = await db
      .select()
      .from(inviteCodes)
      .where(
        and(
          eq(inviteCodes.code, normalizedCode),
          eq(inviteCodes.isActive, true),
          or(
            isNull(inviteCodes.expiresAt),
            gt(inviteCodes.expiresAt, new Date())
          )
        )
      )
      .limit(1);

    if (!inviteCode) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired invite code' },
        { status: 200 }
      );
    }

    // Check if max uses reached
    if (inviteCode.useCount >= inviteCode.maxUses) {
      return NextResponse.json(
        { valid: false, error: 'This invite code has reached its maximum uses' },
        { status: 200 }
      );
    }

    return NextResponse.json({
      valid: true,
      code: normalizedCode,
      remainingUses: inviteCode.maxUses - inviteCode.useCount,
    });
  } catch (error) {
    console.error('Failed to validate invite code:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate invite code' },
      { status: 500 }
    );
  }
}
