import { KnowledgeZoneView } from '@/components/shared/KnowledgeZoneView';

export default function TrainerKnowledgeZonePage() {
  return (
    <KnowledgeZoneView
      basePath="/trainer/knowledge-zone"
      managePath="/trainer/knowledge-zone/manage"
    />
  );
}
