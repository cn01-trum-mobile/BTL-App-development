import React from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import {
  ChevronLeft,
  ChevronDown,
  Download,
  Plus,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import BottomNav from "@/components/BottomNav"; // nếu bạn có BottomNav mobile

export default function FolderDetail() {
  const navigation = useNavigation();

  const sessions = [
    { name: "Session 3 - 01/03/2025" },
    { name: "Session 2 - 01/02/2025" },
    { name: "Session 1 - 01/01/2025" },
    { name: "MANUAL Session - 10/01/2025" },
  ];

  const images = [
    "https://api.builder.io/api/v1/image/assets/TEMP/132815e7ef6fa1900f2c7340c468cc1cbc527a97?width=210",
    "https://api.builder.io/api/v1/image/assets/TEMP/c1b66f9aa6db706b15fe08670befb0a1007ca753?width=210",
    "https://api.builder.io/api/v1/image/assets/TEMP/3ad58b19ad17852e1f476625f00b0766f0d346ae?width=210",
    "https://api.builder.io/api/v1/image/assets/TEMP/d223b52acfc20eee92b7fd60b80537b8c62a9f37?width=210",
    "https://api.builder.io/api/v1/image/assets/TEMP/e6e71e20a5075073b7582d087e25835455d9ea14?width=210",
    "https://api.builder.io/api/v1/image/assets/TEMP/abd9af2e4c8a9aace65446c8719e38e7407959f5?width=210",
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="#4B3B36" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Session</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar} />
        </View>

        {/* Active Session */}
        <View style={styles.activeSessionWrapper}>
          <View style={styles.activeSession}>
            <Download size={22} color="white" />
            <Text style={styles.activeSessionText}>
              Session 4 - 01/04/2025
            </Text>
            <ChevronDown size={22} color="white" />
          </View>
        </View>

        {/* Image Gallery */}
        <View style={styles.galleryContainer}>
          {images.map((src, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri: src }} style={styles.image} />
            </View>
          ))}
        </View>

        {/* Other Sessions */}
        <View style={styles.sessionsContainer}>
          {sessions.map((s, i) => (
            <TouchableOpacity key={i} style={styles.sessionItem}>
              <Text style={styles.sessionText}>{s.name}</Text>
              <ChevronLeft
                size={22}
                color="rgba(107,66,38,0.75)"
                style={{ transform: [{ rotate: "180deg" }] }}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton}>
        <Plus size={24} color="#FF6B81" strokeWidth={3} />
      </TouchableOpacity>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9F0", // cream-light
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFF9F0",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#4B3B36",
    marginLeft: -24,
  },
  progressContainer: {
    paddingHorizontal: 64,
    paddingBottom: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(107,66,38,0.5)", // brown-medium/50
    borderRadius: 4,
  },
  activeSessionWrapper: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  activeSession: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(75,59,54,0.75)",
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  activeSessionText: {
    flex: 1,
    textAlign: "center",
    color: "white",
    fontWeight: "700",
    textTransform: "uppercase",
    fontSize: 13,
  },
  galleryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  imageWrapper: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 10,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  sessionsContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF1E0", // cream
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 18,
    justifyContent: "space-between",
  },
  sessionText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#4B3B36",
  },
  addButton: {
    position: "absolute",
    bottom: 100,
    right: 24,
    width: 60,
    height: 60,
    backgroundColor: "#FFE6D8", // cream-peach
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
});
