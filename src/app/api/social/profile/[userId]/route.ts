import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SocialProfile, SocialPost, PersonalRecord } from '@/models';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    await connectToDatabase();

    // Independent lookups run in parallel — each one is a full round trip to Atlas.
    const [profile, posts, records] = await Promise.all([
      SocialProfile.findOne({ userId }).exec(),
      SocialPost.find({ authorId: userId }).sort({ createdAt: -1 }).exec(),
      // Personal records (top 5 by achievement date)
      PersonalRecord.find({ athleteId: userId })
        .sort({ achievedAt: -1 })
        .limit(5)
        .exec(),
    ]);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Post count and total likes
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes?.length || post.likesCount || 0), 0);

    // Recent posts (last 6) — already sorted newest first
    const recentPosts = posts.slice(0, 6);

    return NextResponse.json({
      profile: profile.toJSON(),
      stats: {
        postsCount: posts.length,
        totalLikes
      },
      records: records.map(record => record.toJSON()),
      recentPosts: recentPosts.map(post => post.toJSON())
    });
  } catch (error) {
    console.error('GET /api/social/profile/[userId] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}