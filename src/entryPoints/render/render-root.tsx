import { createRoot } from 'react-dom/client';

export default function renderRoot(element: HTMLElement, reactElement: React.ReactNode) {
  const root = createRoot(element);
  root.render(reactElement);
}
