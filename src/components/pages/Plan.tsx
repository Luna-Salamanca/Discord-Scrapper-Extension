import { useState, useEffect } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils';
import { getPlans, checkUserPlan, type Plan, isProPlan } from '@/lib/wk-api';
import { UserStore } from '@/store/user';
import { APP_ID } from '@/lib/constants.ts';

export default function PlanPage() {
  const [token, setToken] = useState('');
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const initTokenAndCheckPlan = async () => {
      try {
        // 1. First get token
        const userStore = new UserStore();
        const user = await userStore.get();
        setToken(user.token);

        // 2. If there is a token, check if user is PRO
        if (user.token) {
          const planResult = await checkUserPlan({
            token: user.token,
            app_id: APP_ID,
          });

          if (planResult.success && planResult.data) {
            const isProUser = isProPlan(planResult.data.plan);
            setIsPro(isProUser);

            // 3. If not PRO, get plans list
            if (!isProUser) {
              const plansResult = await getPlans({ id: APP_ID });
              if (
                plansResult.success &&
                plansResult.data &&
                plansResult.data.plans &&
                Array.isArray(plansResult.data.plans)
              ) {
                setPlans(plansResult.data.plans);
              } else {
                setError(plansResult.error || 'Failed to fetch plans');
              }
            }
          } else {
            // If checking plan fails, show plans list by default
            setIsPro(false);
            const plansResult = await getPlans({ id: APP_ID });
            if (
              plansResult.success &&
              plansResult.data &&
              plansResult.data.plans &&
              Array.isArray(plansResult.data.plans)
            ) {
              setPlans(plansResult.data.plans);
            } else {
              setError(plansResult.error || 'Failed to fetch plans');
            }
          }
        }
      } catch (err) {
        console.error('[Plan] Failed to initialize:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      } finally {
        setIsLoading(false);
      }
    };

    initTokenAndCheckPlan();
  }, []);

  const handleTryNow = (planId: number) => {
    console.log('Try now clicked for plan:', planId);
    // Payment logic can be added here
    if (chrome?.runtime?.id) {
      chrome.tabs.create({
        url: `https://bot.wkeasy.com/checkout?planId=${planId}`,
      });
    }
  };

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy token:', err);
    }
  };

  // Format price
  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

  // Format original price
  const formatOriginalPrice = (price: number, month: number): string => {
    if (month === 1) {
      return `${formatPrice(price)}/month`;
    } else if (month === 3) {
      return `${formatPrice(price)}/quarterly`;
    } else if (month === 12) {
      return `${formatPrice(price)}/yearly`;
    }
    return `${formatPrice(price)}/${month} months`;
  };

  // Format billing info
  const formatBilling = (price: number, month: number): string => {
    return `${formatPrice(price)} billed ${month} ${month === 1 ? 'month' : 'months'}`;
  };

  return (
    <div className="flex flex-col gap-2 p-4">
      {/* Token area */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
        <span className="text-xs font-medium">Token:</span>
        <span className="text-xs text-green-600 font-mono flex-1 truncate">{token}</span>
        <Button size="sm" variant="outline" className="text-xs" onClick={handleCopyToken}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      {/* Feature comparison table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-1.5 text-left font-semibold">Features</th>
              <th className="px-3 py-1.5 text-center font-semibold">Free</th>
              <th className="px-3 py-1.5 text-center font-semibold">
                Pro <span className="text-yellow-500">◆</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-200">
              <td className="px-3 py-1.5">Maximum number of users extracted</td>
              <td className="px-3 py-1.5 text-center">100</td>
              <td className="px-3 py-1.5 text-center text-red-600 font-semibold">Unlimited</td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="px-3 py-1.5">Export discord members list</td>
              <td className="px-3 py-1.5 text-center">
                <Check size={14} className="text-green-600 mx-auto" />
              </td>
              <td className="px-3 py-1.5 text-center">
                <Check size={14} className="text-green-600 mx-auto" />
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="px-3 py-1.5">Save as CSV/Excel/JSON</td>
              <td className="px-3 py-1.5 text-center">
                <Check size={14} className="text-green-600 mx-auto" />
              </td>
              <td className="px-3 py-1.5 text-center">
                <Check size={14} className="text-green-600 mx-auto" />
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="px-3 py-1.5">Continued free updates</td>
              <td className="px-3 py-1.5 text-center">
                <Check size={14} className="text-green-600 mx-auto" />
              </td>
              <td className="px-3 py-1.5 text-center">
                <Check size={14} className="text-green-600 mx-auto" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-gray-400" />
          <span className="ml-2 text-xs text-gray-600">Loading plans...</span>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-300 rounded-lg">
          <div className="flex-shrink-0">
            <AlertCircle size={16} className="text-red-600" />
          </div>
          <span className="text-xs font-medium text-red-600">{error}</span>
        </div>
      )}

      {/* PRO user prompt */}
      {isPro === true && (
        <div className="p-3 bg-green-50 border border-green-300 rounded-lg">
          <span className="text-sm font-semibold text-green-700">You are PRO</span>
        </div>
      )}

      {/* Pricing plans - only show when not a PRO user */}
      {!isLoading && !error && isPro === false && (
        <>
          {/* Remind you to pay message */}
          {/* <div className="flex gap-3 bg-blue-50 rounded-lg p-1">
            <span className="text-yellow-300">🏷️</span>
            <p className="text-xm text-start text-gray-700 w-full">
              Please pay to{' '}
              <a href="#" className="text-blue-600 underline hover:text-blue-700">
                muepoints@gmail.com
              </a>{' '}
              by Paypal and leave your token in notes.
            </p>
          </div> */}

          <div className="grid grid-cols-3 gap-3">
            {plans.length === 0 ? (
              <div className="col-span-3 text-center py-6 text-gray-500 text-xs">No plans available</div>
            ) : (
              plans.map((plan) => (
                <div
                  key={plan.id}
                  className={cn(
                    'border rounded-lg p-4 flex flex-col relative bg-white shadow-sm',
                    plan.popular ? 'border-yellow-400 border-2 shadow-md' : 'border-gray-200',
                  )}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-medium">
                      Popular
                    </div>
                  )}
                  <h3 className="text-xm mb-3 mt-1">{plan.name}</h3>
                  <div className="flex flex-col gap-1 mb-4 text-center">
                    <div className="text-xs text-gray-400 line-through">
                      {formatOriginalPrice(plan.price_original, plan.month)}
                    </div>
                    <div className="mt-1 text-gray-900 flex items-baseline justify-center gap-0">
                      <span className="text-gray-400 text-xm">$</span>
                      <span className="text-2xl text-gray-900">{Math.floor(plan.price_per_month)}</span>
                      <span className="text-gray-500 text-sm">
                        .
                        {Math.round((plan.price_per_month % 1) * 100)
                          .toString()
                          .padStart(2, '0')}
                        /mo
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400">{formatBilling(plan.price, plan.month)}</div>
                  </div>
                  <Button
                    size="sm"
                    className="mt-auto bg-red-600 hover:bg-red-700 text-white text-xs py-2 w-full font-medium"
                    onClick={() => handleTryNow(plan.id)}
                  >
                    Try it now
                  </Button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
