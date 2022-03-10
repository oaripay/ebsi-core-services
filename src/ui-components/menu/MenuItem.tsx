import React from "react";
import { Link as RouterLink, useMatch } from "react-router-dom";
import PropTypes from "prop-types";
import classnames from "classnames";

export interface MenuItemProps {
  href: string;
  label?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
}

export const MenuItem: React.FC<MenuItemProps> = ({ label, href, onClick }) => {
  const isCurrent = !!useMatch(href);

  return (
    <li
      className={classnames("ecl-menu__item", {
        "ecl-menu__item--current": isCurrent,
      })}
      data-ecl-menu-item
    >
      <RouterLink
        to={href ?? ""}
        className={classnames("ecl-menu__link", {
          "ecl-menu__link--current": isCurrent,
        })}
        data-ecl-menu-link
        onClick={onClick}
      >
        {label}
      </RouterLink>
    </li>
  );
};

MenuItem.propTypes = {
  href: PropTypes.string.isRequired,
  label: PropTypes.string,
  onClick: PropTypes.func,
};

MenuItem.defaultProps = {
  label: "",
  onClick: () => {},
};

export const MemoizedMenuItem = React.memo(MenuItem);

export default MemoizedMenuItem;
