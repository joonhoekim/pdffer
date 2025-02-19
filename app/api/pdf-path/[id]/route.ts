import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import { promises as fs } from 'node:fs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const decodedPath = decodeURIComponent(id);
    const fullPath = path.join(process.cwd(), 'storage', decodedPath);

    // 파일 존재 여부 확인
    await fs.access(fullPath);

    return NextResponse.json({ path: decodedPath });
  } catch (error) {
    console.error('PDF 파일 경로를 확인하는데 실패했습니다:', error);
    return NextResponse.json(
      { error: 'PDF 파일을 찾을 수 없습니다.' },
      { status: 404 }
    );
  }
} 