import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

interface FileUpload {
  path: string;
  file: File;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const basePath = formData.get('basePath') as string;
    const files = formData.getAll('files') as File[];
    const filePaths = formData.getAll('paths') as string[];
    
    if (!basePath || files.length !== filePaths.length) {
      throw new Error('Invalid request data');
    }

    // storage/basePath 디렉토리 생성
    const storageDir = path.join(process.cwd(), 'storage', basePath);
    await mkdir(storageDir, { recursive: true });

    // 각 파일을 상대 경로를 유지하며 저장
    for (let i = 0; i < files.length; i++) {
      const relativePath = filePaths[i];
      const fullPath = path.join(storageDir, relativePath);
      
      // 파일이 위치할 디렉토리 생성
      const dirPath = path.dirname(fullPath);
      await mkdir(dirPath, { recursive: true });
      
      // 파일 저장
      const file = files[i];
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      await writeFile(fullPath, buffer);
    }

    return NextResponse.json({ 
      success: true, 
      directory: basePath
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
} 