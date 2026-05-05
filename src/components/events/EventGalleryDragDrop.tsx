import { useState } from "react";
import { X, GripVertical, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableImageProps {
  id: string;
  url: string;
  index: number;
  isHero: boolean;
  onRemove: () => void;
  onSetHero: () => void;
}

function SortableImage({ id, url, index, isHero, onRemove, onSetHero }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative aspect-video rounded-lg overflow-hidden border group",
        isDragging ? "opacity-50 z-50" : "opacity-100",
        isHero ? "border-primary border-2" : "border-border"
      )}
    >
      <img src={url} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
      
      {/* Hero badge */}
      {isHero && (
        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded font-medium flex items-center gap-1">
          <Star className="w-3 h-3 fill-current" />
          Hero
        </div>
      )}
      
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 right-8 w-6 h-6 rounded bg-black/60 text-white flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
      >
        <X className="w-4 h-4" />
      </button>
      
      {/* Set as hero button */}
      {!isHero && (
        <button
          onClick={onSetHero}
          className="absolute bottom-1 left-1 text-[10px] px-2 py-0.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary"
        >
          Set as Hero
        </button>
      )}
    </div>
  );
}

interface EventGalleryDragDropProps {
  images: string[];
  heroImage?: string;
  onReorder: (images: string[]) => void;
  onRemove: (index: number) => void;
  onSetHero: (url: string) => void;
}

export function EventGalleryDragDrop({ 
  images, 
  heroImage, 
  onReorder, 
  onRemove, 
  onSetHero 
}: EventGalleryDragDropProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = images.indexOf(active.id as string);
      const newIndex = images.indexOf(over.id as string);
      onReorder(arrayMove(images, oldIndex, newIndex));
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={images} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-4 gap-3">
          {images.map((url, idx) => (
            <SortableImage
              key={url}
              id={url}
              url={url}
              index={idx}
              isHero={heroImage === url}
              onRemove={() => onRemove(idx)}
              onSetHero={() => onSetHero(url)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
