import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { styles } from "./styles";
import { REACT_APP_URL_STK, REACT_APP_URL_SERVER } from "@env";

function LoginForm() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [serverUrl, setServerUrl] = useState(REACT_APP_URL_SERVER);

  useEffect(() => {
    const fetchServerUrl = async () => {
      const url = await AsyncStorage.getItem("serverUrl");
      setServerUrl(url || REACT_APP_URL_SERVER);
    };
    fetchServerUrl();
  }, []);

  useEffect(() => {
    const checkUserSession = async () => {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        try {
          const response = await axios.get(
            `${serverUrl}/userRoutes/user-informations/user-logged`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setUser(response.data);
          console.log("Login Success");
          navigation.navigate("CreateBlueprint");
        } catch (error) {
          console.error("Error fetching user info:", error.message || error);
          await AsyncStorage.removeItem("token");
        }
      }
      setIsLoading(false);
    };

    checkUserSession();

    // Vérifie l'URL initiale si l'app est déjà ouverte
    Linking.getInitialURL().then((url) => {
      if (url) handleRedirect({ url });
    });

    // Gère le token de Google après redirection
    const handleRedirect = async (event) => {
      const url = event.url;
      const token = Linking.parse(url).queryParams?.token;

      if (token) {
        await AsyncStorage.setItem("token", token);
        console.log("Token Google sauvegardé avec succès:", token);
        navigation.navigate("CreateBlueprint");
      }
    };

    // Ajoute un écouteur pour capter le token
    const linkingListener = Linking.addEventListener("url", handleRedirect);

    return () => {
      linkingListener.remove();
    };
  }, [serverUrl, navigation]);

  const onFinish = async () => {
    try {
      const response = await axios.post(
        `${serverUrl}/userRoutes/user-connection/login`,
        { email, password }
      );

      if (response.data.success) {
        await AsyncStorage.setItem("token", response.data.token);
        const userResponse = await axios.get(
          `${serverUrl}/userRoutes/user-informations/user-logged`,
          { headers: { Authorization: `Bearer ${response.data.token}` } }
        );
        setUser(userResponse.data);
        navigation.navigate("CreateBlueprint");
      } else {
        Alert.alert("Error", "Invalid credentials.");
      }
    } catch (error) {
      console.error("API request error:", error.message || error);
      Alert.alert("Error", "An error occurred. Please try again later.");
    }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = `${REACT_APP_URL_STK}/login`; // Redirige vers /login pour capturer le token
    const googleAuthUrl = `${serverUrl}/userRoutes/user-connection/google-login?redirectUrl=${redirectUrl}`;
    Linking.openURL(googleAuthUrl);
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {user ? (
        <Text>Redirecting to CreateBlueprint...</Text>
      ) : (
        <View style={styles.card}>
          <Text style={styles.title}>Connexion</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Button title="Connexion" onPress={onFinish} />
          <Button
            title="S'inscrire"
            onPress={() => navigation.navigate("Register")}
          />
          <Button title="Connexion avec Google" onPress={handleGoogleLogin} />
          <Button
            title="Network"
            onPress={() => navigation.navigate("Network")}
          />
        </View>
      )}
    </View>
  );
}

export default LoginForm;

