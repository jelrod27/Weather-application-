"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { themeTokens } from '@/lib/theme-tokens';
import { toast } from "@/components/ui/use-toast";
import {
  Share2,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  Smartphone,
} from "lucide-react";
import { XIcon, FacebookIcon, LinkedInIcon } from "@/components/icons/social";


export interface ShareWeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  weatherData: {
    location: string;
    temperature: number;
    unit: string;
    condition: string;
    highTemp: number;
    lowTemp: number;
    precipChance?: number;
  };
}

interface SharePlatform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  hoverColor: string;
  getShareUrl: (text: string, url: string) => string;
}

function ShareWeatherModal({
  isOpen,
  onClose,
  weatherData,
}: ShareWeatherModalProps) {
  const themeClasses = themeTokens.modal;

  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canUseNativeShare, setCanUseNativeShare] = useState(false);

  // Check for native share support on mount
  useEffect(() => {
    setCanUseNativeShare(
      typeof navigator !== "undefined" && "share" in navigator
    );
  }, []);

  // Generate share text
  const generateShareText = useCallback(() => {
    const { location, temperature, unit, condition } = weatherData;
    return `It's ${Math.round(temperature)}${unit} and ${condition.toLowerCase()} in ${location}! Check your forecast at 16bitweather.co`;
  }, [weatherData]);

  // Generate share URL for the location
  // Format: /weather/city-name-xx where xx is state abbreviation
  // This matches the route parser in /weather/[city]/page.tsx
  const generateShareUrl = useCallback(() => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://16bitweather.co";

    // Parse location: "City, State" or "City, State, Country"
    const parts = weatherData.location.split(",").map((p) => p.trim());
    const cityName = parts[0] || "";

    // Extract state - could be full name or abbreviation
    let stateAbbrev = "";
    if (parts.length >= 2) {
      const statePart = parts[1].toUpperCase();
      // If it's already a 2-letter abbreviation, use it
      if (statePart.length === 2) {
        stateAbbrev = statePart.toLowerCase();
      } else {
        // Try to convert full state name to abbreviation
        const stateMap: Record<string, string> = {
          ALABAMA: "al", ALASKA: "ak", ARIZONA: "az", ARKANSAS: "ar", CALIFORNIA: "ca",
          COLORADO: "co", CONNECTICUT: "ct", DELAWARE: "de", FLORIDA: "fl", GEORGIA: "ga",
          HAWAII: "hi", IDAHO: "id", ILLINOIS: "il", INDIANA: "in", IOWA: "ia",
          KANSAS: "ks", KENTUCKY: "ky", LOUISIANA: "la", MAINE: "me", MARYLAND: "md",
          MASSACHUSETTS: "ma", MICHIGAN: "mi", MINNESOTA: "mn", MISSISSIPPI: "ms", MISSOURI: "mo",
          MONTANA: "mt", NEBRASKA: "ne", NEVADA: "nv", "NEW HAMPSHIRE": "nh", "NEW JERSEY": "nj",
          "NEW MEXICO": "nm", "NEW YORK": "ny", "NORTH CAROLINA": "nc", "NORTH DAKOTA": "nd",
          OHIO: "oh", OKLAHOMA: "ok", OREGON: "or", PENNSYLVANIA: "pa", "RHODE ISLAND": "ri",
          "SOUTH CAROLINA": "sc", "SOUTH DAKOTA": "sd", TENNESSEE: "tn", TEXAS: "tx", UTAH: "ut",
          VERMONT: "vt", VIRGINIA: "va", WASHINGTON: "wa", "WEST VIRGINIA": "wv",
          WISCONSIN: "wi", WYOMING: "wy", "DISTRICT OF COLUMBIA": "dc"
        };
        stateAbbrev = stateMap[statePart] || "";
      }
    }

    // Create slug: city-name-xx
    const citySlug = cityName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphen
      .replace(/(^-|-$)/g, ""); // Trim leading/trailing hyphens

    const fullSlug = stateAbbrev ? `${citySlug}-${stateAbbrev}` : citySlug;
    return `${baseUrl}/weather/${encodeURIComponent(fullSlug)}`;
  }, [weatherData.location]);

  // Share platforms configuration
  const platforms: SharePlatform[] = [
    {
      id: "x",
      name: "X (Twitter)",
      icon: <XIcon className="w-5 h-5" />,
      color: "bg-black",
      hoverColor: "hover:bg-gray-800",
      getShareUrl: (text, url) =>
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: <FacebookIcon className="w-5 h-5" />,
      color: "bg-[#1877F2]",
      hoverColor: "hover:bg-[#166FE5]",
      getShareUrl: (text, url) =>
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      icon: <LinkedInIcon className="w-5 h-5" />,
      color: "bg-[#0A66C2]",
      hoverColor: "hover:bg-[#095196]",
      getShareUrl: (_text, url) =>
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
  ];

  // Handle platform share
  const handlePlatformShare = (platform: SharePlatform) => {
    // Generate URLs synchronously to avoid popup blocking
    const text = generateShareText();
    const url = generateShareUrl();
    const shareUrl = platform.getShareUrl(text, url);

    // Open share dialog immediately (must be synchronous from user click)
    const windowFeatures = "width=600,height=400,scrollbars=yes,resizable=yes";
    const popup = window.open(shareUrl, "_blank", windowFeatures);

    // Check if popup was blocked
    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      toast({
        title: "POPUP BLOCKED",
        description: `Please allow popups for ${platform.name} or copy the link instead.`,
        variant: "destructive",
        duration: 5000,
        className: "font-mono uppercase tracking-wider border-0",
      });
      return;
    }

    toast({
      title: "SHARE OPENED",
      description: `Opening ${platform.name} share dialog...`,
      duration: 3000,
      className: "font-mono uppercase tracking-wider border-0",
    });
  };

  // Handle native share (mobile)
  const handleNativeShare = async () => {
    if (!canUseNativeShare) return;

    setIsGenerating(true);

    // Simulate generating weather card
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const text = generateShareText();
    const url = generateShareUrl();

    try {
      await navigator.share({
        title: `Weather in ${weatherData.location}`,
        text: text,
        url: url,
      });

      toast({
        title: "SHARED!",
        description: "Weather shared successfully",
        duration: 3000,
        className: "font-mono uppercase tracking-wider border-0",
      });
    } catch (error) {
      // User cancelled or share failed
      if ((error as Error).name !== "AbortError") {
        console.error("Share failed:", error);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle copy link
  const handleCopyLink = async () => {
    const url = generateShareUrl();
    const text = generateShareText();
    const fullText = `${text}\n\n${url}`;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);

      toast({
        title: "LINK COPIED!",
        description: "Weather link copied to clipboard",
        duration: 3000,
        className: "font-mono uppercase tracking-wider border-0",
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
      toast({
        title: "COPY FAILED",
        description: "Could not copy to clipboard",
        variant: "destructive",
        duration: 3000,
        className: "font-mono uppercase tracking-wider border-0",
      });
    }
  };

  const { location, temperature, unit, condition, highTemp, lowTemp, precipChance } =
    weatherData;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "sm:max-w-md border-0",
          themeClasses.background,
          themeClasses.borderColor
        )}
      >
        <DialogHeader>
          <DialogTitle
            className={cn(
              "text-xl font-bold font-mono uppercase tracking-wider flex items-center gap-2",
              themeClasses.headerText
            )}
          >
            <Share2 className="w-5 h-5" />
            Share Weather
          </DialogTitle>
          <DialogDescription className={cn("font-mono text-sm", themeClasses.text)}>
            Share the current weather with your friends
          </DialogDescription>
        </DialogHeader>

        {/* Weather Preview Card */}
        <div
          className={cn(
            "p-4 border-0 rounded-lg space-y-2",
            themeClasses.borderColor,
            themeClasses.cardBg
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("font-mono font-bold text-lg", themeClasses.accentText)}>
              {location}
            </span>
            <span className={cn("text-2xl font-bold font-mono", themeClasses.text)}>
              {Math.round(temperature)}{unit}
            </span>
          </div>
          <div className={cn("text-sm font-mono capitalize", themeClasses.text)}>
            {condition.toLowerCase()}
          </div>
          <div className={cn("flex gap-4 text-xs font-mono", themeClasses.secondary)}>
            <span>H: {Math.round(highTemp)}{unit}</span>
            <span>L: {Math.round(lowTemp)}{unit}</span>
            {precipChance !== undefined && precipChance > 0 && (
              <span>{precipChance}% precip</span>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isGenerating && (
          <div
            className={cn(
              "flex items-center justify-center gap-2 py-4",
              themeClasses.text
            )}
            role="status"
            aria-label="Generating weather card"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-mono text-sm">Generating your weather card...</span>
          </div>
        )}

        {/* Share Options */}
        {!isGenerating && (
          <div className="space-y-3">
            {/* Native Share Button (Mobile) */}
            {canUseNativeShare && (
              <Button
                onClick={handleNativeShare}
                className={cn(
                  "w-full font-mono font-bold uppercase tracking-wider",
                  themeClasses.accentBg,
                  "text-black"
                )}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Share via Device
              </Button>
            )}

            {/* Platform Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {platforms.map((platform) => (
                <Button
                  key={platform.id}
                  onClick={() => handlePlatformShare(platform)}
                  disabled={isGenerating}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 h-auto py-3",
                    platform.color,
                    platform.hoverColor,
                    "text-white transition-all duration-200",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  aria-label={`Share to ${platform.name}`}
                >
                  {platform.icon}
                  <span className="text-xs font-mono">{platform.name.split(" ")[0]}</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </Button>
              ))}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className={cn("flex-1 h-px", themeClasses.borderColor, "bg-current opacity-30")} />
              <span className={cn("text-xs font-mono uppercase", themeClasses.secondary)}>or</span>
              <div className={cn("flex-1 h-px", themeClasses.borderColor, "bg-current opacity-30")} />
            </div>

            {/* Copy Link Button */}
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className={cn(
                "w-full font-mono font-bold uppercase tracking-wider",
                themeClasses.borderColor,
                themeClasses.text,
                themeClasses.hoverBg
              )}
              aria-label={copied ? 'Weather link copied' : 'Copy weather share link'}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" aria-hidden />
                  <span role="status" aria-live="polite">
                    Copied!
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" aria-hidden />
                  Copy Link
                </>
              )}
            </Button>
          </div>
        )}

        {/* Info Text */}
        <p className={cn("text-xs font-mono text-center", themeClasses.secondary)}>
          Share includes weather details and a link to 16bitweather.co
        </p>
      </DialogContent>
    </Dialog>
  );
}

// ShareButton Component
export interface ShareButtonProps {
  weatherData: ShareWeatherModalProps["weatherData"];
  variant?: "icon" | "button";
  className?: string;
}

export function ShareButton({
  weatherData,
  variant = "button",
  className,
}: ShareButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const themeClasses = themeTokens.button;

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  if (variant === "icon") {
    return (
      <>
        <Button
          onClick={handleClick}
          variant="ghost"
          size="icon"
          className={cn(
            "transition-all duration-200",
            themeClasses.hoverBg,
            className
          )}
          aria-label="Share weather"
        >
          <Share2 className="w-4 h-4" />
        </Button>
        <ShareWeatherModal
          isOpen={isModalOpen}
          onClose={handleClose}
          weatherData={weatherData}
        />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={handleClick}
        variant="outline"
        className={cn(
          "font-mono uppercase tracking-wider transition-all duration-200",
          themeClasses.borderColor,
          themeClasses.text,
          themeClasses.hoverBg,
          className
        )}
        aria-label="Share weather"
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share
      </Button>
      <ShareWeatherModal
        isOpen={isModalOpen}
        onClose={handleClose}
        weatherData={weatherData}
      />
    </>
  );
}
