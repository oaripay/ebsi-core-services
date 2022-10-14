import React from "react";
import PropTypes from "prop-types";
import classnames from "classnames";
import { MemoizedLink } from "../link/Link";

export interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className }) => (
  <footer
    className={classnames(
      className,
      "ecl-footer-harmonised ecl-footer-harmonised--group1"
    )}
  >
    <div className="ecl-container ecl-footer-harmonised__container">
      <section className="ecl-footer-harmonised__section ecl-footer-harmonised__section1">
        <MemoizedLink
          to="/"
          variant="standalone"
          className="ecl-footer-harmonised__title"
          aria-label="EBSI Users Onboarding service"
          label="EBSI Users Onboarding service"
        />
        <div className="ecl-footer-harmonised__description">
          This site is managed by the European Blockchain Service
          Infrastructure.
        </div>
      </section>
      <div className="ecl-footer-harmonised__section2">
        <section className="ecl-footer-harmonised__section">
          <div className="ecl-footer-harmonised__title ecl-footer-harmonised__title--separator">
            Contact us
          </div>
          <ul className="ecl-footer-harmonised__list">
            <li className="ecl-footer-harmonised__list-item">
              <a
                href="https://ec.europa.eu/info/about-european-commission/contact_en"
                className="ecl-footer-harmonised__link ecl-link ecl-link--standalone"
                aria-label="Link to Contact the European Commission"
              >
                Contact the European Commission
              </a>
            </li>
            <li className="ecl-footer-harmonised__list-item">
              <a
                href="https://europa.eu/european-union/contact/social-networks_en#n:+i:4+e:1+t:+s"
                className="ecl-footer-harmonised__link ecl-link ecl-link--standalone"
                aria-label="Link to Follow the European Commission on social media"
              >
                Follow the European Commission on social media
              </a>
            </li>
            <li className="ecl-footer-harmonised__list-item">
              <a
                href="https://ec.europa.eu/info/resources-partners_en"
                className="ecl-footer-harmonised__link ecl-link ecl-link--standalone"
                aria-label="Link to Resources for partners"
              >
                Resources for partners
              </a>
            </li>
          </ul>
        </section>
      </div>
      <div className="ecl-footer-harmonised__section3">
        <section className="ecl-footer-harmonised__section">
          <div className="ecl-footer-harmonised__title ecl-footer-harmonised__title--separator">
            Other Links
          </div>
          <ul className="ecl-footer-harmonised__list">
            <li className="ecl-footer-harmonised__list-item">
              <a
                href="https://ec.europa.eu/info/language-policy_en"
                className="ecl-footer-harmonised__link ecl-link ecl-link--standalone"
                aria-label="Link to Language policy"
              >
                Language policy
              </a>
            </li>
            <li className="ecl-footer-harmonised__list-item">
              <a
                href="https://ec.europa.eu/info/cookies_en"
                className="ecl-footer-harmonised__link ecl-link ecl-link--standalone"
                aria-label="Link to Cookies"
              >
                Cookies
              </a>
            </li>
            <li className="ecl-footer-harmonised__list-item">
              <a
                href="https://ec.europa.eu/info/privacy-policy_en"
                className="ecl-footer-harmonised__link ecl-link ecl-link--standalone"
                aria-label="Link to Privacy policy"
              >
                Privacy policy
              </a>
            </li>
            <li className="ecl-footer-harmonised__list-item">
              <a
                href="https://ec.europa.eu/info/legal-notice_en"
                className="ecl-footer-harmonised__link ecl-link ecl-link--standalone"
                aria-label="Link to Legal notice"
              >
                Legal notice
              </a>
            </li>
          </ul>
        </section>
      </div>
      <section className="ecl-footer-harmonised__section ecl-footer-harmonised__section7">
        <a
          href="https://ec.europa.eu/info/index_en"
          className="ecl-footer-harmonised__title ecl-link ecl-link--standalone"
        >
          European Commission
        </a>
      </section>
    </div>
  </footer>
);

Footer.propTypes = {
  className: PropTypes.string,
};

Footer.defaultProps = {
  className: "",
};

export default Footer;
