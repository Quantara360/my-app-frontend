import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function RootIndex() {
  const { user } = useAuth();

  return (
    <Redirect
      href={user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/login"}
    />
  );
}
