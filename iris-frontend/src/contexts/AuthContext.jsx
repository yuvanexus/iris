import React, { createContext, useContext, useState, useEffect } from "react";
import { api, fetchJson } from "../lib/api";
import { useNavigate } from "@tanstack/react-router";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                try {
                    const userData = await fetchJson(api.me(), {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    setUser(userData);
                } catch (error) {
                    console.error("Failed to fetch user:", error);
                    localStorage.removeItem("token");
                    setToken(null);
                    setUser(null);
                }
            }
            setLoading(false);
        };

        initAuth();
    }, [token]);

    const login = async (email, password) => {
        try {
            const response = await fetch(api.login(), {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ username: email, password }),
            });
            if (!response.ok) {
                throw new Error("Invalid credentials");
            }
            const data = await response.json();
            localStorage.setItem("token", data.access_token);
            setToken(data.access_token);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
