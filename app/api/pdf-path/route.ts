import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // 실제 환경에서는 데이터베이스나 파일 시스템에서 경로를 조회
    // 예시 경로 반환
    const pdfPath = `storage/documents/${params.id}/document.pdf`;

    return NextResponse.json({ path: pdfPath });
  } catch (error) {
    return NextResponse.json({ error: "PDF 경로를 찾을 수 없습니다." }, { status: 404 });
  }
}
