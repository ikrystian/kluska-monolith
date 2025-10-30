import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Rozszerzenie interfejsu User o dodatkowe pola
   */
  interface User {
    id: string;
    email: string;
    name: string;
    role: 'athlete' | 'trainer' | 'admin';
    rememberMe?: boolean;
  }

  /**
   * Rozszerzenie interfejsu Session o dodatkowe pola użytkownika
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'athlete' | 'trainer' | 'admin';
    };
  }
}

declare module 'next-auth/jwt' {
  /**
   * Rozszerzenie interfejsu JWT o dodatkowe pola
   */
  interface JWT {
    id: string;
    role: 'athlete' | 'trainer' | 'admin';
    rememberMe?: boolean;
  }
}

