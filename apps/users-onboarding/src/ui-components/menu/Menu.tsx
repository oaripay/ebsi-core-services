import React, { useState, useCallback, useEffect, MouseEvent } from "react";
import { useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import classnames from "classnames";
import { FocusOn } from "react-focus-on";
import { useWindowWidth } from "@react-hook/window-size";
import { MemoizedButton } from "../button/Button";
import { MemoizedIcon } from "../icon/Icon";
import { MemoizedMenuItem, MenuItem, MenuItemProps } from "./MenuItem";

// TODO (later, not important):
// Swipe? https://www.npmjs.com/package/react-swipeable
// Animations?

export interface MenuProps {
  siteName: string;
  close: string;
  title: string;
  items: MenuItemProps[];
  menuLink?: string;
  className?: string;
}

export const Menu: React.FC<MenuProps> = ({
  siteName,
  menuLink,
  close,
  title,
  items,
  className,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const windowWidth = useWindowWidth({
    wait: 300,
  });

  // Close menu on location change
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const classNames = classnames(className, "ecl-menu");

  const closeMenu = useCallback(() => setIsOpen(false), []);

  const handleClickOnOpen = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setIsOpen(true);
  }, []);

  const handleClickOnClose = useCallback((e: Event) => {
    e.preventDefault();
    setIsOpen(false);
  }, []);

  const isMobile = windowWidth < 996;
  const isMobileMenuDisplayed = isMobile && isOpen;

  return (
    <nav
      {...props}
      className={classNames}
      {...(isMobileMenuDisplayed && {
        "aria-expanded": true,
      })}
    >
      <div className="ecl-menu__overlay" />
      <div className="ecl-container ecl-menu__container">
        {items.length > 0 && (
          <a
            className="ecl-link ecl-link--standalone ecl-menu__open"
            href={menuLink}
            onClick={handleClickOnOpen}
          >
            <MemoizedIcon shape="general--hamburger" size="s" />
            {title}
          </a>
        )}
        {siteName && <div className="ecl-menu__site-name">{siteName}</div>}
        <FocusOn
          enabled={isMobileMenuDisplayed}
          onClickOutside={closeMenu}
          onEscapeKey={closeMenu}
        >
          <section
            className="ecl-menu__inner"
            aria-hidden={isMobile && !isMobileMenuDisplayed}
          >
            <header className="ecl-menu__inner-header">
              <MemoizedButton
                className="ecl-menu__close"
                containerClassName="ecl-menu__close-container"
                label={close}
                icon={{
                  shape: "ui--close-filled",
                  size: "s",
                }}
                iconPosition="before"
                variant="text"
                onClick={handleClickOnClose}
              />
              <div className="ecl-menu__title">{title}</div>
            </header>
            <ul className="ecl-menu__list">
              {items.map((item) => (
                <MemoizedMenuItem {...item} key={item.label} />
              ))}
            </ul>
          </section>
        </FocusOn>
      </div>
    </nav>
  );
};

Menu.propTypes = {
  siteName: PropTypes.string.isRequired,
  close: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.exact(MenuItem.propTypes)).isRequired,
  menuLink: PropTypes.string,
  className: PropTypes.string,
};

Menu.defaultProps = {
  menuLink: "",
  className: "",
};

export default Menu;
