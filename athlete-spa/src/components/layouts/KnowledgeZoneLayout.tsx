import { Outlet } from 'react-router-dom';

/** Each knowledge-zone screen owns its header and spacing (the article view runs edge to edge). */
export default function KnowledgeZoneLayout() {
  return <Outlet />;
}
