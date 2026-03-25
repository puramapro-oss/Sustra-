'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import {
  LayoutDashboard,
  Plus,
  Film,
  Library,
  Bot,
  HelpCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trophy,
  Users,
  Scissors,
  Store,
  Calendar,
  Shield,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'Créer', href: '/create', icon: <Plus size={20} /> },
  { label: 'Vidéo→Shorts', href: '/create/shorts', icon: <Scissors size={20} /> },
  { label: 'Éditeur', href: '/editor', icon: <Film size={20} /> },
  { label: 'Bibliothèque', href: '/library', icon: <Library size={20} /> },
  { label: 'Planifier', href: '/scheduler', icon: <Calendar size={20} /> },
  { label: 'Autopilot', href: '/autopilot', icon: <Bot size={20} /> },
  { label: 'Concours', href: '/contests', icon: <Trophy size={20} /> },
  { label: 'Parrainage', href: '/referrals', icon: <Users size={20} /> },
  { label: 'Marketplace', href: '/marketplace', icon: <Store size={20} /> },
  { label: 'Aide', href: '/help', icon: <HelpCircle size={20} /> },
  { label: 'Paramètres', href: '/settings', icon: <Settings size={20} /> },
  { label: 'Admin', href: '/admin', icon: <Shield size={20} /> },
];

interface SidebarProps {
  user?: {
    name?: string;
    avatar?: string;
    plan?: string;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-screen z-40 flex flex-col',
        'bg-white/[0.03] backdrop-blur-2xl border-r border-white/10',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[72px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shrink-0">
          <Sparkles size={18} className="text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-white font-[family-name:var(--font-orbitron)] tracking-wider">
            SUTRA
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                'font-[family-name:var(--font-exo2)] text-sm',
                isActive
                  ? 'bg-violet-500/15 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              )}
            >
              {/* Active glow indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]" />
              )}
              <span className={cn('shrink-0', isActive && 'text-violet-400')}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-white/5 p-3 shrink-0">
        <div className={cn(
          'flex items-center gap-3 px-3 py-2',
          collapsed && 'justify-center px-0'
        )}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 text-white text-xs font-bold">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || 'U'
            )}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm text-white/80 truncate font-[family-name:var(--font-exo2)]">
                {user?.name || 'Utilisateur'}
              </span>
              <Badge plan={user?.plan || 'starter'} size="sm" />
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          'absolute -right-3 top-20 w-6 h-6 rounded-full',
          'bg-[#0d0c1d] border border-white/10 flex items-center justify-center',
          'text-white/50 hover:text-white hover:border-white/20 transition-colors',
          'z-50'
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
