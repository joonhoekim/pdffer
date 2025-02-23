import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: "/api/pdf/:path*",
};

export async function middleware(request: NextRequest) {
  const pdfPath = request.nextUrl.pathname.replace("/api/pdf/", "");

  // Create a new request to arxiv
  const arxivUrl = `https://arxiv.org/pdf/${pdfPath}`;

  try {
    const response = await fetch(arxivUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; YourApp/1.0;)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    // Get the PDF content
    const pdfContent = await response.arrayBuffer();

    // Create a new response with the PDF content
    const newResponse = new NextResponse(pdfContent, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": pdfContent.byteLength.toString(),
        // Cache for 1 day
        "Cache-Control": "public, max-age=86400",
      },
    });

    return newResponse;
  } catch (error) {
    console.error("PDF proxy error:", error);
    return new NextResponse(JSON.stringify({ error: "Failed to fetch PDF" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
