import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCheck, FolderCode } from "lucide-react";
import Link from "next/link";

export default function Page() {

	return (
		<>
		<div className="flex flex-col gap-2 justify-center items-center m-8 p-4">
			<h1 className="text-2xl font-bold">이 프로젝트는 현재 개발중입니다.</h1>
			<Separator className="w-full my-4" />
			<p className="text-sm text-muted-foreground">PoC 목록</p>
			


			<div className="flex flex-col gap-4">
			<Link href="/filesystem-api"><Button className="w-full w-max-lg" variant="outline">
				<FolderCode /> 폴더기준 계층형 파일 업로드 <CheckCheck color="green" />
			</Button></Link>

			<Link href="/filesystem-api"><Button className="w-full w-max-lg"variant="outline">
				<FolderCode /> fs 기반, node 실행중인 서버에 파일 업로드 처리
			</Button></Link>
			</div>
		</div>
		</>
	);
}
