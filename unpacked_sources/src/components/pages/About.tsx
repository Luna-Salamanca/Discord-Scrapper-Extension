import { useState } from 'react';
import { ChevronRight, MessageSquarePlus, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: 'How to export reactions members?',
    answer:
      'To export reactions members, go to the History page and select the reactions you want to export. Then click the export button to download the data.',
  },
];

export default function AboutPage() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleFAQClick = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleReviewButton = () => {
    // Open Chrome Web Store review page
    if (chrome?.runtime?.id) {
      chrome.tabs.create({
        url: `https://chromewebstore.google.com/detail/discord-member-scraper/aemkeonoklglikphmopognhlbfbflicm/reviews`,
      });
    }
  };

  const handleEmailButton = () => {
    // Open email client
    window.location.href = 'mailto:muepoints@gmail.com?subject=Discord Member Scraper Support Request';
  };

  return (
    <div className="flex flex-col gap-4 p-4 min-h-0">
      {/* FAQ list */}
      <div className="flex flex-col gap-2">
        {faqItems.map((item, index) => (
          <div key={index} className="flex flex-col">
            <button
              onClick={() => handleFAQClick(index)}
              className="flex items-center gap-2 tleft tsm tgray-700 hover:tgray-900 transition-colors py-2"
            >
              <ChevronRight
                size={16}
                className={cn('tgray-500 transition-transform', expandedIndex === index && 'rotate-90')}
              />
              <span>{item.question}</span>
            </button>
            {expandedIndex === index && <div className="pl-6 py-2 txs tgray-600">{item.answer}</div>}
          </div>
        ))}
      </div>

      {/* Bottom buttons and version number */}
      <div className="flex flex-col gap-3 mt-auto">
        {/* Three buttons */}
        <div className="flex items-center gap-2 justify-between">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-white border-blue-500 text-blue-500 hover:bg-blue-50 px-2 py-1.5"
            onClick={handleReviewButton}
          >
            <MessageSquarePlus size={12} />
            <span className="txs">Leave a Review</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-white border-blue-500 text-blue-500 hover:bg-blue-50 px-2 py-1.5"
            onClick={handleEmailButton}
          >
            <Mail size={12} />
            <span className="txs">Email US</span>
          </Button>
        </div>

        {/* Version number */}
        <div className="flex justify-center items-center">
          <p className="text-xs text-gray-600">v{chrome?.runtime?.getManifest().version}</p>
        </div>
      </div>
    </div>
  );
}
