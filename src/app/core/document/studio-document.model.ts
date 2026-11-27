export interface StudioNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style?: { fill: string; stroke: string; fontSize: number };
}
export interface StudioEdge {
  id: string;
  source: string;
  target: string;
}
export interface StudioDocument<T = Record<string, unknown>> {
  schemaVersion: 1;
  id: string;
  type: string;
  title: string;
  nodes: StudioNode[];
  edges: StudioEdge[];
  metadata: T;
}
