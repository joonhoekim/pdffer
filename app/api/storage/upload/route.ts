import { NextResponse } from "next/server";
import { writeFile, mkdir, readdir } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files");

    // storage 디렉토리 경로
    const storageDir = path.join(process.cwd(), "storage");

    // 현재 존재하는 폴더들 확인
    const directories = await readdir(storageDir, { withFileTypes: true });
    const userDirs = directories
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => parseInt(dirent.name))
      .filter((name) => !isNaN(name));

    // 새로운 사용자 디렉토리 번호 결정
    const nextUserNumber = userDirs.length > 0 ? Math.max(...userDirs) + 1 : 1;
    const userDir = path.join(storageDir, nextUserNumber.toString());

    // 새 디렉토리 생성
    await mkdir(userDir, { recursive: true });

    // 파일 저장
    for (const file of files) {
      const f = file as File;
      const bytes = await f.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // 파일 이름에서 특수문자 제거 및 공백을 언더스코어로 변경
      const safeFileName = f.name.replace(/[^a-zA-Z0-9.]/g, "_");
      const filePath = path.join(userDir, safeFileName);

      await writeFile(filePath, buffer);
    }

    return NextResponse.json({
      success: true,
      directory: nextUserNumber,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
