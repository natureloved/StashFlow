'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';

  // Only show on dashboard pages
  if (!pathname.startsWith('/dashboard')) return null;

  const items = [
    {
      label: 'Dashboard',
      icon: Home,
      href: '/dashboard?tab=dashboard',
      active: currentTab === 'dashboard',
    },
    {
      label: 'Portfolio',
      icon: PieChart,
      href: '/dashboard?tab=portfolio',
      active: currentTab === 'portfolio',
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#111118] border-t border-[#1E1E2E] flex items-center justify-around z-50 md:hidden">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
            item.active ? "text-[#00E5FF]" : "text-[#555555] hover:text-white"
          )}
        >
          <item.icon className={cn("w-6 h-6", item.active ? "stroke-[2.5px]" : "stroke-[2px]")} />
          <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
        </Link>
      ))}
    </div>
  );
}
