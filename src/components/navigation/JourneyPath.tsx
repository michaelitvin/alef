import { useRef, useEffect } from 'react'
import { colors, typography, spacing, borderRadius } from '../../styles/theme'
import { NodeIcon, type NodeState } from './NodeIcon'

export interface JourneyNode {
  id: string
  label: string
  state: NodeState
  order: number
}

export interface JourneyPathProps {
  /** Array of nodes to display */
  nodes: JourneyNode[]
  /** Currently active node ID */
  activeNodeId?: string
  /** Called when a node is clicked */
  onNodeClick: (nodeId: string) => void
  /** Title to display above the path */
  title?: string
}

/**
 * JourneyPath - Horizontal scrolling path showing learning progress
 * Nodes are connected by a path line, scrollable RTL
 */
export function JourneyPath({
  nodes,
  activeNodeId,
  onNodeClick,
  title,
}: JourneyPathProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll to active node on mount and when it changes
  useEffect(() => {
    if (activeNodeId && scrollRef.current) {
      const activeElement = scrollRef.current.querySelector(
        `[data-node-id="${activeNodeId}"]`
      )
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        })
      }
    }
  }, [activeNodeId])

  return (
    <div
      style={{
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Title */}
      {title && (
        <h2
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            textAlign: 'center',
            marginBottom: spacing[4],
          }}
        >
          {title}
        </h2>
      )}

      {/* Scrollable path container */}
      <div
        ref={scrollRef}
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingTop: spacing[4],
          paddingBottom: spacing[4],
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        className="hide-scrollbar"
      >
        {/* Path with nodes */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            padding: `0 ${spacing[4]}`,
            minWidth: 'max-content',
          }}
        >
          {nodes.map((node, index) => (
            <div
              key={node.id}
              data-node-id={node.id}
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {/* Node */}
              <NodeIcon
                label={node.label}
                state={node.state}
                isActive={node.id === activeNodeId}
                onClick={() => onNodeClick(node.id)}
              />

              {/* Connector line (except after last node) */}
              {index < nodes.length - 1 && (
                <div
                  style={{
                    width: '40px',
                    height: '4px',
                    backgroundColor:
                      node.state === 'mastered' || node.state === 'in_progress'
                        ? colors.primary[300]
                        : colors.neutral[200],
                    marginLeft: spacing[2],
                    marginRight: spacing[2],
                    borderRadius: borderRadius.full,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Progress indicator */}
      <div
        style={{
          textAlign: 'center',
          marginTop: spacing[2],
        }}
      >
        <span
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
          }}
        >
          {nodes.filter((n) => n.state === 'mastered').length} / {nodes.length}
        </span>
      </div>
    </div>
  )
}

export default JourneyPath
