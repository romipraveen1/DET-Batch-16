import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  NodeChange,
  EdgeChange,
  Position,
} from 'reactflow';
import '../styles/reactflow.css';
import { WorkflowStatus, StatusTransition } from '../types';

interface WorkflowFlowProps {
  statuses: WorkflowStatus[];
  transitions: StatusTransition[];
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
}

const CustomNode: React.FC<{ data: WorkflowStatus }> = ({ data }) => {
  return (
    <div
      className="px-4 py-2 rounded-lg shadow-md border-2"
      style={{
        backgroundColor: `${data.color}20`,
        borderColor: data.color,
      }}
    >
      <div className="font-medium text-gray-900">{data.name}</div>
      {data.description && (
        <div className="text-sm text-gray-600">{data.description}</div>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export const WorkflowFlow: React.FC<WorkflowFlowProps> = ({
  statuses,
  transitions,
  onNodeClick,
  onEdgeClick,
  onNodesChange,
  onEdgesChange,
}) => {
  // Convert statuses to nodes
  const initialNodes: Node[] = useMemo(() => {
    return statuses.map((status, index) => ({
      id: status.id,
      type: 'custom',
      position: {
        x: (index % 3) * 250,
        y: Math.floor(index / 3) * 150,
      },
      data: status,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }));
  }, [statuses]);

  // Convert transitions to edges
  const initialEdges: Edge[] = useMemo(() => {
    return transitions.map((transition) => ({
      id: transition.id,
      source: transition.fromStatus,
      target: transition.toStatus,
      animated: true,
      style: { stroke: '#64748b' },
      type: 'smoothstep',
    }));
  }, [transitions]);

  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeInternal(changes);
      if (onNodesChange) {
        onNodesChange(nodes);
      }
    },
    [onNodesChange, nodes, onNodesChangeInternal]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeInternal(changes);
      if (onEdgesChange) {
        onEdgesChange(edges);
      }
    },
    [onEdgesChange, edges, onEdgesChangeInternal]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds: Edge[]) => addEdge(params, eds));
    },
    [setEdges]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      onEdgeClick?.(edge.id);
    },
    [onEdgeClick]
  );

  return (
    <div className="h-[600px] w-full border rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}; 