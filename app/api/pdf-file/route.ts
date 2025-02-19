import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "파일 경로가 제공되지 않았습니다." }, { status: 400 });
    }

    const decodedPath = decodeURIComponent(filePath);
    const fullPath = path.join(process.cwd(), "storage", decodedPath);

    // 파일 읽기
    const fileBuffer = await fs.readFile(fullPath);

    // PDF 파일 응답 반환
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${path.basename(decodedPath)}"`,
      },
    });
  } catch (error) {
    console.error("PDF 파일을 읽는데 실패했습니다:", error);
    return NextResponse.json({ error: "PDF 파일을 찾을 수 없습니다." }, { status: 404 });
  }
}
