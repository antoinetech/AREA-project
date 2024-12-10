import React, { useState, useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Spinner from "./Spinner";
import '../index.css';
import epitechLogo from '../assets/epitech.png';
import { Typography, Layout, Spin, message } from 'antd';
import { useNavigate } from "react-router-dom";
import googleLogo from '../assets/google.png';
import axios from "axios";

const { Title } = Typography;
const { Content } = Layout;

function LoginForm() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkUserSession = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await axios.get(
              `${process.env.REACT_APP_URL_SERVER}/userRoutes/user-informations/user-logged`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
          );
          setUser(response.data);
          navigate("/Homepage");
        } catch (error) {
          console.error("Erreur lors de la récupération des informations utilisateur:", error);
          localStorage.removeItem("token");
        }
      }
      setIsLoading(false);
    };

    const handleGoogleToken = async () => {
      const queryParams = new URLSearchParams(window.location.search);
      const googleToken = queryParams.get("token");

      if (googleToken) {
        localStorage.setItem("token", googleToken);
        try {
          const response = await axios.get(
              `${process.env.REACT_APP_URL_SERVER}/userRoutes/user-informations/user-logged`,
              {
                headers: { Authorization: `Bearer ${googleToken}` },
              }
          );
          setUser(response.data);
          
          // Détermine la redirection en fonction de `redirectUrl`
          const redirectUrl = queryParams.get("redirectUrl") || "/Homepage";
          navigate(redirectUrl);

          // Nettoie l'URL pour supprimer le token et redirectUrl
          window.history.replaceState({}, document.title, "/");
        } catch (error) {
          console.error("Erreur lors de la récupération des informations utilisateur:", error);
          localStorage.removeItem("token");
        }
      }
    };

    checkUserSession();
    handleGoogleToken();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      navigate("/Homepage");
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(
          `${process.env.REACT_APP_URL_SERVER}/userRoutes/user-connection/logout`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
      );
      localStorage.removeItem("token");
      setUser(null);
      message.success("Déconnexion réussie");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      message.error("Erreur lors de la déconnexion");
    }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = `${process.env.REACT_APP_URL_STK}/login`; // Redirection vers /login
    window.location.href = `${process.env.REACT_APP_URL_SERVER}/userRoutes/user-connection/google-login?redirectUrl=${redirectUrl}`;
  };

  const onFinish = async (values) => {
    try {
      const response = await axios.post(
          `${process.env.REACT_APP_URL_SERVER}/userRoutes/user-connection/login`,
          values
      );
      if (response.data.success) {
        localStorage.setItem("token", response.data.token);
        const userResponse = await axios.get(
            `${process.env.REACT_APP_URL_SERVER}/userRoutes/user-informations/user-logged`,
            {
              headers: { Authorization: `Bearer ${response.data.token}` },
            }
        );
        setUser(userResponse.data);
        navigate("/Homepage");
      } else {
        message.error("Identifiants incorrects.");
      }
    } catch (error) {
      console.error("Erreur lors de la requête à l'API:", error);
      message.error("Une erreur est survenue. Veuillez réessayer plus tard.");
    }
  };

  if (isLoading) {
    return (
        <Layout style={{ minHeight: "100vh" }}>
          <Content
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
          >
            <Spin size="large" />
          </Content>
        </Layout>
    );
  }

  const validationSchema = Yup.object({
    email: Yup.string().email('Invalid email address').required('Required'),
    password: Yup.string().min(6, 'Password should be 6 characters minimum').required('Required'),
  });

  return (
      <Layout>
        <Content>
          <div className="min-h-screen overflow-auto w-full bg-slate-900 flex flex-col items-center justify-center">
            <img src={epitechLogo} alt="Epitech Logo" className="mt-10 w-64 h-20 mb-4" />
            {user ? (
                <div>Redirection vers /Homepage...</div>
            ) : (
                <div className="flex flex-col items-center justify-center w-full max-w-md mt-10">
                  <Formik
                      initialValues={{ email: "", password: "" }}
                      validationSchema={validationSchema}
                      onSubmit={onFinish}
                  >
                    {({ isSubmitting }) => (
                        <Form className="bg-indigo-300 p-8 rounded shadow-md w-full">
                          <h2 className="text-2xl bg-indigo-300 font-bold mb-6">Connexion</h2>
                          <div className="mb-4">
                            <label htmlFor="email" className="block text-gray-700 mb-2">
                              Email
                            </label>
                            <Field
                                type="email"
                                id="email"
                                name="email"
                                className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                aria-required="true"
                            />
                            <ErrorMessage name="email" component="div" className="text-red-600 text-sm mt-2" />
                          </div>
                          <div className="mb-4 relative">
                            <label htmlFor="password" className="block text-gray-700 mb-2">
                              Mot de passe
                            </label>
                            <div className="relative flex items-center">
                              <Field
                                  type={showPassword ? "text" : "password"}
                                  id="password"
                                  name="password"
                                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                  aria-required="true"
                              />
                              <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 bg-indigo-500 hover:bg-indigo-600 py-3 h-10 focus:outline-none flex items-center justify-center"
                                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                              >
                                {showPassword ? "Masquer" : "Afficher"}
                              </button>
                            </div>
                            <ErrorMessage name="password" component="div" className="text-red-600 text-sm mt-2" />
                          </div>
                          <div className="mb-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full p-3 bg-indigo-500 text-white rounded hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75"
                                aria-label="Se connecter"
                            >
                              {isSubmitting ? <Spinner /> : "Connexion"}
                            </button>
                          </div>
                          <button
                              type="button"
                              onClick={() => (window.location.href = "/Register")}
                              className="w-full p-3 bg-indigo-500 text-white rounded hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75"
                              aria-label="S'inscrire"
                          >
                            Register
                          </button>
                        </Form>
                    )}
                  </Formik>
                  <div className="mt-4 text-center w-full">
                    <button
                        onClick={handleGoogleLogin}
                        className="inline-flex mb-4 items-center justify-center w-full p-3 bg-white text-black rounded hover:bg-indigo-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75"
                        aria-label="Connexion avec Google"
                    >
                      <img src={googleLogo} alt="Logo Google" className="w-5 h-5 mr-2" />
                      Connexion à Google
                    </button>
                  </div>
                </div>
            )}
          </div>
        </Content>
      </Layout>
  );
}

export default LoginForm;