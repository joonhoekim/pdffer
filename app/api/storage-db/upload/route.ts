import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { db } from "@/db/db";
import { files } from "@/db/schemas/files";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const uploadedFiles = formData.getAll("files");
    const results = [];

    for (const file of uploadedFiles) {
      if (!(file instanceof File)) {
        continue;
      }

      const storageId = uuidv4();
      const storagePath = join(process.cwd(), "storage", storageId);

      // 스토리지 디렉토리 생성
      await mkdir(storagePath, { recursive: true });

      // 파일 저장
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(join(storagePath, "original"), buffer);

      // DB에 메타데이터 저장
      const [fileEntry] = await db
        .insert(files)
        .values({
          storageId,
          name: file.name,
          type: "file",
          path: `/${file.name}`, // 루트에 저장
          mimeType: file.type,
          size: file.size.toString(),
          metadata: {
            originalName: file.name,
            lastModified: file.lastModified,
          },
        })
        .returning();

      results.push(fileEntry);
    }

    return NextResponse.json({
      success: true,
      message: "파일 업로드 완료",
      files: results,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
