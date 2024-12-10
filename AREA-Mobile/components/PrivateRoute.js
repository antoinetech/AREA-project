import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

const PrivateRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (token) {
          setIsAuthenticated(true);
        } else {
          navigation.navigate("Login");
        }
      } catch (error) {
        console.error("Error checking auth token", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigation]);

  if (loading) {
    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
    );
  }

  return isAuthenticated ? children : null;
};

export default PrivateRoute;
