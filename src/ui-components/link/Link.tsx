/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import {
  Link as RouterLink,
  LinkProps as RouterLinkProps,
} from "react-router-dom";
import PropTypes from "prop-types";
import classnames from "classnames";
import { MemoizedIcon, IconProps, iconPropTypes } from "../icon/Icon";

const linkIconPositions = ["before", "after"] as const;
const linkIconDefaultPosition = "after";
export type LinkIconPosition = typeof linkIconPositions[number];

const linkVariants = ["default", "standalone"] as const;
export type LinkVariant = typeof linkVariants[number];

export interface LinkProps extends RouterLinkProps {
  variant?: LinkVariant;
  label?: string;
  ariaLabel?: string;
  icon?: IconProps | IconProps[];
  iconPosition?: LinkIconPosition;
  className?: string;
  onClick?: () => unknown;
}

export const Link: React.FC<LinkProps> = ({
  variant,
  // eslint-disable-next-line react/prop-types
  to,
  label,
  ariaLabel,
  icon,
  iconPosition,
  className,
  ...props
}) => {
  let iconMarkup: React.ReactNode = "";
  if (Array.isArray(icon)) {
    if (icon.length > 0) {
      iconMarkup = icon.map((i) => (
        <MemoizedIcon
          {...i}
          className={classnames(i.className, "ecl-link__icon")}
        />
      ));
    }
  } else if (icon && icon.shape) {
    iconMarkup = (
      <MemoizedIcon
        {...icon}
        className={classnames(icon.className, "ecl-link__icon")}
      />
    );
  }

  const classNames = classnames(className, "ecl-link", {
    [`ecl-link--${variant ?? ""}`]: variant,
    [`ecl-link--icon ecl-link--icon-${
      iconPosition ?? linkIconDefaultPosition
    }`]: iconMarkup,
  });

  if (iconMarkup) {
    if (iconPosition === "before") {
      return (
        <RouterLink
          {...props}
          to={to as unknown}
          className={classNames}
          {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
        >
          {iconMarkup}
          &nbsp;
          <span className="ecl-link__label">{label}</span>
        </RouterLink>
      );
    }

    return (
      <RouterLink
        {...props}
        to={to as unknown}
        className={classNames}
        {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
      >
        <span className="ecl-link__label">{label}</span>
        &nbsp;
        {iconMarkup}
      </RouterLink>
    );
  }

  return (
    <RouterLink
      {...props}
      to={to as unknown}
      className={classNames}
      {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
    >
      {label}
    </RouterLink>
  );
};

Link.propTypes = {
  variant: PropTypes.oneOf<LinkVariant>(linkVariants),
  label: PropTypes.string,
  ariaLabel: PropTypes.string,
  icon: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.exact(iconPropTypes).isRequired),
    PropTypes.exact(iconPropTypes),
  ]),
  iconPosition: PropTypes.oneOf<LinkIconPosition>(linkIconPositions),
  className: PropTypes.string,
};

Link.defaultProps = {
  variant: "default",
  label: "",
  ariaLabel: "",
  icon: {},
  iconPosition: linkIconDefaultPosition,
  className: "",
};

export const MemoizedLink = React.memo(Link);

export default MemoizedLink;
