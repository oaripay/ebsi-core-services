/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import PropTypes, { ValidationMap } from "prop-types";
import classnames from "classnames";
import { MemoizedIcon, Icon, IconProps } from "../icon/Icon";

const buttonVariants = ["primary", "secondary", "call", "text"] as const;

export type ButtonVariant = (typeof buttonVariants)[number];

const buttonTypes = ["submit", "reset", "button"] as const;

export type ButtonType = (typeof buttonTypes)[number];

export interface ButtonProps {
  variant?: ButtonVariant;
  type?: ButtonType;
  disabled?: boolean;
  label?: string;
  icon?: IconProps;
  iconPosition?: string;
  className?: string;
  containerClassName?: string;
  [x: string]: unknown;
}

export const Button: React.FC<ButtonProps> = ({
  variant,
  type,
  disabled,
  label,
  icon,
  iconPosition,
  className,
  containerClassName,
  ...props
}) => {
  const classNames = classnames(className, "ecl-button", {
    [`ecl-button--${variant ?? ""}`]: variant,
  });

  const hasIcon = icon && icon.shape;

  const iconMarkup = hasIcon ? (
    <MemoizedIcon
      {...icon}
      data-ecl-icon
      className={classnames(icon?.className, "ecl-button__icon", {
        [`ecl-button__icon--${iconPosition ?? ""}`]: iconPosition,
      })}
    />
  ) : (
    ""
  );

  return (
    <button
      {...props}
      // eslint-disable-next-line react/button-has-type
      type={type}
      className={classNames}
      disabled={disabled ?? false}
    >
      {hasIcon ? (
        <span
          className={classnames(containerClassName, "ecl-button__container")}
        >
          {iconPosition === "before" && iconMarkup}
          <span className="ecl-button__label" data-ecl-label>
            {label}
          </span>
          {iconPosition === "after" && iconMarkup}
        </span>
      ) : (
        label
      )}
    </button>
  );
};

Button.propTypes = {
  variant: PropTypes.oneOf<ButtonVariant>(buttonVariants),
  type: PropTypes.oneOf<ButtonType>(buttonTypes),
  disabled: PropTypes.bool,
  label: PropTypes.string,
  icon: PropTypes.shape(Icon.propTypes as ValidationMap<IconProps>),
  iconPosition: PropTypes.string,
  className: PropTypes.string,
  containerClassName: PropTypes.string,
};

Button.defaultProps = {
  variant: "primary",
  type: "submit",
  disabled: false,
  label: "",
  icon: {},
  iconPosition: "after",
  className: "",
  containerClassName: "",
};

export const MemoizedButton = React.memo(Button);

export default MemoizedButton;
