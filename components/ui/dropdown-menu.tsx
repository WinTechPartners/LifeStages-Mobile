'use client'
import * as React from 'react'
import * as Menu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger
export function DropdownMenuContent({ className, sideOffset = 4, ...props }: React.ComponentProps<typeof Menu.Content>) {
  return <Menu.Portal><Menu.Content sideOffset={sideOffset} className={cn('z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md', className)} {...props} /></Menu.Portal>
}
export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof Menu.Item>) {
  return <Menu.Item className={cn('relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)} {...props} />
}
