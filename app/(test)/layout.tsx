import { Menubar, MenubarCheckboxItem, MenubarContent, MenubarMenu, MenubarTrigger } from '@/components/ui/menubar'
import { Home } from 'lucide-react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
	title: 'Create Next App',
	description: 'Create Next App with TypeScript, Tailwind CSS, NextAuth, Prisma, tRPC, and more.',
}

export default function Layout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<>
			<div className='flex flex-col gap-2 justify-center items-center m-8 p-4'>
				<Link href="/"><Home /></Link>
				
			{children}
			</div>
			
		</>
	)
}
