import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Flashlight, FlashlightOff, Camera } from "lucide-react";
import { toast } from "sonner";

interface QRScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan?: (data: string) => void;
}

export function QRScannerModal({ open, onOpenChange, onScan }: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open]);

  const startCamera = async () => {
    try {
      setError(null);
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Check if flash is available
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      setHasFlash(capabilities?.torch === true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please ensure camera permissions are granted.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setFlashOn(false);
  };

  const toggleFlash = async () => {
    if (!stream || !hasFlash) return;

    try {
      const track = stream.getVideoTracks()[0];
      const newFlashState = !flashOn;
      
      await track.applyConstraints({
        advanced: [{ torch: newFlashState } as MediaTrackConstraintSet],
      });
      
      setFlashOn(newFlashState);
      toast.success(newFlashState ? "Flash on" : "Flash off");
    } catch (err) {
      console.error("Error toggling flash:", err);
      toast.error("Unable to toggle flash");
    }
  };

  // Simulated QR scan for demo
  const handleSimulateScan = () => {
    const mockData = "GUEST-" + Math.random().toString(36).substring(7).toUpperCase();
    toast.success(`Scanned: ${mockData}`);
    onScan?.(mockData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black">
        <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">QR Scanner</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative aspect-square w-full">
          {error ? (
            <div className="flex items-center justify-center h-full bg-muted/20 p-6">
              <div className="text-center">
                <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={startCamera}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-64">
                  {/* Corner markers */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  
                  {/* Scanning line animation */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-primary/60 animate-pulse" 
                    style={{ animation: "scanLine 2s ease-in-out infinite" }}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
                {hasFlash && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full h-14 w-14 bg-black/50 border-white/30 hover:bg-white/20"
                    onClick={toggleFlash}
                  >
                    {flashOn ? (
                      <Flashlight className="w-6 h-6 text-yellow-400" />
                    ) : (
                      <FlashlightOff className="w-6 h-6 text-white" />
                    )}
                  </Button>
                )}
                
                {/* Demo scan button */}
                <Button
                  variant="default"
                  size="lg"
                  className="rounded-full px-6"
                  onClick={handleSimulateScan}
                >
                  Simulate Scan
                </Button>
              </div>
            </>
          )}
        </div>

        <style>{`
          @keyframes scanLine {
            0%, 100% { transform: translateY(0); opacity: 0.6; }
            50% { transform: translateY(256px); opacity: 1; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}