import React from "react";
import { Navigate } from "react-router-dom";

// Composant PrivateRoute pour protéger les routes sensibles
const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem("token");

    // Si le token est présent, afficher la page demandée
    if (token) {
        return children;
    } else {
        // Sinon, rediriger vers la page de connexion
        return <Navigate to="/login" />;
    }
};

export default PrivateRoute;
