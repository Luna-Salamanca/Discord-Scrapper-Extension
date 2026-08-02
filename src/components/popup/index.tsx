import './popup.css';
import { useState } from 'react';
import Navbar, { type PageType } from '@/components/navbar/index.tsx';
import BotsPage from '@/components/pages/Bots.tsx';
import ToolsPage from '@/components/pages/Tools.tsx';
import AboutPage from '@/components/pages/About.tsx';
import PlanPage from '@/components/pages/Plan.tsx';

export default function Popup() {
  const [currentPage, setCurrentPage] = useState<PageType>('bots');

  const renderPage = () => {
    switch (currentPage) {
      case 'bots':
        return <BotsPage onNavigate={setCurrentPage} />;
      case 'tools':
        return <ToolsPage />;
      case 'about':
        return <AboutPage />;
      case 'plan':
        return <PlanPage />;
      default:
        return <BotsPage />;
    }
  };

  return (
    <div className="w-full bg-white flex flex-col border-0 p-0 m-0" style={{ maxHeight: '600px' }}>
      <div className="w-full flex flex-col bg-background text-foreground" style={{ maxHeight: '600px' }}>
        {/* Navbar - Fixed */}
        <div className="flex-shrink-0">
          <Navbar currentPage={currentPage} onPageChange={setCurrentPage} />
        </div>

        {/* Content area */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">{renderPage()}</div>
      </div>
    </div>
  );
}
