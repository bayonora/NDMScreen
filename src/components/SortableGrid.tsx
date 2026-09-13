import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';

function isInteractiveElement(element) {
  if (!element) return false;
  
  const interactiveElements = [
    'button',
    'input',
    'textarea',
    'select',
    'option',
    'a'
  ];

  if (element.tagName && interactiveElements.includes(element.tagName.toLowerCase())) {
    return true;
  }
  
  if (element.isContentEditable) return true;

  let parent = element.parentElement;
  let depth = 0;
  while (parent && depth < 4) {
    if (parent.tagName && interactiveElements.includes(parent.tagName.toLowerCase())) {
      return true;
    }
    if (parent.isContentEditable) return true;
    if (parent.getAttribute('data-no-dnd') === 'true') return true;
    parent = parent.parentElement;
    depth++;
  }

  return element.getAttribute('data-no-dnd') === 'true';
}



class SmartTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: 'onTouchStart' as const,
      handler: ({ nativeEvent: event }: any) => {
        if (isInteractiveElement(event.target)) {
          return false;
        }
        return true;
      },
    },
  ] as any;
}

class SmartPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }: any) => {
        if (
          !event.isPrimary ||
          event.button !== 0 ||
          isInteractiveElement(event.target)
        ) {
          return false;
        }
        return true;
      },
    },
  ] as any;
}


interface SortableGridProps<T extends { id: string }> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, isDragging: boolean) => React.ReactNode;
  className?: string;
}

export function SortableGrid<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 items-start w-full"
}: SortableGridProps<T>) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(SmartPointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(SmartTouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      }
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  };

  const activeItem = React.useMemo(
    () => items.find((i) => i.id === activeId),
    [activeId, items]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className={className}>
          {items.map((item) => (
              <SortableItem key={item.id} id={item.id}>
                {renderItem(item, false)}
              </SortableItem>
            ))}
        </div>
      </SortableContext>
      <DragOverlay
        dropAnimation={{
          duration: 300,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } })
        }}
      >
        {activeItem ? (
          <div className="rotate-2 scale-105 opacity-90 shadow-2xl z-[999]">
            {renderItem(activeItem, true)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <div className={isDragging ? 'pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
}
