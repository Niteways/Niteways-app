import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Edit, Trash2, ExternalLink, Calendar, Image, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface AdvertisingCard {
  id: string;
  city_id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  background_color: string;
  text_color: string;
  sort_order: number;
  is_active: boolean;
  position_after_section: string | null;
  card_size?: string;
  card_mode?: string;
  start_date?: string | null;
  end_date?: string | null;
}

interface SortableAdvertisingCardProps {
  card: AdvertisingCard;
  onEdit: (card: AdvertisingCard) => void;
  onDelete: (cardId: string) => void;
  onToggleActive: (card: AdvertisingCard, active: boolean) => void;
}

const getSizeLabel = (size: string | undefined) => {
  switch (size) {
    case 'small': return 'S';
    case 'medium': return 'M';
    case 'large': return 'L';
    case 'full': return 'XL';
    default: return 'M';
  }
};

export function SortableAdvertisingCard({
  card,
  onEdit,
  onDelete,
  onToggleActive,
}: SortableAdvertisingCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasDateRange = card.start_date || card.end_date;
  const isPhotoMode = card.card_mode === "photo";

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`overflow-hidden transition-all ${isDragging ? "opacity-50 scale-[1.02] ring-2 ring-primary shadow-lg" : ""} ${!card.is_active ? "opacity-60" : ""}`}
    >
      <div className="flex items-stretch">
        {/* Drag Handle */}
        <div 
          {...attributes} 
          {...listeners}
          className="flex items-center px-3 bg-muted/30 cursor-grab active:cursor-grabbing touch-none hover:bg-muted/50 transition-colors"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>
        
        {/* Preview Thumbnail */}
        <div 
          className="w-24 h-20 flex-shrink-0 flex items-center justify-center overflow-hidden relative"
          style={{ backgroundColor: isPhotoMode ? 'transparent' : card.background_color }}
        >
          {card.image_url ? (
            <img 
              src={card.image_url} 
              alt="" 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: card.background_color }}
            >
              {isPhotoMode ? (
                <Image className="w-6 h-6 text-muted-foreground" />
              ) : (
                <FileText className="w-6 h-6" style={{ color: card.text_color }} />
              )}
            </div>
          )}
          {/* Size badge overlay */}
          <Badge 
            variant="secondary" 
            className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0 h-5 bg-black/60 text-white border-0"
          >
            {getSizeLabel(card.card_size)}
          </Badge>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm truncate">{card.title}</h4>
                <Badge 
                  variant="outline" 
                  className={`text-[10px] ${isPhotoMode ? "bg-primary/10 text-primary border-primary/30" : "bg-muted"}`}
                >
                  {isPhotoMode ? "Photo" : "Custom"}
                </Badge>
              </div>
              {card.subtitle && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{card.subtitle}</p>
              )}
              {hasDateRange && (
                <div className="flex items-center gap-1 mt-1.5">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">
                    {card.start_date ? format(new Date(card.start_date), "MMM d") : "Start"}
                    {" → "}
                    {card.end_date ? format(new Date(card.end_date), "MMM d") : "End"}
                  </span>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Switch
                checked={card.is_active}
                onCheckedChange={(checked) => onToggleActive(card, checked)}
                className="scale-75"
              />
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col border-l border-border">
          {card.link_url && (
            <Button 
              variant="ghost" 
              size="icon"
              className="h-10 rounded-none hover:bg-muted"
              onClick={() => window.open(card.link_url!, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            className="h-10 rounded-none hover:bg-muted"
            onClick={() => onEdit(card)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-10 rounded-none hover:bg-destructive/10 text-destructive"
            onClick={() => onDelete(card.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
