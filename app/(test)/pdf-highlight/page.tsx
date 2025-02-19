'use client'

import * as ph from 'react-pdf-highlighter';
import { useState, useEffect, useRef } from 'react';
import type { IHighlight } from 'react-pdf-highlighter';
import { useRouter } from 'next/navigation';

interface FileNode {
	name: string;
	type: 'file' | 'directory';
	children?: FileNode[];
	path: string;
}

interface Props {
	params: {
		id?: string;
	};
}

export default function Page({ params }: Props) {
	const router = useRouter();
	const { id } = params;
	const [pdfPath, setPdfPath] = useState<string>('');
	const [highlights, setHighlights] = useState<IHighlight[]>([]);
	const scrollRef = useRef<HTMLDivElement>(null);
	const [fileTree, setFileTree] = useState<FileNode[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchFileTree = async () => {
			try {
				const response = await fetch('/api/storage/list');
				const data = await response.json();
				setFileTree(data);
			} catch (error) {
				console.error('파일 트리를 가져오는데 실패했습니다:', error);
			} finally {
				setLoading(false);
			}
		};

		if (!id) {
			fetchFileTree();
		}
	}, [id]);

	useEffect(() => {
		const fetchPdfPath = async () => {
			try {
				const response = await fetch(`/api/pdf-path/${encodeURIComponent(id)}`);
				const data = await response.json();
				setPdfPath(data.path);
			} catch (error) {
				console.error('PDF 경로를 가져오는데 실패했습니다:', error);
			}
		};

		if (id) {
			fetchPdfPath();
		}
	}, [id]);

	const handleFileSelect = (node: FileNode) => {
		if (node.type === 'file' && node.path.toLowerCase().endsWith('.pdf')) {
			router.push(`/pdf-highlight/${encodeURIComponent(node.path)}`);
		}
	};

	const renderTree = (nodes: FileNode[]) => {
		return (
			<ul className="space-y-2">
				{nodes.map((node, index) => (
					<li key={index} className="pl-4">
						<div
							className={`flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded ${
								node.type === 'file' ? 'text-blue-600' : 'font-semibold'
							}`}
							onClick={() => handleFileSelect(node)}
						>
							<span>{node.type === 'file' ? '📄' : '📁'}</span>
							<span>{node.name}</span>
						</div>
						{node.type === 'directory' && node.children && (
							<div className="ml-4">
								{renderTree(node.children)}
							</div>
						)}
					</li>
				))}
			</ul>
		);
	};

	if (loading) {
		return <div>파일 목록을 불러오는 중...</div>;
	}

	if (!id) {
		return (
			<div className="p-4">
				<h1 className="text-2xl font-bold mb-4">PDF 문서 목록</h1>
				{renderTree(fileTree)}
			</div>
		);
	}

	if (!pdfPath) {
		return <div>PDF 문서를 불러오는 중...</div>;
	}

	return (
		<div className="pdf-container">
			<div className="flex items-center space-x-4 mb-4">
				<button
					onClick={() => router.push('/pdf-highlight')}
					className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
				>
					← 목록으로
				</button>
				<h1 className="text-2xl font-bold">PDF 문서 - {decodeURIComponent(id)}</h1>
			</div>
			<ph.PdfLoader 
				url={`/api/pdf-file?path=${encodeURIComponent(pdfPath)}`} 
				beforeLoad={<div>PDF 문서를 불러오는 중...</div>}
			>
				{(pdfDocument) => (
					<ph.PdfHighlighter
						pdfDocument={pdfDocument}
						enableAreaSelection={() => true}
						highlights={highlights}
						onScrollChange={() => {}}
						scrollRef={(scrollTo) => {
							scrollRef.current = scrollTo as unknown as HTMLDivElement;
						}}
						onSelectionFinished={(position, content) => {
							const highlight: IHighlight = {
								id: `highlight-${Date.now()}`,
								content,
								position,
								comment: null,
							};
							setHighlights([...highlights, highlight]);
						}}
						highlightTransform={(highlight, index, setTip, hideTip) => {
							return (
								<ph.Highlight
									key={index}
									position={highlight.position}
									comment={highlight.comment || ''}
									onClick={() => {
										setTip(highlight, () => (
											<div>
												<div>{highlight.content.text}</div>
											</div>
										));
									}}
									onMouseOut={hideTip}
									isScrolledTo={false}
								/>
							);
						}}
					/>
				)}
			</ph.PdfLoader>
		</div>
	);
}
