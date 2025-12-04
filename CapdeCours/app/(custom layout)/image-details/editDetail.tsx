import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Trash2 } from "lucide-react-native";
import BottomNav from "@/components/BottomNav"; // đảm bảo bạn có component này cho mobile

export default function EditDetail() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        <Image
          source={{
            uri: "https://api.builder.io/api/v1/image/assets/TEMP/72d0b446474ff2aba61216878352dab963545c13?width=750",
          }}
          style={styles.coverImage}
        />

        {/* Back Button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Image
            source={{
              uri: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Arrow_left_font_awesome.svg",
            }}
            style={{ width: 16, height: 24, tintColor: "white" }}
          />
        </TouchableOpacity>

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButton}>
          <Trash2 size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Details Card */}
      <ScrollView
        style={styles.detailsCard}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Details Tag */}
        <View style={styles.detailsTag}>
          <View style={styles.detailsTagInner}>
            <Text style={styles.detailsTagText}>Details</Text>
          </View>
        </View>

        <View style={styles.detailsContent}>
          {/* Name Field */}
          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TouchableOpacity style={styles.editButton}>
                <Image
                  source={{
                    uri: "https://upload.wikimedia.org/wikipedia/commons/6/6b/Pencil_icon.svg",
                  }}
                  style={styles.icon}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldValue}>
              ComputerNetwork-Session1...
            </Text>
          </View>

          {/* Folder Field */}
          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Folder</Text>
              <TouchableOpacity style={styles.editButton}>
                <Image
                  source={{
                    uri: "https://upload.wikimedia.org/wikipedia/commons/6/6b/Pencil_icon.svg",
                  }}
                  style={styles.icon}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldValue}>ComputerScience/Session1</Text>
          </View>

          {/* Time Field */}
          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Time</Text>
              <TouchableOpacity style={styles.editButton}>
                <Image
                  source={{
                    uri: "https://upload.wikimedia.org/wikipedia/commons/6/6b/Pencil_icon.svg",
                  }}
                  style={styles.icon}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldValue}>7:00AM Mon, Jan 1st 2025</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Note Field */}
          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Note</Text>
              <TouchableOpacity style={styles.editButton}>
                <Image
                  source={{
                    uri: "https://upload.wikimedia.org/wikipedia/commons/6/6b/Pencil_icon.svg",
                  }}
                  style={styles.icon}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.noteText}>
              Melbourne based Illustrator & Designer Ken Taylor works primarily
              within the music industry and is predominantly well known for his
              striking rock posters. Ken started in Perth Western Australia
              doing posters and album artwork for local bands.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Indicator */}
      <View style={styles.bottomIndicator} />

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F4F9",
  },
  coverContainer: {
    height: 250,
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  backButton: {
    position: "absolute",
    top: 24,
    left: 16,
    padding: 8,
  },
  deleteButton: {
    position: "absolute",
    top: 20,
    right: 20,
  },
  detailsCard: {
    marginTop: -20,
    backgroundColor: "#FFF9F0",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 500,
  },
  detailsTag: {
    position: "absolute",
    alignSelf: "center",
    top: -18,
  },
  detailsTagInner: {
    backgroundColor: "#6B4226",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
    elevation: 5,
  },
  detailsTagText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  detailsContent: {
    paddingTop: 40,
    paddingHorizontal: 28,
  },
  field: {
    marginBottom: 24,
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#6B4226",
  },
  editButton: {
    padding: 4,
  },
  icon: {
    width: 18,
    height: 18,
    tintColor: "#BABEC1",
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: "#DDD",
    marginBottom: 16,
    paddingTop: 8,
  },
  noteText: {
    fontSize: 13,
    color: "#111",
    lineHeight: 20,
  },
  bottomIndicator: {
    position: "absolute",
    bottom: 80,
    alignSelf: "center",
    width: 140,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EBEBEB",
  },
});
