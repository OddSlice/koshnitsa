"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    name: "Lists",
    href: "/lists",
    icon: (active: boolean) => (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
  },
  {
    name: "Scan",
    href: "/scan",
    icon: (active: boolean) => (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
      </svg>
    ),
  },
  {
    name: "Deals",
    href: "/deals",
    icon: (active: boolean) => (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
      </svg>
    ),
  },
  {
    name: "History",
    href: "/history",
    icon: (active: boolean) => (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? "text-green-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon(isActive)}
              {tab.name}
            </Link>
          );
        })}
      </div>
      {/* Safe area for phones with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
