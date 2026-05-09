// Sign-in page footer hidden per request - render nothing.
import PropTypes from "prop-types";

function Footer() {
    return null;
}

Footer.defaultProps = { light: false, company: null, links: [] };
Footer.propTypes = {
    light: PropTypes.bool,
    company: PropTypes.objectOf(PropTypes.any),
    links: PropTypes.arrayOf(PropTypes.objectOf(PropTypes.any)),
};

export default Footer;
