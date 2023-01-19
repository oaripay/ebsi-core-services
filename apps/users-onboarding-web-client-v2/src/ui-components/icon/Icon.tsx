/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import PropTypes from "prop-types";
import classnames from "classnames";
import defaultSprite from "@ecl/ec-preset-website/dist/images/icons/sprites/icons.svg";

const iconSizes = ["fluid", "xs", "s", "m", "l", "xl", "2xl"];

export type IconSize = (typeof iconSizes)[number];

const iconColors = ["", "inverted", "primary"];

export type IconColor = (typeof iconColors)[number];

export interface IconProps {
  className?: string;
  color?: IconColor;
  desc?: string;
  descId?: string;
  iconPath?: string;
  shape?: string;
  size?: IconSize;
  title?: string;
  titleId?: string;
  transform?: string;
}

export const Icon: React.FC<IconProps> = ({
  className,
  color,
  desc,
  descId,
  iconPath,
  shape,
  size,
  title,
  titleId,
  transform,
  ...props
}) => {
  const classNames = classnames(className, "ecl-icon", {
    [`ecl-icon--${size ?? ""}`]: size,
    [`ecl-icon--${color ?? ""}`]: color,
    [`ecl-icon--${transform ?? ""}`]: transform,
  });

  let labelledBy = "";
  if ((title && titleId) || (desc && descId)) {
    labelledBy = `${titleId ?? ""} ${descId ?? ""}`;
  }

  return (
    <svg
      focusable="false"
      aria-hidden="true"
      {...(labelledBy && { "aria-labelledby": labelledBy })}
      {...props}
      className={classNames}
    >
      {title && <title {...(titleId && { id: titleId })}>{title}</title>}
      {desc && <desc {...(descId && { id: descId })}>{desc}</desc>}
      <use xlinkHref={`${iconPath ?? ""}#${shape ?? ""}`} />
    </svg>
  );
};

export const iconPropTypes: React.WeakValidationMap<IconProps> = {
  className: PropTypes.string,
  color: PropTypes.oneOf<IconColor>(iconColors),
  desc: PropTypes.string,
  descId: PropTypes.string,
  iconPath: PropTypes.string,
  shape: PropTypes.string,
  size: PropTypes.oneOf<IconSize>(iconSizes),
  title: PropTypes.string,
  titleId: PropTypes.string,
  transform: PropTypes.string,
};

Icon.propTypes = iconPropTypes;

Icon.defaultProps = {
  className: "",
  color: "",
  desc: "",
  descId: "",
  iconPath: defaultSprite,
  shape: "",
  size: "m",
  title: "",
  titleId: "",
  transform: "",
};

export const MemoizedIcon = React.memo(Icon);

export default MemoizedIcon;
