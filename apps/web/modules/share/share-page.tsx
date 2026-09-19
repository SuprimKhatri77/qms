"use client";

import { useRef } from "react";
import Link from "next/link";
import { ExternalLink, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSiteUrl } from "@/lib/site-url";
import { PageHeader } from "@/modules/dashboard/page-header";
import { useShop } from "@/modules/shop/shop-provider";
import { CopyLinkButton } from "./copy-link-button";

// A QR code pointed at this URL doesn't work yet: the customer-facing join
// page hasn't been built. The page is still useful today for the plain link
// and for having the QR code ready to print once it does.
export function SharePage() {
  const shop = useShop();
  const svgRef = useRef<SVGSVGElement>(null);
  const joinPath = `/s/${shop.slug}`;
  const joinUrl = `${getSiteUrl()}${joinPath}`;

  function downloadQrCode() {
    const svg = svgRef.current;
    if (!svg) return;

    // Turn the SVG into a PNG the owner can print, by drawing it onto a canvas.
    const svgBlob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = 4; // print-quality resolution, not just screen size
      canvas.width = image.width * scale;
      canvas.height = image.height * scale;

      const context = canvas.getContext("2d");
      if (!context) return;

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const link = document.createElement("a");
      link.download = `${shop.slug}-queue-qr.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    image.src = url;
  }

  return (
    <div className="mx-auto max-w-[560px]">
      <PageHeader
        title="Share & QR"
        description="Customers scan this code or open this link to join your queue."
      />

      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-8">
          <div className="border border-hairline p-4">
            <QRCodeSVG ref={svgRef} value={joinUrl} size={220} level="M" />
          </div>

          <div className="flex w-full items-center gap-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap border border-hairline bg-canvas-soft px-3 py-2 text-sm text-ink">
              {joinUrl}
            </code>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <CopyLinkButton value={joinUrl} />
            <Button variant="outline" onClick={downloadQrCode}>
              <Download />
              Download QR
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={joinPath} target="_blank" />}
            >
              <ExternalLink />
              Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-ink-mute">
        The join page itself is coming in a later update — printing or sharing
        this now is safe, it will start working once it ships.
      </p>
    </div>
  );
}
