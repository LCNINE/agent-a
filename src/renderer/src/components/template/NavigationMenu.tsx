import React from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  NavigationMenu as NavigationMenuBase,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "../ui/navigation-menu";
import { HomeIcon } from "lucide-react";
import ToggleTheme from "../ToggleTheme";
import UserMenu from "../UserMenu";
import LangMenu from "../LangMenu";

export default function NavigationMenu() {
  const { t } = useTranslation();

  return (
    <div className="w-full px-2 flex flex-row justify-between items-center">
      <NavigationMenuBase className="font-spoqa text-muted-foreground">
        <NavigationMenuList>
          <NavigationMenuItem>
            <Link to="/">
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                <HomeIcon className="w-5 h-5"/>
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link to="/work">
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                {t("nav.workPage")}
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link to="/config">
              <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                {t("nav.configPage")}
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenuBase>    

      <div className="space-x-2">
        <ToggleTheme />
        <LangMenu />
        <UserMenu />
      </div>  
    </div>
  );
}
