import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

interface FileNode {
  name: string;
  type: "file" | "directory";
  children?: FileNode[];
  path: string;
}

async function buildFileTree(dir: string, basePath: string = ""): Promise<FileNode[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    const relativePath = path.join(basePath, entry.name);
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const children = await buildFileTree(fullPath, relativePath);
      nodes.push({
        name: entry.name,
        type: "directory",
        children,
        path: relativePath,
      });
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      nodes.push({
        name: entry.name,
        type: "file",
        path: relativePath,
      });
    }
  }

  return nodes;
}

export async function GET() {
  try {
    const storageDir = path.join(process.cwd(), "storage");
    const fileTree = await buildFileTree(storageDir);
    return NextResponse.json(fileTree);
  } catch (error) {
    console.error("파일 트리를 생성하는데 실패했습니다:", error);
    return NextResponse.json({ error: "파일 시스템을 읽는데 실패했습니다." }, { status: 500 });
  }
}
