/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import PropTypes from "prop-types";
import classnames from "classnames";
import { MemoizedIcon } from "../icon/Icon";
import { MemoizedButton } from "../button/Button";

const messageVariants = ["error", "info", "success", "warning"] as const;

export type MessageVariant = typeof messageVariants[number];

export interface MessageProps {
  variant?: MessageVariant;
  title: React.ReactNode;
  description: React.ReactNode;
  closeable?: boolean;
  onClose?: () => void;
  className?: string;
}

export const Message: React.FC<MessageProps> = ({
  variant,
  title,
  description,
  closeable,
  onClose,
  className,
  ...props
}) => {
  const classNames = classnames(className, "ecl-message", {
    [`ecl-message--${variant ?? ""}`]: variant,
  });

  const icon = {
    shape: "",
    size: "l",
  };

  switch (variant) {
    case "error": {
      icon.shape = "notifications--error";
      break;
    }
    case "info": {
      icon.shape = "notifications--information";
      break;
    }
    case "success": {
      icon.shape = "notifications--success";
      break;
    }
    case "warning": {
      icon.shape = "notifications--warning";
      break;
    }
    default: {
      icon.shape = "notifications--information";
    }
  }

  return (
    <div {...props} role="alert" className={classNames} data-ecl-message>
      <MemoizedIcon {...icon} className="ecl-message__icon" />
      <div className="ecl-message__content">
        {closeable && (
          <MemoizedButton
            variant="text"
            type="button"
            className="ecl-message__close"
            onClick={onClose}
            label="Close"
            icon={{
              shape: "ui--close",
              size: "s",
            }}
          />
        )}
        <div className="ecl-message__title">{title}</div>
        <p className="ecl-message__description">{description}</p>
      </div>
    </div>
  );
};

Message.propTypes = {
  variant: PropTypes.oneOf(messageVariants),
  title: PropTypes.node.isRequired,
  description: PropTypes.node.isRequired,
  closeable: PropTypes.bool,
  onClose: PropTypes.func,
  className: PropTypes.string,
};

Message.defaultProps = {
  variant: "info",
  className: "",
  closeable: false,
  onClose: () => {},
};

export const MemoizedMessage = React.memo(Message);

export default MemoizedMessage;
