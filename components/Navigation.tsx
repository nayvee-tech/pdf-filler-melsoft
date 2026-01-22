'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Upload, User, FolderOpen, LogOut, FileStack, FileText } from 'lucide-react';
import { Button } from './ui/button';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { href: '/', label: 'Upload', icon: Upload },
    { href: '/templates', label: 'Templates', icon: FileStack },
    { href: '/template-designer-canvas', label: 'Designer (New)', icon: FileText },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/vault', label: 'Vault', icon: FolderOpen },
  ];

  return (
    <nav className="bg-white border-b border-[#0F172A]/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-[#0F172A] rounded-lg flex items-center justify-center">
                <span className="text-[#D4AF37] font-bold text-xl">M</span>
              </div>
              <span className="font-bold text-[#0F172A] text-lg hidden sm:block">
                SBD Automation
              </span>
            </Link>
            <div className="flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative"
                    >
                      <Button
                        variant={isActive ? 'default' : 'ghost'}
                        className="gap-2"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{item.label}</span>
                      </Button>
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37]"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
