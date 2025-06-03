import React from "react";
import { Text, View } from "react-native";

export default function App() {
  console.log("App carregado!");
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "red",
      }}
    >
      <Text style={{ fontSize: 24, color: "white" }}>TESTE FUNCIONANDO</Text>
    </View>
  );
}
