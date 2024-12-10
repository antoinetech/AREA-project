import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "./App.css";
import LoginForm from "./components/LoginForm";
import Register from "./components/Register";
import ProfilePage from "./components/ProfilePage";
import CreateBlueprint from "./components/CreateBlueprint";
import CreateArea from "./components/create_area";
import PrivateRoute from "./components/PrivateRoute";
import Information from "./components/information";

// Importer i18n pour initialiser la configuration
import './i18n';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LoginForm />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<Register />} />

          {/* Routes protégées */}
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/information"
            element={
              <PrivateRoute>
                <Information />
              </PrivateRoute>
            }
          />
          <Route
            path="/Homepage"
            element={
              <PrivateRoute>
                <CreateBlueprint />
              </PrivateRoute>
            }
          />
          <Route
            path="/create-area"
            element={
              <PrivateRoute>
                <CreateArea />
              </PrivateRoute>
            }
          />

          {/* Routes pour les callbacks (pas protégées) */}
          <Route path="/microsoft-callback" element={<ProfilePage />} />
          <Route path="/github-callback" element={<ProfilePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
