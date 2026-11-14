'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { ResourceView } from '@/components/admin/resource/ResourceView';

export default function AdminResourcePage() {
  const { resource } = useParams<{ resource: string }>();
  return (
    // useSearchParams (filters and the open record live in the URL) needs a Suspense boundary.
    <Suspense fallback={null}>
      <ResourceView key={resource} resourceKey={resource} />
    </Suspense>
  );
}
