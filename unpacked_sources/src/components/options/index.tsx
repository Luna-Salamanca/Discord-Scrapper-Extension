import './options.css';
import { MessageCircleMore, Palette, Settings } from 'lucide-react';
import { Command, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command.tsx';
import { useState } from 'react';

import CardSwitch from '@/components/ui/card-switch.tsx';
import Card from '@/components/ui/card.tsx';
import { useSettings } from '@/hooks/useSettings.tsx';
import iconDark from '@/assets/images/icon-dark.png';
import iconLight from '@/assets/images/icon-light.png';
import SafeImage from '@/components/ui/safe-image.tsx';

type MenuItemTypes = 'General' | 'Appearance' | 'Contact';

export default function Options() {
  const { settings, setSettings } = useSettings();
  const [currentMenu, setCurrentMenu] = useState<MenuItemTypes>('General');
  const menuItemClass = 'text-sm py-2 px-3 rounded-xl font-normal mt-2 cursor-pointer';

  function handleMenuClick(value: unknown) {
    setCurrentMenu(value as MenuItemTypes);
  }

  return (
    <div className="w-full h-svh flex flex-col bg-background tforeground">
      <div className="flex w-[896px] h-full m-auto">
        <div className="w-full flex flex-col px-2">
          {/* HEADER */}
          <div className="flex flex-row justify-between py-7">
            <div className="flex flex-row items-center">
              <SafeImage className="pl-3" width={45} src={settings.theme === 'dark' ? iconLight : iconDark} />
              <p className={`tcenter t2xl ml-2 font-black ${settings.theme === 'dark' ? 'twhite' : 'tblack'}`}>
                Extension
              </p>
            </div>
          </div>

          {/* CONTENT */}
          <div className="flex flex-row flex-1">
            {/* LEFT MENU */}
            <div className="flex w-56">
              <Command value={currentMenu}>
                <CommandList>
                  <CommandItem className={menuItemClass} value="General" onSelect={handleMenuClick}>
                    <Settings /> <span>General</span>
                  </CommandItem>
                  <CommandItem className={menuItemClass} value="Appearance" onSelect={handleMenuClick}>
                    <Palette /> <span>Appearance</span>
                  </CommandItem>
                  <CommandSeparator className="my-3" />
                  <CommandItem className={menuItemClass} value="Contact" onSelect={handleMenuClick}>
                    <MessageCircleMore /> <span>Contact Us</span>
                  </CommandItem>
                </CommandList>
              </Command>
            </div>

            {/* RIGHT CONTENT */}
            <div className="flex flex-col flex-1 pl-9 pr-3 pt-2">
              <div className="flex flex-col gap-3">
                {currentMenu === 'General' && (
                  <>
                    <CardSwitch
                      title={'Hide Floating Button'}
                      checked={settings.hide_sidebar_button}
                      onChecked={() => setSettings({ hide_sidebar_button: !settings.hide_sidebar_button })}
                      subtitle={'Hide Floating Button in all content page.'}
                    />
                  </>
                )}
                {currentMenu === 'Appearance' && (
                  <>
                    <CardSwitch
                      title={'Dark Mode'}
                      checked={settings.theme === 'dark'}
                      onChecked={(checked) => setSettings({ theme: checked ? 'dark' : 'light' })}
                      subtitle={'Switch between dark mode applied to all extension modules.'}
                    />
                  </>
                )}
                {currentMenu === 'Contact' && (
                  <>
                    <Card title="Catact Us">
                      <p className="text-xs pt-4">Contact us on</p>
                    </Card>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex flex-col justify-center w-full items-center pt-4 pb-14">
            <p className="text-xs">Made with ❤️ by Ahmed Dinar</p>
            <p className="text-xs">Version {chrome?.runtime?.getManifest().version}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
