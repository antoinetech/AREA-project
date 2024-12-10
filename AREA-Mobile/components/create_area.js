import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  ScrollView,
  StyleSheet,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { REACT_APP_URL_SERVER } from "@env";

const CreateArea = ({ navigation }) => {
  const [allServices, setAllServices] = useState([]);
  const [connectedServices, setConnectedServices] = useState([]);
  const [selectedActionService, setSelectedActionService] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedReactions, setSelectedReactions] = useState([]);
  const [actionParams, setActionParams] = useState({});
  const [reactionParams, setReactionParams] = useState({});
  const [availableActionParams, setAvailableActionParams] = useState([]);
  const [availableReactionParams, setAvailableReactionParams] = useState({});
  const [areaName, setAreaName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [token, setToken] = useState(null);

  useEffect(() => {
    const initializeData = async () => {
      const url =
        (await AsyncStorage.getItem("serverUrl")) || REACT_APP_URL_SERVER;
      const storedToken = await AsyncStorage.getItem("token");
      setServerUrl(url);
      setToken(storedToken);
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (serverUrl) fetchAllServices();
  }, [serverUrl]);

  useEffect(() => {
    if (allServices.length > 0) fetchConnectedServices();
  }, [allServices, token]);

  const fetchAllServices = useCallback(async () => {
    try {
      const response = await axios.get(
        `${serverUrl}/serviceRoutes/services-informations/services-list`
      );
      setAllServices(response.data || []);
    } catch {
      Alert.alert("Error", "Unable to fetch services.");
    }
  }, [serverUrl]);

  const fetchConnectedServices = useCallback(async () => {
    try {
      const response = await axios.get(
        `${serverUrl}/userRoutes/user-informations/user-subscriptions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const connectedSubscriptions = response.data || [];
      const filteredServices = allServices.filter((service) =>
        connectedSubscriptions.some(
          (sub) => sub.serviceId.name === service.name
        )
      );
      setConnectedServices(filteredServices);
    } catch {
      Alert.alert("Error", "Unable to fetch connected services.");
    }
  }, [allServices, serverUrl, token]);

  const handleActionServiceChange = (value) => {
    setSelectedActionService(value);
    setSelectedAction(null);
    setActionParams({});
  };

  const handleActionChange = (value) => {
    const selectedService = connectedServices.find(
      (service) => service.name === selectedActionService
    );
    const selectedAction = selectedService?.actions.find(
      (action) => action.name === value
    );
    setSelectedAction(value);
    setAvailableActionParams(selectedAction?.params || []);
    setActionParams({});
  };

  const handleReactionServiceChange = (index, value) => {
    const updatedReactions = [...selectedReactions];
    updatedReactions[index] = {
      ...updatedReactions[index],
      service: value,
      reaction: null,
    };
    setSelectedReactions(updatedReactions);
    setReactionParams((prev) => ({ ...prev, [index]: {} }));
  };

  const handleReactionChange = (index, value) => {
    const selectedService = connectedServices.find(
      (service) => service.name === selectedReactions[index].service
    );
    const selectedReaction = selectedService?.reactions.find(
      (reaction) => reaction.name === value
    );
    const updatedReactions = [...selectedReactions];
    updatedReactions[index] = { ...updatedReactions[index], reaction: value };
    setSelectedReactions(updatedReactions);
    setAvailableReactionParams((prev) => ({
      ...prev,
      [index]: selectedReaction?.params || [],
    }));
    setReactionParams((prev) => ({ ...prev, [index]: {} }));
  };

  const handleSubmit = async () => {
    try {
      const response = await axios.post(
        `${serverUrl}/areaRoutes/createArea`,
        {
          name: areaName,
          ActionService: selectedActionService,
          Action: { name: selectedAction, params: actionParams },
          Reactions: selectedReactions.map((reaction, index) => ({
            ReactionService: reaction.service,
            Reaction: reaction.reaction,
            params: reactionParams[index],
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        Alert.alert("Success", "AREA created successfully!");
        navigation.navigate("CreateBlueprint");
      } else {
        Alert.alert("Error", "Failed to create AREA.");
      }
    } catch {
      Alert.alert("Error", "Error creating AREA.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create a New AREA</Text>

      <TextInput
        style={styles.input}
        placeholder="AREA Name"
        value={areaName}
        onChangeText={setAreaName}
      />

      <Text style={styles.label}>Choose Action Service</Text>
      <Picker
        selectedValue={selectedActionService}
        onValueChange={handleActionServiceChange}
        style={styles.picker}
      >
        <Picker.Item label="Select a service" value={null} />
        {connectedServices.map((service) => (
          <Picker.Item
            key={service.name}
            label={service.name}
            value={service.name}
          />
        ))}
      </Picker>

      {selectedActionService && (
        <>
          <Text style={styles.label}>Choose Action</Text>
          <Picker
            selectedValue={selectedAction}
            onValueChange={handleActionChange}
            style={styles.picker}
          >
            <Picker.Item label="Select an action" value={null} />
            {connectedServices
              .find((service) => service.name === selectedActionService)
              ?.actions?.map((action) => (
                <Picker.Item
                  key={action.name}
                  label={action.name}
                  value={action.name}
                />
              ))}
          </Picker>
        </>
      )}

      {availableActionParams.length > 0 &&
        availableActionParams.map((param) => (
          <TextInput
            key={param}
            style={styles.input}
            placeholder={`Enter ${param}`}
            onChangeText={(value) =>
              setActionParams((prev) => ({ ...prev, [param]: value }))
            }
          />
        ))}

      {selectedReactions.map((reaction, index) => (
        <View key={index} style={styles.reactionContainer}>
          <Text style={styles.sectionTitle}>Reaction {index + 1}</Text>
          <Text style={styles.label}>Choose Reaction Service</Text>
          <Picker
            selectedValue={reaction.service}
            onValueChange={(value) => handleReactionServiceChange(index, value)}
            style={styles.picker}
          >
            <Picker.Item label="Select a service" value={null} />
            {connectedServices.map((service) => (
              <Picker.Item
                key={service.name}
                label={service.name}
                value={service.name}
              />
            ))}
          </Picker>

          {reaction.service && (
            <>
              <Text style={styles.label}>Choose Reaction</Text>
              <Picker
                selectedValue={reaction.reaction}
                onValueChange={(value) => handleReactionChange(index, value)}
                style={styles.picker}
              >
                <Picker.Item label="Select a reaction" value={null} />
                {connectedServices
                  .find((service) => service.name === reaction.service)
                  ?.reactions?.map((reactionItem) => (
                    <Picker.Item
                      key={reactionItem.name}
                      label={reactionItem.name}
                      value={reactionItem.name}
                    />
                  ))}
              </Picker>
            </>
          )}

          {availableReactionParams[index]?.map((param) => (
            <TextInput
              key={param}
              style={styles.input}
              placeholder={`Enter ${param}`}
              onChangeText={(value) =>
                setReactionParams((prev) => ({
                  ...prev,
                  [index]: { ...prev[index], [param]: value },
                }))
              }
            />
          ))}
        </View>
      ))}

      <View style={styles.buttonContainer}>
        <Button
          title="Add Another Reaction"
          onPress={() =>
            setSelectedReactions([
              ...selectedReactions,
              { service: null, reaction: null },
            ])
          }
        />
        <View style={styles.buttonSpacing} />
        <Button
          title="Create AREA"
          onPress={handleSubmit}
          disabled={
            !areaName ||
            !selectedActionService ||
            !selectedAction ||
            selectedReactions.length === 0
          }
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginTop: 20 },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  picker: { height: 50, width: "100%", marginBottom: 20 },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  buttonSpacing: { width: 10 },
});

export default CreateArea;
