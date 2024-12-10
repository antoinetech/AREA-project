// Network.js
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { REACT_APP_URL_SERVER } from "@env";

const Network = () => {
  const [serverUrl, setServerUrl] = useState("");
  const [savedServerUrl, setSavedServerUrl] = useState("");

  useEffect(() => {
    const loadServerUrl = async () => {
      const url = await AsyncStorage.getItem("serverUrl");
      if (url) {
        setSavedServerUrl(url);
        setServerUrl(url);
      }
    };
    loadServerUrl();
  }, []);

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem("serverUrl", serverUrl);
      setSavedServerUrl(serverUrl);
      Alert.alert("Success", "Server URL saved successfully.");
    } catch (error) {
      Alert.alert("Error", "Failed to save server URL.");
    }
  };

  const handleResetToDefault = async () => {
    try {
      await AsyncStorage.setItem("serverUrl", REACT_APP_URL_SERVER);
      setServerUrl(REACT_APP_URL_SERVER);
      setSavedServerUrl(REACT_APP_URL_SERVER);
      Alert.alert("Success", "Server URL reset to default.");
    } catch (error) {
      Alert.alert("Error", "Failed to reset server URL.");
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>
        Configure Server URL
      </Text>
      <TextInput
        style={{
          height: 40,
          borderColor: "gray",
          borderWidth: 1,
          paddingHorizontal: 10,
          marginBottom: 10,
        }}
        placeholder="Enter server URL"
        value={serverUrl}
        onChangeText={setServerUrl}
      />
      <Button title="Save" onPress={handleSave} />
      <View style={{ marginTop: 10 }}>
        <Button title="Reset to Default URL" onPress={handleResetToDefault} />
      </View>
      {savedServerUrl ? (
        <Text style={{ marginTop: 10 }}>
          Current Server URL: {savedServerUrl}
        </Text>
      ) : (
        <Text style={{ marginTop: 10 }}>No Server URL configured</Text>
      )}
      <Text style={{ marginTop: 10 }}>
        Default Server URL: {REACT_APP_URL_SERVER}
      </Text>
    </View>
  );
};

export default Network;
