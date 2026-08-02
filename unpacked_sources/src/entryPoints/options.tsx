/**
 * Options Entry Point: Renders the React UI for the extension's settings/options page.
 */
import Options from '@/components/options';
import renderRoot from '@/entryPoints/render/render-root.tsx';
import '@/entryPoints/main.css';

// Renders options.html
const element = document.getElementById('options-root')!;
renderRoot(element, <Options />);
