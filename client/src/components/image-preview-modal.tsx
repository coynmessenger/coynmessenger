import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName?: string;
}

export default function ImagePreviewModal({ isOpen, onClose, imageUrl, imageName }: ImagePreviewModalProps) {
  const displayName = imageName || "Image";
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = displayName;
    link.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-2 bg-black/90 border-none">
        <div className="relative">
          {/* Header with controls */}
          <div className="absolute top-2 right-2 z-10 flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="bg-black/50 hover:bg-black/70 text-white h-10 w-10"
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="bg-black/50 hover:bg-black/70 text-white h-10 w-10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Image display */}
          <div className="flex items-center justify-center min-h-[50vh]">
            <img
              src={imageUrl}
              alt={imageName}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>

          {/* Image name at bottom */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm">
              {displayName}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}