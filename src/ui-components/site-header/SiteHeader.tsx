/* eslint-disable react/jsx-props-no-spreading */
import React, { useEffect, useState, useCallback, MouseEvent } from "react";
import { Link as RouterLink } from "react-router-dom";
import PropTypes from "prop-types";
import classnames from "classnames";
import { FocusOn } from "react-focus-on";
import logoSrc from "@ecl/ec-preset-website/dist/images/logo/logo--en.svg";
import { MemoizedIcon } from "../icon/Icon";
import { MemoizedLink, Link, LinkProps } from "../link/Link";
import { Menu, MenuProps } from "../menu/Menu";

export interface SiteHeaderProps {
  siteName?: string;
  bannerTop?: string | LinkProps;
  banner?: string;
  logged?: boolean;
  loginToggle?: {
    labelNotLogged?: string;
    hrefNotLogged?: string;
    labelLogged?: string;
    hrefLogged?: string;
  };
  loginBox?: {
    id?: string;
    description?: string;
    label?: string;
    href?: string;
  };
  menu?: MenuProps;
  className?: string;
}

export const SiteHeader: React.FC<SiteHeaderProps> = ({
  siteName,
  bannerTop,
  banner,
  logged,
  loginToggle,
  loginBox,
  menu,
  className,
  ...props
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const classNames = classnames(className, "ecl-site-header-harmonised");

  const closeDropdown = useCallback(() => setIsDropdownOpen(false), []);

  const toggleDropdown = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      setIsDropdownOpen(!isDropdownOpen);
    },
    [isDropdownOpen]
  );

  const escFunction = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Esc") {
        closeDropdown();
      }
    },
    [closeDropdown]
  );

  useEffect(() => {
    document.addEventListener("keydown", escFunction, false);

    return () => {
      document.removeEventListener("keydown", escFunction, false);
    };
  }, [escFunction]);

  return (
    <header {...props} className={classNames}>
      <div className="ecl-site-header-harmonised__container ecl-container">
        <div className="ecl-site-header-harmonised__top">
          <RouterLink
            className="ecl-link ecl-link--standalone ecl-site-header-harmonised__logo-link"
            to="/"
            aria-label="EBSI Users Onboarding service"
          >
            <img
              alt="European Commission logo"
              title="European Commission"
              className="ecl-site-header-harmonised__logo-image"
              src={logoSrc}
            />
          </RouterLink>
          {!!(loginToggle && Object.keys(loginToggle).length >= 1) && (
            <div className="ecl-site-header-harmonised__action">
              {!!loginBox && (
                <div className="ecl-site-header-harmonised__login-container">
                  {logged && (
                    <FocusOn
                      enabled={isDropdownOpen}
                      onClickOutside={closeDropdown}
                      onEscapeKey={closeDropdown}
                      scrollLock={false}
                    >
                      <RouterLink
                        className="ecl-link ecl-link--standalone ecl-site-header-harmonised__login-toggle"
                        to={loginToggle.hrefLogged ?? ""}
                        data-ecl-login-toggle
                        aria-controls={loginBox.id}
                        aria-expanded={isDropdownOpen}
                        onClick={toggleDropdown}
                      >
                        <MemoizedIcon
                          shape="general--logged-in"
                          size="s"
                          className="ecl-site-header-harmonised__icon"
                        />
                        {loginToggle.labelLogged}
                        <MemoizedIcon
                          shape="ui--corner-arrow"
                          size="xs"
                          className="ecl-site-header-harmonised__login-arrow"
                        />
                      </RouterLink>
                      <div
                        id={loginBox.id}
                        className={classnames(
                          "ecl-site-header-harmonised__login-box",
                          {
                            "ecl-site-header-harmonised__login-box--active":
                              isDropdownOpen,
                          }
                        )}
                        data-ecl-login-box
                      >
                        {loginBox.description && (
                          <>
                            <p className="ecl-site-header-harmonised__login-description">
                              {loginBox.description}
                            </p>
                            <hr className="ecl-site-header-harmonised__login-separator" />
                          </>
                        )}
                        <MemoizedLink
                          label={loginBox.label}
                          to={loginBox.href ?? ""}
                          variant="standalone"
                          onClick={closeDropdown}
                        />
                      </div>
                    </FocusOn>
                  )}
                  {!logged && (
                    <RouterLink
                      className="ecl-link ecl-link--standalone ecl-site-header-harmonised__login-toggle"
                      to={loginToggle.hrefNotLogged ?? ""}
                    >
                      <MemoizedIcon
                        shape="general--log-in"
                        size="s"
                        className="ecl-site-header-harmonised__icon"
                      />
                      {loginToggle.labelNotLogged}
                    </RouterLink>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {bannerTop && (
        <div className="ecl-site-header-harmonised__banner-top">
          {typeof bannerTop === "object" && (
            <div className="ecl-container">
              <MemoizedLink {...bannerTop} variant="standalone" />
            </div>
          )}
          {typeof bannerTop === "string" && (
            <div className="ecl-container">{bannerTop}</div>
          )}
        </div>
      )}
      {siteName && (
        <div className="ecl-site-header-harmonised__site-name">{siteName}</div>
      )}
      {banner && (
        <div className="ecl-site-header-harmonised__banner">
          <div className="ecl-container">{banner}</div>
        </div>
      )}
      {!!(menu && Object.keys(menu).length >= 1) && <Menu {...menu} />}
    </header>
  );
};

SiteHeader.propTypes = {
  siteName: PropTypes.string,
  logged: PropTypes.bool,
  loginToggle: PropTypes.exact({
    labelNotLogged: PropTypes.string,
    hrefNotLogged: PropTypes.string,
    labelLogged: PropTypes.string,
    hrefLogged: PropTypes.string,
  }),
  loginBox: PropTypes.exact({
    id: PropTypes.string,
    description: PropTypes.string,
    label: PropTypes.string,
    href: PropTypes.string,
  }),
  bannerTop: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.exact(Link.propTypes),
  ]),
  banner: PropTypes.string,
  menu: PropTypes.exact(Menu.propTypes),
  className: PropTypes.string,
};

SiteHeader.defaultProps = {
  siteName: "",
  logged: false,
  loginToggle: {},
  loginBox: {},
  bannerTop: "",
  banner: "",
  menu: undefined,
  className: "",
};
