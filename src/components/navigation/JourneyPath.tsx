import { useRef, useEffect, useState, useCallback } from 'react'
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
  /** ID of the next node to complete (shows prominent glow) - if not provided, computed automatically */
  nextNodeId?: string
  /** Called when a node is clicked */
  onNodeClick: (nodeId: string) => void
  /** Title to display above the path */
  title?: string
}

/**
 * JourneyPath - Horizontal scrolling path showing learning progress
 * Nodes are connected by a path line, scrollable RTL
 * Supports mouse drag-to-scroll
 */
export function JourneyPath({
  nodes,
  nextNodeId,
  onNodeClick,
  title,
}: JourneyPathProps) {
  // Determine next node: explicit prop, first available, or first in-progress
  // Prioritize 'available' (not started) over 'in_progress' (already working on)
  const computedNextNodeId = nextNodeId ?? (
    nodes.find(n => n.state === 'available')?.id ??
    nodes.find(n => n.state === 'in_progress')?.id
  )
  const scrollRef = useRef<HTMLDivElement>(null)

  // Mouse drag-to-scroll state
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [hasDragged, setHasDragged] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return
    setIsDragging(true)
    setHasDragged(false)
    setStartX(e.pageX - scrollRef.current.offsetLeft)
    setScrollLeft(scrollRef.current.scrollLeft)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 1.5 // Scroll speed multiplier
    if (Math.abs(walk) > 5) {
      setHasDragged(true)
    }
    scrollRef.current.scrollLeft = scrollLeft - walk
  }, [isDragging, startX, scrollLeft])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Wrap onNodeClick to prevent click after drag
  const handleNodeClick = useCallback((nodeId: string) => {
    if (hasDragged) {
      setHasDragged(false)
      return
    }
    onNodeClick(nodeId)
  }, [hasDragged, onNodeClick])

  // Scroll to next node on mount and when it changes
  useEffect(() => {
    if (computedNextNodeId && scrollRef.current) {
      const nextElement = scrollRef.current.querySelector(
        `[data-node-id="${computedNextNodeId}"]`
      )
      if (nextElement) {
        nextElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        })
      }
    }
  }, [computedNextNodeId])

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
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        className="hide-scrollbar"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
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
                isNext={node.id === computedNextNodeId}
                onClick={() => handleNodeClick(node.id)}
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
