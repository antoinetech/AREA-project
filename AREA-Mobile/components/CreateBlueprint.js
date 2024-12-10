import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  FlatList,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { REACT_APP_URL_SERVER } from "@env";

const CreateBlueprint = ({ navigation }) => {
  const [areas, setAreas] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);
  const [token, setToken] = useState(null);
  const [serverUrl, setServerUrl] = useState("");

  useEffect(() => {
    const fetchServerUrl = async () => {
      const url = await AsyncStorage.getItem("serverUrl");
      setServerUrl(url || REACT_APP_URL_SERVER);
    };
    fetchServerUrl();
  }, []);

  useEffect(() => {
    const getTokenAndFetchAreas = async () => {
      const storedToken = await AsyncStorage.getItem("token");
      setToken(storedToken);

      // Wait for serverUrl to be set before fetching areas
      if (serverUrl && storedToken) {
        fetchAreas(storedToken);
      }
    };
    getTokenAndFetchAreas();
  }, [serverUrl]); // Add serverUrl as a dependency

  const fetchAreas = async (token) => {
    if (!token || !serverUrl) return;

    try {
      const response = await axios.get(`${serverUrl}/areaRoutes/get-areas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAreas(response.data || []);
    } catch (error) {
      console.error("Error fetching areas:", error.message || error);
      Alert.alert("Error", "Unable to fetch areas.");
    }
  };

  const handleDelete = async (areaName) => {
    try {
      await axios.delete(`${serverUrl}/areaRoutes/deleteArea/${areaName}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert("Success", "Area deleted successfully!");
      fetchAreas(token);
    } catch (error) {
      console.error("Error deleting area:", error.message || error);
      Alert.alert("Error", "Unable to delete area.");
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.actionsContainer}>
        <Text style={styles.itemTitle}>{item.areaName}</Text>
        <Button title="Delete" onPress={() => handleDelete(item.areaName)} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          marginBottom: 20,
        }}
      >
        <Button
          title="Profile"
          onPress={() => navigation.navigate("Profile")}
        />
        <Text style={styles.title}>Manage Existing Areas</Text>
      </View>
      <FlatList
        data={areas}
        renderItem={renderItem}
        keyExtractor={(item) => item.areaName}
      />
      <Modal
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <Text>Editing area: {selectedArea?.areaName}</Text>
          <Button title="Close" onPress={() => setIsModalVisible(false)} />
        </View>
      </Modal>
      <Button
        title="Add Area"
        onPress={() => navigation.navigate("CreateArea")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  itemContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
  },
  itemTitle: { fontSize: 18, fontWeight: "bold" },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});

export default CreateBlueprint;
