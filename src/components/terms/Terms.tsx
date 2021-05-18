/* eslint-disable jsx-a11y/label-has-associated-control */
import React from "react";
import { Link } from "react-router-dom";
import icons from "@ecl/ec-preset-website/dist/images/icons/sprites/icons.svg";

type Props = {
  isTermsSelected: boolean;
  setTermsSelected: (arg0: boolean) => void;
};

export const Terms: React.FunctionComponent<Props> = ({
  setTermsSelected,
  isTermsSelected,
}: Props) => {
  const onSubmit = () => {
    setTermsSelected(!isTermsSelected);
  };

  return (
    <article className="ecl-card ecl-card--tile">
      <header className="ecl-card__header">
        <h1 className="ecl-card__title">Terms and Conditions</h1>
      </header>
      <div className="ecl-card__body">
        <div className="ecl-card__description">
          Find more information by{" "}
          <Link to="/terms" className="ecl-link">
            clicking here
          </Link>
          .
        </div>
        <form>
          <div className="ecl-form-group">
            <input
              type="checkbox"
              className="ecl-checkbox__input"
              id="terms"
              name="terms"
              onChange={onSubmit}
            />
            <label
              htmlFor="terms"
              className="ecl-form-label ecl-checkbox__label"
            >
              <span className="ecl-checkbox__box">
                <svg
                  focusable="false"
                  aria-hidden="true"
                  className="ecl-checkbox__icon ecl-icon ecl-icon--s"
                >
                  <use xlinkHref={`${icons}#ui--check`} />
                </svg>
              </span>
              I agree to the Terms and Conditions
            </label>
          </div>
        </form>
      </div>
      <footer className="ecl-card__footer" />
    </article>
  );
};

export default Terms;
