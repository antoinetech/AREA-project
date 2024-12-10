import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { REACT_APP_URL_STK, REACT_APP_URL_SERVER } from "@env";
import { useNavigation } from "@react-navigation/native";
import Discord_Logo from "../assets/Discord_Logo.png";
import mirologo from "../assets/miro.png";
import redditlogo from "../assets/twitter.webp";
import twitchlogo from "../assets/twitch.webp";

const AVAILABLE_SERVICES = [
  { name: "Microsoft", image: require("../assets/microsoft.webp") },
  { name: "Github", image: require("../assets/github.png") },
  { name: "Spotify", image: require("../assets/spotify.webp") },
  { name: "Discord", image: Discord_Logo },
  { name: "Miro", image: mirologo },
  { name: "Twitter", image: redditlogo },
  { name: "Twitch", image: twitchlogo },
];

const getServiceNameForDatabase = (serviceName) => {
  const serviceMap = {
    Microsoft: ["Outlook", "Microsoft-Calendar"],
    Github: "Github",
    Spotify: "Spotify",
    Discord: "Discord",
    Miro: "Miro",
    Reddit: "Twitter",
    Twich: "Twitch",
  };
  return serviceMap[serviceName] || serviceName;
};

const ProfilePage = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [apiSettings, setApiSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [serverUrl, setServerUrl] = useState(null);

  useEffect(() => {
    const fetchServerUrl = async () => {
      const url = await AsyncStorage.getItem("serverUrl");
      setServerUrl(url || REACT_APP_URL_SERVER);
    };
    fetchServerUrl();
  }, []);

  useEffect(() => {
    const fetchTokenAndData = async () => {
      const storedToken = await AsyncStorage.getItem("token");
      setToken(storedToken);
      console.log("storedToken", storedToken, serverUrl);
      if (storedToken && serverUrl) {
        console.log("try", storedToken, serverUrl);
        await fetchUserInfo(storedToken);
        await fetchUserSubscriptions(storedToken);

        console.log("set");
      }
      setIsLoading(false);
    };

    if (serverUrl) {
      fetchTokenAndData();
    }
  }, [serverUrl]);

  const fetchUserInfo = async (token) => {
    try {
      const response = await axios.get(
        `${serverUrl}/userRoutes/user-informations/user-logged`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setUser(response.data);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch user information.");
      navigation.navigate("Login");
    }
  };

  const fetchUserSubscriptions = async (token) => {
    try {
      const response = await axios.get(
        `${serverUrl}/userRoutes/user-informations/user-subscriptions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const subscriptions = response.data || [];

      const updatedSettings = AVAILABLE_SERVICES.reduce((acc, service) => {
        const serviceName = getServiceNameForDatabase(service.name);
        acc[service.name] = subscriptions.some(
          (sub) => sub.serviceId.name === serviceName
        );
        return acc;
      }, {});

      setApiSettings(updatedSettings);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch user subscriptions.");
    }
  };

  const handleLogout = async () => {
    try {
      await axios.delete(`${serverUrl}/userRoutes/user-connection/logout`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await AsyncStorage.removeItem("token");
      setUser(null);
      Alert.alert("Success", "Successfully logged out.");
      navigation.navigate("Login");
    } catch (error) {
      Alert.alert("Error", "Failed to log out.");
    }
  };

  const confirmDeleteSubscription = async (service) => {
    try {
      const serviceNameForDB = getServiceNameForDatabase(service);
      const response = await axios.delete(
        `${serverUrl}/subscriptionRoutes/subscription-management/delete-subscription/${serviceNameForDB}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        Alert.alert("Success", `Successfully unsubscribed from ${service}`);
        setApiSettings((prev) => ({ ...prev, [service]: false }));
      }
    } catch (error) {
      Alert.alert("Error", `Failed to unsubscribe from ${service}`);
    }
  };

  const authenticateWithService = (service) => {
    const redirectUrl = `${REACT_APP_URL_STK}/profile`;
    const authUrl = `${serverUrl}/serviceRoutes/services-authentication/${service.toLowerCase()}?redirectUrl=${redirectUrl}`;

    const finalUrl = token ? `${authUrl}&token=${token}` : authUrl;

    Linking.openURL(finalUrl)
      .then(() => navigation.navigate("Profile"))
      .catch((err) => console.error("An error occurred", err));
  };

  const handleCreateSubscription = async (service) => {
    if (!token) {
      Alert.alert("Error", "Please log in first.");
      return;
    }

    try {
      const serviceNameForDB = getServiceNameForDatabase(service);
      const response = await axios.post(
        `${serverUrl}/subscriptionRoutes/subscription-management/create-subscription/${serviceNameForDB}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        Alert.alert(
          "Success",
          `Successfully subscribed to ${serviceNameForDB}`
        );
        setApiSettings((prev) => ({ ...prev, [service]: true }));
      }
    } catch (error) {
      console.error(
        "Error during subscription:",
        error.response?.data || error.message
      );
      Alert.alert("Error", `Failed to subscribe to ${service}`);
    }
  };

  if (isLoading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          marginBottom: 20,
        }}
      >
        <Button
          title="Home"
          onPress={() => navigation.navigate("CreateBlueprint")}
        />
        <Button
          title="Network"
          onPress={() => navigation.navigate("Network")}
        />
        <Button title="Logout" onPress={handleLogout} color="red" />
      </View>

      <View style={{ marginBottom: 20 }}>
        {user ? (
          <>
            <Text>Name: {user.name}</Text>
            <Text>Surname: {user.surname}</Text>
            <Text>Email: {user.email}</Text>
          </>
        ) : (
          <Text>Please log in to view your profile.</Text>
        )}
      </View>

      <View>
        <Text style={{ fontSize: 18, marginBottom: 10 }}>
          Service Connections
        </Text>
        {AVAILABLE_SERVICES.map((service) => (
          <View
            key={service.name}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 10,
              marginBottom: 10,
            }}
          >
            <Image
              source={service.image}
              style={{ width: 30, height: 30, marginRight: 10 }}
            />
            <Button
              style={{ marginHorizontal: 1 }}
              title="Connect"
              onPress={() => authenticateWithService(service.name)}
              disabled={apiSettings[service.name]}
            />
            <Button
              style={{ marginHorizontal: 5 }}
              title="+"
              onPress={() => handleCreateSubscription(service.name)}
              disabled={apiSettings[service.name]}
            />
            <Button
              style={{ marginHorizontal: 5 }}
              title="-"
              onPress={() => confirmDeleteSubscription(service.name)}
              disabled={!apiSettings[service.name]}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default ProfilePage;
