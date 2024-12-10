import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { styles } from "./styles";
import { REACT_APP_URL_STK, REACT_APP_URL_SERVER } from "@env";

function Register() {
  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [serverUrl, setServerUrl] = useState(REACT_APP_URL_SERVER);

  useEffect(() => {
    const fetchServerUrl = async () => {
      const url = await AsyncStorage.getItem("serverUrl");
      setServerUrl(url || REACT_APP_URL_SERVER);
    };
    fetchServerUrl();
  }, []);

  const onFinish = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Les mots de passe ne correspondent pas");
      return;
    }
    try {
      const response = await axios.post(
        `${serverUrl}/userRoutes/user-connection/register`,
        {
          name,
          surname,
          email,
          password,
        }
      );
      Alert.alert("Success", "Inscription réussie.");
      navigation.navigate("Login");
    } catch (error) {
      console.error("Error during registration:", error.message || error);
      Alert.alert(
        "Error",
        "An error occurred: " +
          (error.response?.data?.message || "Please try again.")
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Inscription</Text>
        <TextInput
          style={styles.input}
          placeholder="Nom"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Prénom"
          value={surname}
          onChangeText={setSurname}
        />
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
        <TextInput
          style={styles.input}
          placeholder="Confirmez le mot de passe"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <Button title="S'inscrire" onPress={onFinish} />
        <Button
          title="Retour au login"
          onPress={() => navigation.navigate("Login")}
        />
      </View>
    </View>
  );
}

export default Register;
