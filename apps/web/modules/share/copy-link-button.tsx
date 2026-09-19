"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

// Copies `value` to the clipboard and shows a checkmark for a couple seconds.
export function CopyLinkButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked (permissions, insecure context); the
      // link is already shown as text, so the owner can still select and copy it.
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick}>
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
