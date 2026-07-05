import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { env } from '@/lib/env';

export interface VerifiedCredentialsUser {
  id: string;
  email: string;
  name: string;
  role: 'athlete' | 'trainer' | 'admin';
}

/**
 * Shared email/password check used by both the NextAuth credentials provider
 * (cookie-based sessions, web app) and the /api/auth/token endpoint (Bearer
 * tokens for the athlete SPA/Capacitor). Keeping one implementation avoids
 * the two auth paths drifting apart.
 */
export async function verifyCredentials(email: string, password: string): Promise<VerifiedCredentialsUser> {
  await connectToDatabase();

  const user = await User.findOne({ email });

  if (!user) {
    throw new Error('No user found with this email');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error('Invalid password');
  }

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember Me', type: 'checkbox' },
        impersonateUserId: { label: 'Impersonate User ID', type: 'text' },
      },
      async authorize(credentials) {
        await connectToDatabase();

        // Handle impersonation
        if (credentials?.impersonateUserId) {
          const targetUser = await User.findById(credentials.impersonateUserId);
          if (!targetUser) {
            throw new Error('User not found');
          }

          return {
            id: targetUser._id.toString(),
            email: targetUser.email,
            name: targetUser.name,
            role: targetUser.role,
            rememberMe: false,
          };
        }

        // Regular login
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await verifyCredentials(credentials.email, credentials.password);

        return {
          ...user,
          rememberMe: credentials.rememberMe === 'true',
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.rememberMe = (user as any).rememberMe || false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 godziny (domyślnie)
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 dni dla "Zapamiętaj mnie"
  },
  secret: env.NEXTAUTH_SECRET,
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // Logowanie dla debugowania
      // console.log('User signed in:', user.email);
    },
  },
};

