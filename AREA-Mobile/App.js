import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Linking } from "react-native"; // Utilisation de Linking de react-native
import LoginForm from "./components/LoginForm";
import Register from "./components/Register";
import ProfilePage from "./components/ProfilePage";
import CreateBlueprint from "./components/CreateBlueprint";
import CreateArea from "./components/create_area";
import PrivateRoute from "./components/PrivateRoute";
import Network from "./components/Network";

const Stack = createNativeStackNavigator();

// Configuration de linking pour la redirection
const linking = {
  prefixes: ["http://localhost:8085"],
  config: {
    screens: {
      Login: "login",
      Register: "register",
      Profile: "profile",
      CreateBlueprint: "homepage",
      CreateArea: "create-area",
      MicrosoftCallback: "microsoft-callback",
      GitHubCallback: "github-callback",
    },
  },
};

function App() {
  useEffect(() => {
    // Fonction pour gérer les liens profonds
    const handleDeepLink = ({ url }) => {
      const { path } = Linking.parse(url); // Le parseur Linking de React Native gère les liens
      if (path === "profile") {
        navigation.navigate("Profile");
      } else if (path === "homepage") {
        navigation.navigate("CreateBlueprint");
      } else if (path === "create-area") {
        navigation.navigate("CreateArea");
      }
    };

    // Ajouter l'écouteur pour les liens
    Linking.addEventListener("url", handleDeepLink);

    return () => {
      // Nettoyer l'écouteur lorsque le composant est démonté
      Linking.removeEventListener("url", handleDeepLink);
    };
  }, []);

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          options={{ headerShown: false }}
          component={LoginForm}
        />
        <Stack.Screen name="Register" component={Register} />

        {/* Route protégée pour le profil */}
        <Stack.Screen name="Profile" options={{ headerShown: false }}>
          {() => (
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          )}
        </Stack.Screen>

        {/* Enregistrement direct de CreateBlueprint comme écran */}
        <Stack.Screen
          name="CreateBlueprint"
          component={CreateBlueprint}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Network" component={Network} />

        {/* Autres écrans */}
        <Stack.Screen name="CreateArea" component={CreateArea} />
        <Stack.Screen name="MicrosoftCallback" component={ProfilePage} />
        <Stack.Screen name="GitHubCallback" component={ProfilePage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
