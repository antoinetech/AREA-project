import React, { useState } from "react";
import {
  Modal,
  ActivityIndicator,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import { WebView } from "react-native-webview";

const AuthWebView = ({ isVisible, authUrl, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [webViewKey, setWebViewKey] = useState(0);

  const handleNavigationStateChange = (navState) => {
    try {
      const url = new URL(navState.url);
      const success = url.searchParams.get("success");

      if (success === "true" || navState.url.includes("/ProfilePage")) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Error parsing URL:", error);
    }
  };

  const handleError = () => {
    setWebViewKey((prevKey) => prevKey + 1);
    setLoading(false);
  };

  if (!authUrl) {
    return null;
  }

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
          {loading && <ActivityIndicator style={styles.headerLoader} />}
        </View>

        <WebView
          key={webViewKey}
          source={{ uri: authUrl }}
          onNavigationStateChange={handleNavigationStateChange}
          onError={handleError}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
          cacheEnabled={false}
          incognito={true}
          style={styles.webview}
        />

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    height: 50,
    backgroundColor: "#f5f5f5",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 16,
    color: "#007AFF",
  },
  headerLoader: {
    marginLeft: 10,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  webview: {
    flex: 1,
  },
});

export default AuthWebView;
