import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel,
  MarkerType,
  EdgeTypes,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

import {
  Plus,
  ArrowLeft,
  RotateCcw,
  Maximize2,
  Minimize2,
  LayoutGrid,
  LayoutList,
  Save,
  Trash2,

  ChevronLeft,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { saveWorkflow, WorkflowTransition, getAllWorkflows } from '../api/workflow';
import { getAllDefectStatuses } from '../api/defectStatus';

// Custom edge component
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: any) => {
  const offset = 30;
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  const edgePath = `M ${sourceX} ${sourceY} 
                    C ${sourceX + offset} ${sourceY},
                      ${midX} ${midY},
                      ${targetX} ${targetY}`;

  return (
    <path
      id={id}
      style={{
        ...style,
        strokeWidth: 2,
        stroke: '#94a3b8',
      }}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd={markerEnd}
    />
  );
};

// Define edge types
const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

// Define node types
const nodeTypes = {
  default: ({ data }: { data: any }) => (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-gray-200 relative">
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500 border-2 border-white"
      />
      <div className="flex items-center">
        <div className="rounded-full w-3 h-3 mr-2" style={{ backgroundColor: data.color }} />
        <div className="font-medium">{data.label}</div>
      </div>
    </div>
  ),
};

// Start with empty workflow - users will drag and drop statuses to create their workflow
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const StatusWorkflow: React.FC = () => {
  const { statusTypes } = useApp();
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);

  const [isVertical, setIsVertical] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [existingWorkflows, setExistingWorkflows] = useState<any[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);

  // Load saved workflow on component mount
  useEffect(() => {
    const loadSavedWorkflow = () => {
      try {
        const savedNodes = localStorage.getItem('statusWorkflowNodes');
        const savedEdges = localStorage.getItem('statusWorkflowEdges');
        const savedLayout = localStorage.getItem('statusWorkflowLayout');
        
        if (savedNodes) {
          const parsedNodes = JSON.parse(savedNodes);
          setNodes(parsedNodes);
        } else {
          setNodes(initialNodes);
        }
        
        if (savedEdges) {
          const parsedEdges = JSON.parse(savedEdges);
          setEdges(parsedEdges);
        } else {
          setEdges(initialEdges);
        }

        if (savedLayout) {
          setIsVertical(JSON.parse(savedLayout));
        }
      } catch (error) {
        console.error('Error loading saved workflow:', error);
        // Fallback to initial state if there's an error
        setNodes(initialNodes);
        setEdges(initialEdges);
      }
      setIsInitialized(true);
    };

    loadSavedWorkflow();
  }, []);

  // Save workflow whenever nodes or edges change
  useEffect(() => {
    if (!isInitialized) return;

    try {
      localStorage.setItem('statusWorkflowNodes', JSON.stringify(nodes));
      localStorage.setItem('statusWorkflowEdges', JSON.stringify(edges));
      localStorage.setItem('statusWorkflowLayout', JSON.stringify(isVertical));
    } catch (error) {
      console.error('Error saving workflow:', error);
    }
  }, [nodes, edges, isVertical, isInitialized]);

  // Handle window unload to ensure state is saved
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.setItem('statusWorkflowNodes', JSON.stringify(nodes));
      localStorage.setItem('statusWorkflowEdges', JSON.stringify(edges));
      localStorage.setItem('statusWorkflowLayout', JSON.stringify(isVertical));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [nodes, edges, isVertical]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: 'default',
        position,
        data: { 
          label: type,
          color: statusTypes && statusTypes.find(s => s.name === type)?.color || '#94a3b8'
        },
      };

      setNodes((nds: Node[]) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, statusTypes]
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setEditingNode(node);
      setShowModal(true);
    },
    []
  );



  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds: Node[]) => nds.filter((node: Node) => node.id !== nodeId));
      setEdges((eds: Edge[]) => eds.filter((edge: Edge) => 
        edge.source !== nodeId && edge.target !== nodeId
      ));
    },
    [setNodes, setEdges]
  );

  const handleLayout = useCallback(() => {
    if (!reactFlowInstance) return;

    const currentNodes = reactFlowInstance.getNodes();
    const currentEdges = reactFlowInstance.getEdges();

    // Create a hierarchical layout based on the current workflow
    const incomingConnections = new Map<string, string[]>();
    const outgoingConnections = new Map<string, string[]>();

    // Analyze current connections
    currentEdges.forEach(edge => {
      if (!outgoingConnections.has(edge.source)) {
        outgoingConnections.set(edge.source, []);
      }
      outgoingConnections.get(edge.source)!.push(edge.target);

      if (!incomingConnections.has(edge.target)) {
        incomingConnections.set(edge.target, []);
      }
      incomingConnections.get(edge.target)!.push(edge.source);
    });

    // Find initial nodes (no incoming connections)
    const initialNodes = currentNodes.filter(node =>
      !incomingConnections.has(node.id) || incomingConnections.get(node.id)!.length === 0
    );

    // Calculate levels
    const levels = new Map<string, number>();
    const positioned = new Set<string>();

    // Level 0: Initial nodes
    initialNodes.forEach(node => {
      levels.set(node.id, 0);
      positioned.add(node.id);
    });

    // Calculate levels for other nodes
    let currentLevel = 0;
    let hasChanges = true;

    while (hasChanges && currentLevel < 10) {
      hasChanges = false;

      currentNodes.forEach(node => {
        if (positioned.has(node.id)) return;

        const incoming = incomingConnections.get(node.id) || [];
        const incomingLevels = incoming
          .filter(id => positioned.has(id))
          .map(id => levels.get(id)!);

        if (incomingLevels.length > 0) {
          const maxIncomingLevel = Math.max(...incomingLevels);
          levels.set(node.id, maxIncomingLevel + 1);
          positioned.add(node.id);
          hasChanges = true;
        }
      });

      currentLevel++;
    }

    // Handle any remaining unpositioned nodes
    currentNodes.forEach(node => {
      if (!positioned.has(node.id)) {
        levels.set(node.id, currentLevel);
      }
    });

    // Group nodes by level
    const levelGroups = new Map<number, Node[]>();
    currentNodes.forEach(node => {
      const level = levels.get(node.id) || 0;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(node);
    });

    // Position nodes
    const levelSpacing = isVertical ? 200 : 300;
    const nodeSpacing = isVertical ? 150 : 120;
    const startX = 200;
    const startY = 100;

    const newNodes = currentNodes.map(node => {
      const level = levels.get(node.id) || 0;
      const levelNodes = levelGroups.get(level) || [];
      const indexInLevel = levelNodes.findIndex(n => n.id === node.id);

      const totalWidth = (levelNodes.length - 1) * nodeSpacing;
      const startXForLevel = startX - totalWidth / 2;

      const x = isVertical ? startXForLevel + indexInLevel * nodeSpacing : startX + level * levelSpacing;
      const y = isVertical ? startY + level * levelSpacing : startY + indexInLevel * nodeSpacing;

      return {
        ...node,
        position: { x, y },
      };
    });

    setNodes(newNodes);
    setIsVertical(!isVertical);

    // Auto-fit the view
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 100);
  }, [reactFlowInstance, isVertical, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        id: `e${params.source}-${params.target}`,
        source: params.source!,
        target: params.target!,
        type: 'custom',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#94a3b8',
        },
      };
      setEdges((eds: Edge[]) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // This effect will update node colors whenever statusTypes change in the context
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const status = statusTypes && statusTypes.find((s) => s.name === node.data.label);
        if (status) {
          return {
            ...node,
            data: {
              ...node.data,
              color: status.color,
            },
          };
        }
        return node;
      })
    );
  }, [statusTypes, setNodes]);

  // Convert workflow to API format
  const convertWorkflowToApiFormat = useCallback(() => {
    const transitions: WorkflowTransition[] = [];

    // Find initial status (nodes without incoming edges)
    const nodeIds = nodes.map(node => node.id);
    const targetNodeIds = edges.map(edge => edge.target);
    const initialNodeIds = nodeIds.filter(nodeId => !targetNodeIds.includes(nodeId));

    edges.forEach(edge => {
      const sourceNode = nodes.find(node => node.id === edge.source);
      const targetNode = nodes.find(node => node.id === edge.target);

      if (sourceNode && targetNode) {
        // Find the status IDs from statusTypes based on node labels
        // statusTypes.id is already a string representation of the actual API ID
        const sourceStatus = statusTypes.find(status => status.name === sourceNode.data.label);
        const targetStatus = statusTypes.find(status => status.name === targetNode.data.label);

        if (sourceStatus && targetStatus) {
          // Use the actual defect status IDs from the API
          // The statusTypes.id contains the actual ID from the defect status API
          transitions.push({
            fromStatusId: parseInt(sourceStatus.id), // This is the actual API ID
            toStatusId: parseInt(targetStatus.id),   // This is the actual API ID
            isInitialStatus: initialNodeIds.includes(edge.source)
          });
        }
      }
    });

    return { transitions };
  }, [nodes, edges, statusTypes]);

  // Save workflow function
  const handleSaveWorkflow = useCallback(async () => {
    try {
      setIsSaving(true);
      setSaveMessage(null);

      const workflowData = convertWorkflowToApiFormat();
      console.log('Workflow data to be saved:', workflowData);

      if (workflowData.transitions.length === 0) {
        setSaveMessage({ type: 'error', text: 'No workflow transitions to save. Please create connections between status nodes.' });
        return;
      }

      // Validate that there's at least one initial status
      const hasInitialStatus = workflowData.transitions.some(t => t.isInitialStatus);
      if (!hasInitialStatus) {
        setSaveMessage({ type: 'error', text: 'Workflow must have at least one initial status (a status with no incoming connections).' });
        return;
      }

      console.log('Sending workflow data to API:', workflowData);
      await saveWorkflow(workflowData);
      setSaveMessage({ type: 'success', text: 'Workflow saved successfully!' });

      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      console.error('Failed to save workflow:', error);
      setSaveMessage({ type: 'error', text: error.message || 'Failed to save workflow. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  }, [convertWorkflowToApiFormat]);

  // Load existing workflows from API
  const loadExistingWorkflows = useCallback(async () => {
    try {
      setIsLoadingWorkflows(true);
      const response = await getAllWorkflows();

      // Store the transitions as a single workflow
      if (response.data.length > 0) {
        const workflowData = {
          id: 1,
          name: 'Current Workflow',
          transitions: response.data
        };
        setExistingWorkflows([workflowData]);

        // If no current workflow is loaded, load the existing one
        if (nodes.length === 0) {
          convertApiWorkflowToVisual(workflowData);
        }
      } else {
        setExistingWorkflows([]);
      }
    } catch (error) {
      console.error('Failed to load existing workflows:', error);
      setExistingWorkflows([]);
    } finally {
      setIsLoadingWorkflows(false);
    }
  }, [nodes.length]);

  // Convert API workflow to visual format
  const convertApiWorkflowToVisual = useCallback((workflow: any) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Create a map of all statuses and their connections
    const statusMap = new Map<number, any>();
    const incomingConnections = new Map<number, number[]>();
    const outgoingConnections = new Map<number, number[]>();

    workflow.transitions.forEach((transition: any) => {
      const fromId = transition.fromStatus.id;
      const toId = transition.toStatus.id;

      statusMap.set(fromId, transition.fromStatus);
      statusMap.set(toId, transition.toStatus);

      // Track connections
      if (!outgoingConnections.has(fromId)) {
        outgoingConnections.set(fromId, []);
      }
      outgoingConnections.get(fromId)!.push(toId);

      if (!incomingConnections.has(toId)) {
        incomingConnections.set(toId, []);
      }
      incomingConnections.get(toId)!.push(fromId);
    });

    // Find initial statuses (no incoming connections)
    const initialStatuses = Array.from(statusMap.keys()).filter(id =>
      !incomingConnections.has(id) || incomingConnections.get(id)!.length === 0
    );

    // Find terminal statuses (no outgoing connections)
    const terminalStatuses = Array.from(statusMap.keys()).filter(id =>
      !outgoingConnections.has(id) || outgoingConnections.get(id)!.length === 0
    );

    // Create a hierarchical layout
    const levels = new Map<number, number>(); // statusId -> level
    const positioned = new Set<number>();

    // Level 0: Initial statuses
    initialStatuses.forEach(statusId => {
      levels.set(statusId, 0);
      positioned.add(statusId);
    });

    // Calculate levels for other statuses
    let currentLevel = 0;
    let hasChanges = true;

    while (hasChanges && currentLevel < 10) { // Prevent infinite loops
      hasChanges = false;

      Array.from(statusMap.keys()).forEach(statusId => {
        if (positioned.has(statusId)) return;

        const incoming = incomingConnections.get(statusId) || [];
        const incomingLevels = incoming
          .filter(id => positioned.has(id))
          .map(id => levels.get(id)!);

        if (incomingLevels.length > 0) {
          const maxIncomingLevel = Math.max(...incomingLevels);
          levels.set(statusId, maxIncomingLevel + 1);
          positioned.add(statusId);
          hasChanges = true;
        }
      });

      currentLevel++;
    }

    // Handle any remaining unpositioned statuses
    Array.from(statusMap.keys()).forEach(statusId => {
      if (!positioned.has(statusId)) {
        levels.set(statusId, currentLevel);
      }
    });

    // Group statuses by level
    const levelGroups = new Map<number, number[]>();
    levels.forEach((level, statusId) => {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(statusId);
    });

    // Position nodes
    const levelSpacing = 250;
    const nodeSpacing = 180;
    const startX = 150;
    const startY = 100;

    levelGroups.forEach((statusIds, level) => {
      const levelY = startY + level * levelSpacing;
      const totalWidth = (statusIds.length - 1) * nodeSpacing;
      const startXForLevel = startX - totalWidth / 2;

      statusIds.forEach((statusId, index) => {
        const status = statusMap.get(statusId)!;
        const x = startXForLevel + index * nodeSpacing;

        newNodes.push({
          id: `status-${statusId}`,
          type: 'default',
          position: { x, y: levelY },
          data: { label: status.defectStatusName, color: status.colorCode },
        });
      });
    });

    // Create edges for each transition
    workflow.transitions.forEach((transition: any, index: number) => {
      const sourceNodeId = `status-${transition.fromStatus.id}`;
      const targetNodeId = `status-${transition.toStatus.id}`;

      newEdges.push({
        id: `e${transition.fromStatus.id}-${transition.toStatus.id}-${index}`,
        source: sourceNodeId,
        target: targetNodeId,
        type: 'custom',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#94a3b8',
        },
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);

    // Auto-fit the view after a short delay to ensure nodes are rendered
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2 });
      }
    }, 100);
  }, [setNodes, setEdges, reactFlowInstance]);

  // Load existing workflows on component mount
  useEffect(() => {
    if (statusTypes.length > 0 && isInitialized) {
      loadExistingWorkflows();
    }
  }, [statusTypes, isInitialized, loadExistingWorkflows]);

  // Refresh defect statuses
  const handleRefreshStatuses = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setSaveMessage(null); // Clear any existing messages

      // Fetch the latest statuses from the API
      const response = await getAllDefectStatuses();

      // Map API response to internal StatusType format (same as in AppContext)
      const apiStatusTypes = response.data.map((status: any) => ({
        id: String(status.id),
        name: status.defectStatusName,
        color: status.colorCode
      }));

      // Update the context with fresh data
      // Since we can't directly update the context from here, we'll trigger a re-fetch
      // by dispatching a custom event that the AppContext can listen to
      window.dispatchEvent(new CustomEvent('refreshDefectStatuses', {
        detail: { statusTypes: apiStatusTypes }
      }));

      // Show success message
      setSaveMessage({ type: 'success', text: `Refreshed ${apiStatusTypes.length} defect statuses from API` });

      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);

    } catch (error) {
      console.error('Failed to refresh statuses:', error);
      setSaveMessage({ type: 'error', text: 'Failed to refresh statuses. Please try again.' });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Defect Statuses</h2>
              <p className="text-xs text-gray-500">{statusTypes.length} statuses available</p>
            </div>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={handleRefreshStatuses}
                disabled={isRefreshing}
                title="Refresh statuses from API"
              />
              <Button
                variant="ghost"
                size="sm"
                icon={isVertical ? LayoutGrid : LayoutList}
                onClick={() => setIsVertical(!isVertical)}
                title="Toggle layout"
              />
            </div>
          </div>

          <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded-md">
            <p className="font-medium mb-1">How to create workflow:</p>
            <p>1. Drag any status from the list below to the canvas</p>
            <p>2. Add more statuses as needed</p>
            <p>3. Connect statuses by dragging from one node to another</p>
            <p>4. Use the auto-arrange button (↻) to organize the layout</p>
            <p>5. Click "Save Workflow" to save your changes</p>
            <p className="mt-2 text-blue-600"></p>
          </div>
          
          <div className="space-y-2">
            {statusTypes.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm">Loading defect statuses...</p>
              </div>
            ) : (
              statusTypes.map((status) => (
                <div
                  key={status.name}
                  className="p-2 border border-gray-200 rounded-md cursor-move hover:bg-gray-50 transition-colors"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/reactflow', status.name);
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                >
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-sm font-medium">{status.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">ID: {status.id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Existing Workflows Section */}
        {isLoadingWorkflows ? (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Loading existing workflows...</span>
            </div>
          </div>
        ) : existingWorkflows.length > 0 ? (
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900">Existing Workflow</h3>
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={loadExistingWorkflows}
                disabled={isLoadingWorkflows}
                className="text-xs px-1 py-1 h-auto"
                title="Refresh workflows"
              />
            </div>
            <div className="space-y-2">
              {existingWorkflows.map((workflow, index) => (
                <div
                  key={workflow.id || index}
                  className="p-3 bg-green-50 border border-green-200 rounded-md text-xs"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-green-800">{workflow.name || 'Saved Workflow'}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs px-2 py-1 h-auto text-green-600 hover:text-green-700"
                      onClick={() => convertApiWorkflowToVisual(workflow)}
                    >
                      Load
                    </Button>
                  </div>
                  <div className="text-green-700 mb-1">
                    {workflow.transitions.length} transitions found
                  </div>
                  <div className="text-green-600 text-xs">
                    Click "Load" to visualize this workflow
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border-t pt-4 mt-4">
            <div className="p-3 bg-gray-50 rounded-md text-xs text-center text-gray-600">
              No existing workflows found
            </div>
          </div>
        )}

        <div className="mt-auto space-y-2">
          {/* Clear workflow button */}
          {nodes.length > 0 && (
            <Button
              variant="ghost"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                setNodes([]);
                setEdges([]);
                localStorage.removeItem('statusWorkflowNodes');
                localStorage.removeItem('statusWorkflowEdges');
              }}
            >
              Clear Workflow
            </Button>
          )}

          {/* Workflow preview */}
          {edges.length > 0 && (
            <div className="text-xs bg-gray-50 p-2 rounded-md">
              <p className="font-medium mb-1">Workflow Preview:</p>
              <div className="max-h-20 overflow-y-auto">
                {edges.map((edge, index) => {
                  const sourceNode = nodes.find(n => n.id === edge.source);
                  const targetNode = nodes.find(n => n.id === edge.target);
                  const sourceStatus = statusTypes.find(s => s.name === sourceNode?.data.label);
                  const targetStatus = statusTypes.find(s => s.name === targetNode?.data.label);
                  return (
                    <div key={index} className="text-gray-600">
                      {sourceNode?.data.label} (ID:{sourceStatus?.id}) → {targetNode?.data.label} (ID:{targetStatus?.id})
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Save message display */}
          {saveMessage && (
            <div className={`p-2 rounded-md text-sm ${
              saveMessage.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {saveMessage.text}
            </div>
          )}

          <Button
            variant="secondary"
            className="w-full"
            icon={ChevronLeft}
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            icon={Save}
            onClick={handleSaveWorkflow}
            disabled={isSaving || nodes.length === 0}
          >
            {isSaving ? 'Saving...' : 'Save Workflow'}
          </Button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1">
        {isInitialized && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            defaultEdgeOptions={{
              type: 'custom',
              animated: true,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: '#94a3b8',
              },
            }}
            connectionRadius={20}
            snapToGrid={true}
            snapGrid={[15, 15]}
          >
            <Background />
            <Controls />

            {/* Empty state message */}
            {nodes.length === 0 && !isLoadingWorkflows && (
              <Panel position="top-center" className="pointer-events-none mt-20">
                <div className="bg-white/90 backdrop-blur-sm p-6 rounded-lg border border-gray-200 text-center shadow-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Create Your Workflow</h3>
                  <p className="text-gray-600 mb-4">
                    {existingWorkflows.length > 0
                      ? 'Load an existing workflow from the sidebar or drag status items to create a new one'
                      : 'Drag status items from the sidebar to start building your workflow'
                    }
                  </p>
                  <div className="text-sm text-gray-500 mb-2">
                    {statusTypes.length > 0 ? (
                      <>Available statuses: {statusTypes.map(s => s.name).join(', ')}</>
                    ) : (
                      'Loading statuses from API...'
                    )}
                  </div>
                  <div className="text-xs text-blue-600">
                    ✨ All statuses and workflows are loaded dynamically from the API
                  </div>
                </div>
              </Panel>
            )}

            <Panel position="top-right" className="space-x-2">
              <Button
                variant="secondary"
                size="sm"
                icon={RotateCcw}
                onClick={handleLayout}
                title="Auto-arrange workflow layout"
              />
              <Button
                variant="secondary"
                size="sm"
                icon={Maximize2}
                onClick={() => reactFlowInstance?.fitView({ padding: 0.2 })}
                title="Fit workflow to view"
              />
            </Panel>
          </ReactFlow>
        )}
      </div>

      {/* Delete Node Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingNode(null);
        }}
        title="Delete Node"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete the node "{editingNode?.data.label}"? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                setEditingNode(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              icon={Trash2}
              onClick={() => {
                if (editingNode) {
                  handleDeleteNode(editingNode.id);
                }
                setShowModal(false);
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StatusWorkflow; 