'use client';

import React from 'react';
import GymMap from '@/components/GymMap';

export default function MapPage() {
  return (
    <div className="container mx-auto p-4 md:p-8 h-[calc(100vh-4rem)]">
      <GymMap />
    </div>
  );
}
