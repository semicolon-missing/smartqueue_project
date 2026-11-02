import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, CUSTOMER, RequireRole, STAFF } from "./auth";
import Header from "./components/Header";
import Admin from "./pages/Admin";
import Kitchen from "./pages/Kitchen";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Menu from "./pages/Menu";
import Order from "./pages/Order";
import Orders from "./pages/Orders";
import "./styles.css";

const only = (roles, page) => <RequireRole roles={roles}>{page}</RequireRole>;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/orders" element={only(CUSTOMER, <Orders />)} />
            <Route path="/orders/:orderId" element={only(CUSTOMER, <Order />)} />
            <Route path="/kitchen" element={only(STAFF, <Kitchen />)} />
            <Route path="/admin" element={only(["ADMIN"], <Admin />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
