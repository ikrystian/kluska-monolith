import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { z } from 'zod';

// Validation schema for onboarding data
const onboardingSchema = z.object({
  name: z.string().min(2, 'Imię musi mieć co najmniej 2 znaki'),
  gender: z.enum(['male', 'female', 'other']),
  dateOfBirth: z.string().refine((date) => {
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return age >= 13 && age <= 100;
  }, 'Wiek musi być między 13 a 100 lat'),
  height: z.number().min(100, 'Wzrost musi być co najmniej 100 cm').max(250, 'Wzrost nie może przekraczać 250 cm'),
  weight: z.number().min(30, 'Waga musi być co najmniej 30 kg').max(300, 'Waga nie może przekraczać 300 kg'),
  trainingLevel: z.enum(['beginner', 'intermediate', 'advanced']),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = onboardingSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, gender, dateOfBirth, height, weight, trainingLevel } = validationResult.data;

    await connectToDatabase();

    // Update user with onboarding data
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      {
        name,
        gender,
        dateOfBirth: new Date(dateOfBirth),
        height,
        weight,
        trainingLevel,
        onboardingCompleted: true,
      },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        gender: updatedUser.gender,
        dateOfBirth: updatedUser.dateOfBirth?.toISOString(),
        height: updatedUser.height,
        weight: updatedUser.weight,
        trainingLevel: updatedUser.trainingLevel,
        onboardingCompleted: updatedUser.onboardingCompleted,
      },
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}