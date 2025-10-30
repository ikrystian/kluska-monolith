'use client';

import React, { type ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';

interface MongoDBProviderProps {
  children: ReactNode;
}

export function MongoDBProvider({ children }: MongoDBProviderProps) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}

