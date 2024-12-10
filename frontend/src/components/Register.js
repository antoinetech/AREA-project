import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import axios from "axios";
import epitechLogo from '../assets/epitech.png';
import { Formik, Field, ErrorMessage, Form } from "formik";
import * as Yup from "yup";

function Register() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const toggleShowPassword = () => setShowPassword(!showPassword);
  const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  const validationSchema = Yup.object({
    name: Yup.string().required('Required'),
    surname: Yup.string().required('Required'),
    email: Yup.string().email('Invalid email address').required('Required'),
    password: Yup.string().min(6, 'Password should be 6 characters minimum').required('Required'),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Passwords must match')
      .required('Required')
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    if (values.password !== values.confirmPassword) {
      message.error("Les mots de passe ne correspondent pas.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await axios.post(`${process.env.REACT_APP_URL_SERVER}/userRoutes/user-connection/register`, values);
      message.success("Inscription réussie. Redirection vers la page de connexion.");
      navigate("/login");
    } catch (error) {
      console.error("Erreur lors de l'ajout du client:", error);
      setErrorMessage(error.response?.data?.message || "Une erreur est survenue");
      message.error("Erreur lors de l'ajout du client: " + error.response?.data?.message || "Une erreur est survenue");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen w-full overflow-auto bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <img src={epitechLogo} alt="Epitech Logo" className="mt-12 w-48 h-15 mb-4" />
        <div className="w-full max-w-sm bg-indigo-400 p-6 rounded shadow-md">
          <h1 className="text-xl font-bold text-center mb-4 text-black">Register</h1>
          {errorMessage && (
            <div className="text-red-500 text-center mb-4">{errorMessage}</div>
          )}
          <Formik
            initialValues={{ name: "", surname: "", email: "", password: "", confirmPassword: "" }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-3 bg-indigo-400 border-indigo-400 mb-4">
                <div className="w-full">
                  <label htmlFor="name" className="block text-black mb-2">Nom</label>
                  <Field type="text" id="name" name="name" className="w-full p-2 border rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <ErrorMessage name="name" component="div" className="text-red-600 text-sm mt-2" />
                </div>

                <div className="w-full">
                  <label htmlFor="surname" className="block text-black mb-2">Prénom</label>
                  <Field type="text" id="surname" name="surname" className="w-full p-2 border rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <ErrorMessage name="surname" component="div" className="text-red-600 text-sm mt-2" />
                </div>

                <div className="w-full">
                  <label htmlFor="email" className="block text-black mb-2">Email</label>
                  <Field type="email" id="email" name="email" className="w-full p-2 border rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <ErrorMessage name="email" component="div" className="text-red-600 text-sm mt-2" />
                </div>

                <div className="w-full relative">
                  <label htmlFor="password" className="block text-black mb-2">Mot de passe</label>
                  <Field type={showPassword ? "text" : "password"} id="password" name="password" className="w-full p-2 border rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <button type="button" onClick={toggleShowPassword} className="absolute top-9 right-2 text-indigo-600">Afficher</button>
                  <ErrorMessage name="password" component="div" className="text-red-600 text-sm mt-2" />
                </div>

                <div className="w-full relative">
                  <label htmlFor="confirmPassword" className="block text-black mb-2">Confirmez le mot de passe</label>
                  <Field type={showConfirmPassword ? "text" : "password"} id="confirmPassword" name="confirmPassword" className="w-full p-2 border rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <button type="button" onClick={toggleShowConfirmPassword} className="absolute top-9 right-2 text-indigo-600">Afficher</button>
                  <ErrorMessage name="confirmPassword" component="div" className="text-red-600 text-sm mt-2" />
                </div>

                <div className="w-full">
                  <button type="submit" disabled={isSubmitting} className="w-full p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75">
                    {isSubmitting ? "Chargement..." : "S'inscrire"}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
          <button onClick={() => navigate("/login")} className="w-full p-2 bg-indigo-600 mt-2 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75">Retour au login</button>
        </div>
      </div>
    </div>
  );
}

export default Register;
