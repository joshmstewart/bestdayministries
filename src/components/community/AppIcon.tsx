import { useNavigate } from "react-router-dom";
import { AppConfig } from "./appsConfig";
import { cn } from "@/lib/utils";

interface AppIconProps {
  app: AppConfig;
  editMode?: boolean;
  isHidden?: boolean;
  onToggle?: () => void;
}

export function AppIcon({ app, editMode = false, isHidden = false, onToggle }: AppIconProps) {
  const navigate = useNavigate();
  const Icon = app.icon;

  const handleClick = () => {
    if (editMode && onToggle) {
      onToggle();
    } else {
      navigate(app.route);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex flex-col items-center gap-2 p-2 rounded-xl transition-all",
        editMode && "animate-wiggle",
        isHidden && "opacity-40"
      )}
    >
      {/* App icon with gradient background */}
      <div
        className={cn(
          "relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg",
          "bg-gradient-to-br",
          app.color,
          !editMode && "hover:scale-105 active:scale-95 transition-transform"
        )}
      >
        <Icon className="w-8 h-8 text-white drop-shadow-md" />
        
        {/* Edit mode checkbox indicator */}
        {editMode && (
          <div className={cn(
            "absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-background shadow-md flex items-center justify-center",
            isHidden ? "bg-muted" : "bg-primary"
          )}>
            {!isHidden && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}
      </div>
      
      {/* App name */}
      <span className="text-xs font-medium text-foreground text-center leading-tight max-w-16 line-clamp-2">
        {app.name}
      </span>
    </button>
  );
}
