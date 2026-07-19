'use client';

import React, { type ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { SWRConfig } from 'swr';

interface MongoDBProviderProps {
  children: ReactNode;
}

export function MongoDBProvider({ children }: MongoDBProviderProps) {
  return (
    <SessionProvider>
      <SWRConfig
        value={{
          // Cache jest źródłem prawdy między nawigacjami; rewalidacja w tle
          // (ETag na API sprawia, że niezmienione dane wracają jako 304).
          revalidateOnFocus: false,
          dedupingInterval: 15000,
          errorRetryCount: 2,
        }}
      >
        {children}
      </SWRConfig>
    </SessionProvider>
  );
}
