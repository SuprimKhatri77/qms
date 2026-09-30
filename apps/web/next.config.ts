import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The reset link's token is in this page's URL. no-referrer stops the
        // browser sending that URL to any other site the page loads from or
        // links to. Nothing external is loaded there today; this keeps it
        // that way if something is added later.
        source: "/auth/reset-password",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;
