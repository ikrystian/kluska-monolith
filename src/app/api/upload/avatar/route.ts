import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'avatars');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get file extension
    const ext = file.type.split('/')[1];
    const filename = `${session.user.id}.${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Delete old avatar files for this user (any extension)
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];
    for (const oldExt of extensions) {
      const oldPath = join(UPLOAD_DIR, `${session.user.id}.${oldExt}`);
      if (existsSync(oldPath)) {
        await unlink(oldPath).catch(() => {}); // Ignore errors if file doesn't exist
      }
    }

    // Save the new file
    await writeFile(filepath, buffer);

    // Update user's photoURL in database
    await connectToDatabase();
    const photoURL = `/uploads/avatars/${filename}`;

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { photoURL },
      { new: true }
    ).exec();

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Avatar uploaded successfully',
      photoURL,
    });
  } catch (error) {
    console.error('POST /api/upload/avatar error:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all avatar files for this user
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];
    for (const ext of extensions) {
      const filepath = join(UPLOAD_DIR, `${session.user.id}.${ext}`);
      if (existsSync(filepath)) {
        await unlink(filepath).catch(() => {});
      }
    }

    // Update user's photoURL in database
    await connectToDatabase();

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { $unset: { photoURL: '' } },
      { new: true }
    ).exec();

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Avatar deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/upload/avatar error:', error);
    return NextResponse.json(
      { error: 'Failed to delete avatar', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
