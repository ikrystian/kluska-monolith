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

    // Get social profile
    const profile = await SocialProfile.findOne({ userId }).exec();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get post count and total likes
    const posts = await SocialPost.find({ authorId: userId }).exec();
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes?.length || post.likesCount || 0), 0);

    // Get recent posts (last 6)
    const recentPosts = await SocialPost.find({ authorId: userId })
      .sort({ createdAt: -1 })
      .limit(6)
      .exec();

    // Get personal records (top 5 by achievement date)
    const records = await PersonalRecord.find({ athleteId: userId })
      .sort({ achievedAt: -1 })
      .limit(5)
      .exec();

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