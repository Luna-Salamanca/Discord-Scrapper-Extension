import { useState, useRef, useEffect } from 'react';
import { Menu, Bot, Wand2, HelpCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils';

export type PageType = 'home' | 'bots' | 'tools' | 'about' | 'plan';

interface NavbarProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  title?: string;
}

interface MenuItem {
  id: PageType;
  label: string;
  icon: React.ReactNode;
}

const menuItems: MenuItem[] = [
  { id: 'bots', label: 'Bots', icon: <Bot size={16} /> },
  { id: 'tools', label: 'Tools', icon: <Wand2 size={16} /> },
  { id: 'about', label: 'About', icon: <HelpCircle size={16} /> },
];

export default function Navbar({ currentPage, onPageChange, title = 'DISCORD MEMBER SCRAPER' }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);

  const handleMenuClick = (page: PageType) => {
    onPageChange(page);
    setIsMenuOpen(false);
  };

  // Collapse menu when clicking any non-menu part of the page
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isClickInsideMenu = menuRef.current?.contains(target) || menuDropdownRef.current?.contains(target);

      if (!isClickInsideMenu) {
        setIsMenuOpen(false);
      }
    };

    // Use capture phase to ensure it's handled before other events
    document.addEventListener('mousedown', handleClickOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isMenuOpen]);

  return (
    <div ref={menuRef} className="relative w-full bg-black text-white">
      {/* Navigation bar */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left menu button */}
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-gray-800 hover:text-white p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu size={20} />
        </Button>

        {/* Middle title */}
        <div className="flex-1 text-center">
          <h1 className="text-yellow-400 font-semibold text-sm">{title}</h1>
        </div>

        {/* Right: Home button + Plan(PRO) button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open('https://bot.wkeasy.com', '_blank')}
            className="w-7 h-7 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center border border-gray-700">
              <Home size={14} className="text-white" />
            </div>
          </button>

          <button
            onClick={() => onPageChange('plan')}
            className="h-7 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="px-2 h-5 rounded-sm bg-gradient-to-b from-green-500 to-red-500 flex items-center justify-center">
              <span className="text-[10px] font-semibold text-white">PRO</span>
            </div>
          </button>
        </div>
      </div>

      {/* Dropdown menu */}
      {isMenuOpen && (
        <div
          ref={menuDropdownRef}
          className="absolute top-full left-2 w-32 bg-gray-900 border border-gray-700 rounded-b-lg shadow-lg z-50 overflow-hidden"
        >
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-white text-xs cursor-pointer transition-colors',
                'hover:bg-gray-800',
                currentPage === item.id && 'bg-gray-800',
              )}
            >
              <span className="flex items-center">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
