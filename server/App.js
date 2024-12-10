import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AuthPage from './components/LoginForm';

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<AuthPage />} />
                <Route path="/microsoft-callback" element={<AuthPage />} /> {/* Gérer le callback */}
                <Route path="/github-callback" element={<AuthPage />} />
            </Routes>
        </Router>
    );
};

export default App;
