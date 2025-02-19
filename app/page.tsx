import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCheck, FolderCode, SearchCheckIcon, Upload, UploadCloudIcon } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <>
      <div className="flex flex-col gap-2 justify-center items-center m-8 p-4">
        <h1 className="text-2xl font-bold">이 프로젝트는 현재 개발중입니다.</h1>
        <Separator className="w-full my-4" />
        <div className="flex flex-row gap-2 items-center">
          <p className="text-sm text-muted-foreground">PoC 목록</p>
          <SearchCheckIcon />
        </div>

        <div className="flex flex-col gap-4">
          <Link href="/filesystem-api">
            <Button className="w-full w-max-lg" variant="outline">
              <FolderCode /> 1. 폴더기준 계층형 파일 업로드 <CheckCheck color="green" />
            </Button>
          </Link>

          <Link href="/upload-multiple-files">
            <Button className="w-full w-max-lg" variant="outline">
              <Upload /> 2. 여러 파일 한번에 업로드 <CheckCheck color="green" />
            </Button>
          </Link>

          <Link href="/filesystem-api-upload">
            <Button className="w-full w-max-lg" variant="outline">
              <UploadCloudIcon /> 3. 파일시스템 API - 전체 계층형 업로드 <CheckCheck color="green" />
            </Button>
          </Link>

          <Link href="/filesystem-api-upload">
            <Button className="w-full w-max-lg" variant="outline">
              <UploadCloudIcon /> 4. 파일업로드 리팩터링: 파일시스템 + 메타데이터 DB <CheckCheck color="green" />
            </Button>
          </Link>

          <Link href="/pdf-highlight">
            <Button className="w-full w-max-lg" variant="outline">
              <UploadCloudIcon /> 5. pdf 필터링 기반 하이라이팅
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
