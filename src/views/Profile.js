import React from "react";
import { Container, Row, Col } from "reactstrap";

import AccountForm from "../components/AccountForm";
import Loading from "../components/Loading";
import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import { loadProfile } from "../utils/profileStore";

export const ProfileComponent = () => {
  const { user } = useAuth0();
  const saved = user?.sub ? loadProfile(user.sub) : null;
  const pictureSrc = saved?.profilePicture || user?.picture;

  return (
    <Container className="mb-5">
      <Row className="align-items-center profile-header mb-5 text-center text-md-left">
        <Col md={2}>
          <img
            src={pictureSrc}
            alt="Profile"
            className="rounded-circle img-fluid profile-picture mb-3 mb-md-0"
          />
        </Col>
        <Col md>
          <h2>{user.name}</h2>
          <p className="lead text-muted">{user.email}</p>
        </Col>
      </Row>
      <Row className="mb-5">
        <Col>
          <AccountForm />
        </Col>
      </Row>
    </Container>
  );
};

export default withAuthenticationRequired(ProfileComponent, {
  onRedirecting: () => <Loading />,
});
