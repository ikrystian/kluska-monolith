import { KnowledgeZoneView } from '@/components/shared/KnowledgeZoneView';

export default function AthleteKnowledgeZonePage() {
  return (
    <KnowledgeZoneView
      basePath="/athlete/knowledge-zone"
      managePath="/athlete/knowledge-zone/manage"
    />
  );
}
