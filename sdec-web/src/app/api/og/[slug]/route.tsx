import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: election } = await supabase
    .from("elections")
    .select("title")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  const title = election?.title ?? "SDEC Election";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F7F7F4",
        }}
      >
        <div style={{ fontSize: 28, color: "#0E8C7A", fontWeight: 600 }}>
          Student Digital Election Commission
        </div>
        <div
          style={{
            fontSize: 56,
            color: "#1F2A4D",
            fontWeight: 700,
            marginTop: 24,
            textAlign: "center",
            padding: "0 60px",
          }}
        >
          {title}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
