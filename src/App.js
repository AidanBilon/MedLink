import React from "react";
import { Router, Route, Switch } from "react-router-dom";
import { Container } from "reactstrap";

import Loading from "./components/Loading";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import Home from "./views/Home";
import Profile from "./views/Profile";
import ExternalApi from "./views/ExternalApi";
import HealthTips from "./views/HealthTips";
import { useAuth0 } from "@auth0/auth0-react";
import history from "./utils/history";
import { AppointmentsProvider } from "./utils/AppointmentsContext";

// styles
import "./App.css";

// fontawesome
import initFontAwesome from "./utils/initFontAwesome";
initFontAwesome();

const App = () => {
  const { isLoading, error } = useAuth0();

  if (error) {
    return <div>Oops... {error.message}</div>;
  }

  if (isLoading) {
    return <Loading />;
  }

  return (
    <AppointmentsProvider>
      <Router history={history}>
        <div id="app" className="d-flex flex-column h-100">
          <NavBar />
          <div className="flex-grow-1">
            <Switch>
              <Route path="/" exact component={Home} />
              <Route
                path="/profile"
                render={() => (
                  <Container className="mt-5">
                    <Profile />
                  </Container>
                )}
              />
              <Route
                path="/calendar"
                render={() => (
                  <Container className="mt-5">
                    <ExternalApi />
                  </Container>
                )}
              />
              <Route
                path="/health-tips"
                render={() => (
                  <Container className="mt-5">
                    <HealthTips />
                  </Container>
                )}
              />
            </Switch>
          </div>
          <Footer />
        </div>
      </Router>
    </AppointmentsProvider>
  );
};

export default App;
