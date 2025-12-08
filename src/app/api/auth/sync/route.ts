import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export async function POST(request: NextRequest) {
  try {
    // Get the authorization token from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify the token with Privy
    const verifiedClaims = await privy.verifyAuthToken(token);
    const privyUserId = verifiedClaims.userId;

    // Get full user data from Privy
    const privyUser = await privy.getUser(privyUserId);

    const walletAddress = privyUser.wallet?.address;
    const email = privyUser.email?.address;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'User must have a wallet connected' },
        { status: 400 }
      );
    }

    // Check if user exists by wallet address
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress))
      .limit(1);

    if (existingUser.length > 0) {
      // Update existing user
      const [updatedUser] = await db
        .update(users)
        .set({
          email: email || existingUser[0].email,
          updatedAt: new Date(),
        })
        .where(eq(users.walletAddress, walletAddress))
        .returning();

      return NextResponse.json({
        user: updatedUser,
        isNewUser: false,
      });
    }

    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        walletAddress,
        email,
        credits: 100, // Starting credits
        subscriptionTier: 'free',
      })
      .returning();

    return NextResponse.json({
      user: newUser,
      isNewUser: true,
    });
  } catch (error) {
    console.error('Auth sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const verifiedClaims = await privy.verifyAuthToken(token);
    const privyUser = await privy.getUser(verifiedClaims.userId);

    const walletAddress = privyUser.wallet?.address;
    if (!walletAddress) {
      return NextResponse.json({ user: null });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress))
      .limit(1);

    return NextResponse.json({ user: user || null });
  } catch (error) {
    console.error('Auth fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
