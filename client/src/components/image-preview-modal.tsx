import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName?: string;
  imageSize?: number;
}

export default function ImagePreviewModal({ 
  isOpen, 
  onClose, 
  imageUrl, 
  imageName, 
  imageSize 
}: ImagePreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/95 border-0">
        <div className="relative flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <h3 className="text-white font-medium truncate">
                {imageName || "Image Preview"}
              </h3>
              {imageSize && (
                <span className="text-white/70 text-sm">
                  {(imageSize / 1024 / 1024).toFixed(1)} MB
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Download button */}
              <a 
                href={imageUrl} 
                download={imageName}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="Download"
              >
                <Download className="h-5 w-5 text-white" />
              </a>
              
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white hover:text-white"
                title="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Image container */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            <img 
              src={imageUrl} 
              alt={imageName || "Image preview"}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          {/* Click outside to close hint */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <p className="text-white/50 text-sm">Click outside to close</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}