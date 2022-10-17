/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import PropTypes from "prop-types";
import classnames from "classnames";

export interface PageHeaderProps {
  meta?: string;
  title?: string;
  description?: string;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  meta,
  title,
  description,
  className,
  ...props
}) => {
  const classNames = classnames(className, "ecl-page-header-harmonised");

  return (
    <div {...props} className={classNames}>
      <div className="ecl-container">
        {meta && <div className="ecl-page-header-harmonised__meta">{meta}</div>}
        {title && (
          <h1 className="ecl-page-header-harmonised__title">{title}</h1>
        )}
        {description && (
          <p className="ecl-page-header-harmonised__description">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

PageHeader.propTypes = {
  meta: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string,
  className: PropTypes.string,
};

PageHeader.defaultProps = {
  meta: "",
  title: "",
  description: "",
  className: "",
};

export default PageHeader;
