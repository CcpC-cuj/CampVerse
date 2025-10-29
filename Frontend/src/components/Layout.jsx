import React from "react";
import Sidebar from "../userdashboard/sidebar";
import NavBar from "../userdashboard/NavBar";

export default function VerifierLayout({ children, user, roles }) {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar user={user} roles={roles} activeRole="verifier" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <NavBar user={user} />
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
